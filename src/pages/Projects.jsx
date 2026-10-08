import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { PageHero, PraxisEmptyState, PraxisListSkeleton } from '@/components/layout/PraxisPage';
import ContinuityPriorityPanel from '@/components/projects/ContinuityPriorityPanel';
import FrontsList from '@/components/projects/FrontsList';
import ProjectDetailDialog from '@/components/projects/ProjectDetailDialog';
import { findProjectForGuidancePriority } from '@/lib/projects';
import { fortalezaDateKey } from '@/lib/dates';

export default function Projects() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openProject, setOpenProject] = useState(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => praxisApi.projects.list(),
  });

  const {
    data: guidance = null,
    isLoading: guidanceLoading,
    isError: guidanceError,
  } = useQuery({
    queryKey: ['projects', 'guidance', 'today'],
    queryFn: () => praxisApi.projects.guidanceToday(),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const {
    data: updates = [],
    isLoading: updatesLoading,
  } = useQuery({
    queryKey: ['project-updates', openProject?.id],
    queryFn: () => praxisApi.projects.listUpdates(openProject.id),
    enabled: Boolean(openProject?.id),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => praxisApi.projects.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData(['projects']);
      queryClient.setQueryData(['projects'], (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((item) => (
          item.id === id || item.slug === id ? { ...item, ...data } : item
        ));
      });
      return { previous };
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (openProject && row && (row.id === openProject.id || row.slug === openProject.slug)) {
        setOpenProject(row);
      }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['projects'], context.previous);
      if (err?.status === 409 || err?.body?.error === 'FOCUS_LIMIT') {
        toast('Já tem dois no foco', { description: 'Tira um pin pra caber este.' });
        return;
      }
      toast.error('Não deu pra atualizar', { description: err?.message || 'Tenta de novo.' });
    },
  });

  const addUpdate = useMutation({
    mutationFn: ({ id, summary }) => praxisApi.projects.addUpdate(id, { summary, source: 'manual', created_by: 'joao' }),
    onSuccess: (_row, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-updates', vars.id] });
      toast.success('Avanço registrado');
    },
    onError: (err) => {
      toast.error('Não deu pra registrar', { description: err?.message || 'Tenta de novo.' });
    },
  });

  const completeNextStep = useMutation({
    mutationFn: ({ id, expectedStep }) => praxisApi.projects.completeNextStep(id, { expected_step: expectedStep }),
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-updates', vars.id] });
      if (openProject && result?.project && (String(openProject.id) === String(vars.id) || String(openProject.slug) === String(vars.id))) {
        setOpenProject(result.project);
      }
      toast.success('Feito e registrado', {
        description: 'Esse avanço entra no fechamento do Sêneca e o próximo passo fica pendente de revisão.',
      });
    },
    onError: async (err, vars) => {
      if (err?.status === 409 || err?.body?.error === 'NEXT_STEP_CHANGED' || err?.message === 'NEXT_STEP_CHANGED') {
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
        await queryClient.invalidateQueries({ queryKey: ['project-updates', vars.id] });
        try {
          const fresh = await praxisApi.projects.get(vars.id);
          if (fresh && openProject && (fresh.id === openProject.id || fresh.slug === openProject.slug)) {
            setOpenProject(fresh);
          }
        } catch {
          // ignore
        }
        toast.error('O próximo passo mudou', {
          description: 'O Sêneca ou outra sessão atualizou esta frente. O novo passo foi carregado e não foi sobrescrito.',
        });
        return;
      }
      toast.error('Não deu pra concluir', { description: err?.message || 'Tenta de novo.' });
    },
  });

  const startProjectFocus = useMutation({
    mutationFn: async (project) => {
      const title = String(project?.next_step || '').trim();
      if (!title) throw new Error('Essa frente ainda não tem próximo passo.');

      const source = `project_focus:${project.slug}`;
      const pending = await praxisApi.tasks.list({ status: 'pending', limit: 100 });
      let task = Array.isArray(pending)
        ? pending.find((item) => item.source === source && String(item.title || '').trim() === title)
        : null;

      if (!task) {
        const category = project.slug === 'rca'
          ? 'farmacia'
          : project.kind === 'estudo'
            ? 'estudo'
            : (project.slug === 'gofluxo' || project.slug === 'animalia' ? 'gofluxo' : 'pessoal');

        const descriptionBits = [
          `Frente: ${project.name}`,
          project.current_slice ? `Agora: ${project.current_slice}` : null,
          'Criada por Frentes para uma sessão de foco.',
        ].filter(Boolean);

        task = await praxisApi.tasks.create({
          title,
          description: descriptionBits.join('\n'),
          date: fortalezaDateKey(),
          status: 'pending',
          priority: project.focus ? 'high' : 'medium',
          category,
          source,
          duration_minutes: 25,
        });
      }

      return { task, project };
    },
    onSuccess: ({ task, project }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(`/foco?taskId=${encodeURIComponent(task.id)}&project=${encodeURIComponent(project.slug)}`);
    },
    onError: (err) => {
      toast.error('Não deu pra abrir o Modo Foco', { description: err?.message || 'Tenta de novo.' });
    },
  });

  const handleOpenFromGuidance = (projectOrPriority) => {
    if (!projectOrPriority) return;
    const fullProject = findProjectForGuidancePriority(projectOrPriority, projects);
    if (fullProject) {
      setOpenProject(fullProject);
    }
  };

  const handleSaveDetail = (project, data) => {
    updateProject.mutate(
      { id: project.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['project-updates', project.id] });
          toast.success('Estado salvo');
        },
      },
    );
  };

  const handleAddUpdate = async (project, summary) => {
    try {
      await addUpdate.mutateAsync({ id: project.id, summary });
      return true;
    } catch {
      return false;
    }
  };

  const handleStartFocus = async (project) => {
    if (!project?.next_step) return false;
    try {
      await startProjectFocus.mutateAsync(project);
      return true;
    } catch {
      return false;
    }
  };

  const handleCompleteNextStep = async (project) => {
    const expectedStep = String(project?.next_step || '').trim();
    if (!expectedStep) return false;
    try {
      await completeNextStep.mutateAsync({ id: project.id, expectedStep });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="praxis-page">
      <PageHero
        kicker="Visão do momento"
        kickerIcon={Layers}
        title="Frentes"
        description="Veja o que vem primeiro e onde cada área ficou."
      />

      <div className="mt-6 space-y-6">
        <ContinuityPriorityPanel
          guidance={guidance}
          isLoading={guidanceLoading}
          isError={guidanceError}
          onOpenProject={handleOpenFromGuidance}
        />

        {projectsLoading ? (
          <PraxisListSkeleton count={6} />
        ) : projects.length === 0 ? (
          <PraxisEmptyState
            icon={Layers}
            title="Nenhuma frente ainda"
            description="Trabalho, faculdade e projetos aparecem aqui quando precisam de continuidade."
          />
        ) : (
          <FrontsList
            projects={projects}
            guidance={guidance}
            onOpenProject={setOpenProject}
          />
        )}
      </div>

      <ProjectDetailDialog
        project={openProject}
        open={Boolean(openProject)}
        onOpenChange={(next) => {
          if (!next) setOpenProject(null);
        }}
        onSave={handleSaveDetail}
        saving={updateProject.isPending}
        updates={updates}
        updatesLoading={updatesLoading}
        onAddUpdate={handleAddUpdate}
        addingUpdate={addUpdate.isPending}
        onCompleteNextStep={handleCompleteNextStep}
        completingNextStep={completeNextStep.isPending}
        onStartFocus={handleStartFocus}
        startingFocus={startProjectFocus.isPending}
      />
    </div>
  );
}
