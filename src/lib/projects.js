export const PROJECT_COLUMNS = ['andando', 'radar', 'aguardando', 'pausado'];

export const PROJECT_COLUMN_LABELS = {
  andando: 'Andando',
  radar: 'Radar',
  aguardando: 'Aguardando',
  pausado: 'Pausado',
};

export const FRONT_STATUS_LABELS = {
  andando: 'Em curso',
  radar: 'Depois',
  aguardando: 'Aguardando',
  pausado: 'Pausado',
};

export const PROJECT_STATUS_LABELS = FRONT_STATUS_LABELS;

export const PROJECT_COLUMN_EMPTY = {
  andando: 'Nada andando agora.',
  radar: 'Nada no radar.',
  aguardando: 'Nada aguardando.',
  pausado: 'Nada pausado.',
};

export const PROJECT_KIND_LABELS = {
  produto: 'Produto',
  cliente: 'Cliente',
  trabalho: 'Trabalho',
  estudo: 'Faculdade',
};

export const GUIDANCE_REASON_LABELS = {
  deadline: 'Prazo',
  income: 'Receita',
  academic: 'Faculdade',
  client_commitment: 'Compromisso com cliente',
  continuity: 'Continuidade',
  basic_need: 'Necessidade básica',
  manual: 'Ajuste manual',
};

export const FRONT_GROUPS = [
  {
    id: 'trabalho',
    title: 'Trabalho e compromissos',
    description: 'Trabalho e clientes com entregas ativas.',
  },
  {
    id: 'estudo',
    title: 'Formação',
    description: 'Faculdade e compromissos acadêmicos.',
  },
  {
    id: 'produto',
    title: 'Construção própria',
    description: 'Produtos e iniciativas proprietárias.',
  },
];

export function formatProjectMoveDate(value) {
  if (!value) return null;
  const key = String(value).slice(0, 10);
  const parts = key.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return `${d}/${m}`;
}

export function formatProjectUpdateDate(value) {
  if (!value) return '';
  const key = String(value).slice(0, 10);
  const [y, m, d] = key.split('-');
  if (!y || !m || !d) return key;
  return `${d}/${m}/${y}`;
}

export function formatGuidanceTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza',
    });
    return `Atualizado às ${formatter.format(d)}`;
  } catch {
    return '';
  }
}

export function formatGuidanceReason(priority) {
  if (!priority) return '';
  if (priority.reason && String(priority.reason).trim()) {
    return String(priority.reason).trim();
  }
  if (priority.reason_code && GUIDANCE_REASON_LABELS[priority.reason_code]) {
    return GUIDANCE_REASON_LABELS[priority.reason_code];
  }
  return '';
}

export function findProjectForGuidancePriority(priorityOrProject, projects = []) {
  if (!priorityOrProject || !Array.isArray(projects)) return null;
  const targetSlug =
    priorityOrProject.project_slug ||
    priorityOrProject.project?.slug ||
    priorityOrProject.slug;
  const targetId = priorityOrProject.project?.id || priorityOrProject.id;

  return (
    projects.find((p) => {
      if (targetSlug && (p.slug === targetSlug || String(p.id) === String(targetSlug))) return true;
      if (targetId && String(p.id) === String(targetId)) return true;
      return false;
    }) ||
    priorityOrProject.project ||
    priorityOrProject ||
    null
  );
}

export function buildFrontsViewModel(projects = [], guidance = null) {
  if (!Array.isArray(projects)) {
    return { groups: [] };
  }

  const priorityRankBySlug = new Map();
  if (guidance?.fresh && Array.isArray(guidance.priorities)) {
    for (const p of guidance.priorities) {
      if (p.rank != null) {
        if (p.project_slug) priorityRankBySlug.set(String(p.project_slug).toLowerCase(), p.rank);
        if (p.project?.slug) priorityRankBySlug.set(String(p.project.slug).toLowerCase(), p.rank);
        if (p.project?.id) priorityRankBySlug.set(String(p.project.id), p.rank);
      }
    }
  }

  const roots = [];
  const subfrontsByParent = new Map();

  for (const project of projects) {
    const parentSlug = String(project.parent_slug || '').trim().toLowerCase();
    if (parentSlug) {
      const list = subfrontsByParent.get(parentSlug) || [];
      list.push(project);
      subfrontsByParent.set(parentSlug, list);
    } else {
      roots.push(project);
    }
  }

  const getRank = (project) => {
    const slug = String(project.slug || '').toLowerCase();
    const id = String(project.id || '');
    return priorityRankBySlug.get(slug) ?? priorityRankBySlug.get(id) ?? null;
  };

  const groupBuckets = {
    trabalho: [],
    estudo: [],
    produto: [],
  };

  const attachedSubfrontIds = new Set();

  for (const root of roots) {
    const slug = String(root.slug || '').toLowerCase();
    const id = String(root.id || '');
    const children = (subfrontsByParent.get(slug) || []).concat(
      subfrontsByParent.get(id) || []
    );

    // Dedup children
    const uniqueChildren = [];
    const seenChildIds = new Set();
    for (const child of children) {
      const childKey = child.id || child.slug;
      if (!seenChildIds.has(childKey)) {
        seenChildIds.add(childKey);
        attachedSubfrontIds.add(childKey);
        uniqueChildren.push({
          ...child,
          isSubfront: true,
          parentName: root.name,
          recommendedRank: getRank(child),
        });
      }
    }

    const enhancedRoot = {
      ...root,
      isSubfront: false,
      recommendedRank: getRank(root),
      subfronts: uniqueChildren,
    };

    if (root.kind === 'trabalho' || root.kind === 'cliente') {
      groupBuckets.trabalho.push(enhancedRoot);
    } else if (root.kind === 'estudo') {
      groupBuckets.estudo.push(enhancedRoot);
    } else {
      groupBuckets.produto.push(enhancedRoot);
    }
  }

  // Check for orphan subfronts if any
  for (const project of projects) {
    const key = project.id || project.slug;
    if (project.parent_slug && !attachedSubfrontIds.has(key)) {
      const orphan = {
        ...project,
        isSubfront: true,
        parentName: project.parent_slug,
        recommendedRank: getRank(project),
        subfronts: [],
      };
      if (project.kind === 'trabalho' || project.kind === 'cliente') {
        groupBuckets.trabalho.push(orphan);
      } else if (project.kind === 'estudo') {
        groupBuckets.estudo.push(orphan);
      } else {
        groupBuckets.produto.push(orphan);
      }
    }
  }

  return {
    groups: FRONT_GROUPS.map((g) => ({
      ...g,
      fronts: groupBuckets[g.id] || [],
    })).filter((g) => g.fronts.length > 0),
  };
}
