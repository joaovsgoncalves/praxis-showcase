import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Plus, CheckCircle2, Circle, Clock, Flame, Eraser, Archive, ListTodo, Minus, GripVertical } from 'lucide-react';
import { PageHero, StatGrid, StatTile, PraxisEmptyState } from '@/components/layout/PraxisPage';
import { cn } from '@/lib/utils';
import TaskForm from '@/components/habits-tasks/TaskForm';
import QuickTaskInput from '@/components/habits-tasks/QuickTaskInput';
import TaskRecurrenceBadge from '@/components/habits-tasks/TaskRecurrenceBadge';
import { notifyPraxisRecurrenceSpawned } from '@/lib/praxisRecurrenceToast';
import { dispatchPraxisLevelUpFromResponse } from '@/lib/praxisLevelUp';
import { hapticLight } from '@/lib/haptics';
import HabitForm from '@/components/habits-tasks/HabitForm';
import CompoundHabitsWidget from '@/components/dashboard/CompoundHabitsWidget';
import SinceHabitCard from '@/components/dashboard/SinceHabitCard';
import { TaskRowMenu, HabitRowMenu } from '@/components/habits-tasks/ListRowMenus';
import NoiseCleanupDialog from '@/components/habits-tasks/NoiseCleanupDialog';
import TaskBulkArchiveDialog from '@/components/habits-tasks/TaskBulkArchiveDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORIES, CategoryBadge } from '@/lib/categories';
import { sparkAt } from '@/lib/celebration';
import { fortalezaDateKey } from '@/lib/dates';
import { buildMovedOrder, buildDragOrder } from '@/lib/taskReorder';
import { isTaskOpen, isTaskDone, isInboxTask, cleanPriorityPrefix } from '@/lib/tasks';
import { toast } from 'sonner';
import {
  SKIP_REASON_LABELS,
  countHabitDayOutcomes,
  formatFrequencyLabel,
  formatPreferredTime,
  formatSinceDatePt,
  getHabitDayOutcome,
  isHabitDueOnDate,
  isQuantitativeHabit,
  isQuickIncrementHabit,
  formatHabitProgress,
  formatQuickIncrementButtonLabel,
  formatQuickIncrementAriaLabel,
  todayLogForHabit,
} from '@/lib/habits';
import SkipHabitSheet from '@/components/habits-tasks/SkipHabitSheet';
import QuantLogSheet from '@/components/habits-tasks/QuantLogSheet';
import { partitionCompoundHabitsForDay } from '@/lib/compoundHabitOrder';
import {
  TASK_SCOPE_CHIPS,
  filterTasksByScope,
  filterTasksForListPresentation,
  sortTasksForList,
  countOpenOverdue,
  countOpenInbox,
  isTaskOverdue,
  addDaysToDateKey,
} from '@/lib/taskListFilters';
import {
  habitTasksTabFromSearchParams,
  setHabitTasksTabInSearchParams,
  taskScopeFromSearchParams,
  setTaskScopeInSearchParams,
  taskLensFromSearchParams,
  setTaskLensInSearchParams,
} from '@/lib/urlDeepLinks';
import { boardColumnForTask, weekRange } from '@/lib/taskLenses';
import TaskBoard from '@/components/habits-tasks/TaskBoard';
import TaskWeek from '@/components/habits-tasks/TaskWeek';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';


const priorityStyles = {
  high: 'bg-destructive/15 text-destructive border-destructive/20',
  medium: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const priorityLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export default function HabitsTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => habitTasksTabFromSearchParams(searchParams));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [createTaskInitial, setCreateTaskInitial] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [savingHabitId, setSavingHabitId] = useState(null);
  const [noiseDialogOpen, setNoiseDialogOpen] = useState(false);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [taskSelectionMode, setTaskSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(() => new Set());
  const [taskScope, setTaskScope] = useState(() => taskScopeFromSearchParams(searchParams));
  const [lens, setLens] = useState(() => taskLensFromSearchParams(searchParams));
  const [skipSheetHabit, setSkipSheetHabit] = useState(null);
  const [quantSheetHabit, setQuantSheetHabit] = useState(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState(null);
  const [habitPendingDelete, setHabitPendingDelete] = useState(null);
  const queryClient = useQueryClient();
  const habitRowRefs = useRef(new Map());
  const today = fortalezaDateKey();

  useEffect(() => {
    setView(habitTasksTabFromSearchParams(searchParams));
    setTaskScope(taskScopeFromSearchParams(searchParams));
    setLens(taskLensFromSearchParams(searchParams));
  }, [searchParams]);

  const handleOpenCreateTask = (initialData = null) => {
    setCreateTaskInitial(initialData);
    setShowTaskForm(true);
  };

  const handleLensChange = (nextLens) => {
    setLens(nextLens);
    setSearchParams(setTaskLensInSearchParams(searchParams, nextLens), { replace: true });
  };

  const handleTaskScopeChange = (scope) => {
    setTaskScope(scope);
    setSearchParams(setTaskScopeInSearchParams(searchParams, scope), { replace: true });
    setSelectedTaskIds(new Set());
  };

  const handleViewChange = (next) => {
    setView(next);
    setSearchParams(setHabitTasksTabInSearchParams(searchParams, next), { replace: true });
  };

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', today],
    queryFn: () => praxisApi.tasks.list({ limit: 50, include_overdue: '1', today }),
  });
  const { data: habits = [] } = useQuery({
    queryKey: ['allHabits', 'active', today],
    queryFn: () => praxisApi.habits.list({ status: 'active', date: today }),
  });
  const { data: habitLogs = [] } = useQuery({ queryKey: ['habitLogs', today], queryFn: () => praxisApi.habitLogs.list({ date: today }) });
  const { data: activeHabitsList = [] } = useQuery({
    queryKey: ['habits', 'active', today],
    queryFn: () => praxisApi.habits.list({ status: 'active', date: today }),
  });

  const createTask = useMutation({
    mutationFn: (data) => praxisApi.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      setShowTaskForm(false);
    },
  });

  const handleQuickAddTask = (title) => {
    createTask.mutate(
      { title, date: null, status: 'pending', source: 'manual' },
      {
        onSuccess: () => {
          if (lens === 'list' && taskScope === 'today') {
            handleTaskScopeChange('inbox');
          }
          toast.success('Foi pra Caixa');
        },
        onError: () => {
          toast.error('Erro ao criar tarefa');
        },
      }
    );
  };

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => praxisApi.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['allTasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboardTasks'] });

      const prevTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });
      const prevAllTasks = queryClient.getQueriesData({ queryKey: ['allTasks'] });
      const prevDashboard = queryClient.getQueriesData({ queryKey: ['dashboardTasks'] });

      if (data?.status === 'completed') hapticLight();

      const updateList = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((t) =>
          t.id === id
            ? {
                ...t,
                ...data,
                completed_date:
                  data?.status === 'completed'
                    ? today
                    : data?.status && data.status !== 'completed'
                    ? null
                    : t.completed_date,
                completed_at:
                  data?.status === 'completed'
                    ? new Date().toISOString()
                    : data?.status && data.status !== 'completed'
                    ? null
                    : t.completed_at,
              }
            : t
        );
      };

      queryClient.setQueriesData({ queryKey: ['tasks'] }, updateList);
      queryClient.setQueriesData({ queryKey: ['allTasks'] }, updateList);
      queryClient.setQueriesData({ queryKey: ['dashboardTasks'] }, updateList);

      return { prevTasks, prevAllTasks, prevDashboard };
    },
    onError: (_err, _vars, context) => {
      context?.prevTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevDashboard?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao atualizar tarefa');
    },
    onSuccess: (data) => {
      dispatchPraxisLevelUpFromResponse(data);
      notifyPraxisRecurrenceSpawned(data);
      setEditingTask(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  const createHabit = useMutation({
    mutationFn: (data) => praxisApi.habits.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allHabits'] }); queryClient.invalidateQueries({ queryKey: ['habits'] }); setShowHabitForm(false); },
  });

  const updateHabit = useMutation({
    mutationFn: ({ id, data }) => praxisApi.habits.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allHabits'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['goalHabits'] });
      setEditingHabit(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id) => praxisApi.tasks.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['allTasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboardTasks'] });

      const prevTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });
      const prevAllTasks = queryClient.getQueriesData({ queryKey: ['allTasks'] });
      const prevDashboard = queryClient.getQueriesData({ queryKey: ['dashboardTasks'] });

      const filterList = (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((t) => t.id !== id);
      };

      queryClient.setQueriesData({ queryKey: ['tasks'] }, filterList);
      queryClient.setQueriesData({ queryKey: ['allTasks'] }, filterList);
      queryClient.setQueriesData({ queryKey: ['dashboardTasks'] }, filterList);

      return { prevTasks, prevAllTasks, prevDashboard };
    },
    onError: (_err, _id, context) => {
      context?.prevTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevDashboard?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao excluir tarefa');
    },
    onSuccess: () => {
      toast.success('Tarefa excluída');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  const deleteHabit = useMutation({
    mutationFn: (id) => praxisApi.habits.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['allHabits'] });
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      await queryClient.cancelQueries({ queryKey: ['habitLogs'] });

      const prevAllHabits = queryClient.getQueriesData({ queryKey: ['allHabits'] });
      const prevHabits = queryClient.getQueriesData({ queryKey: ['habits'] });
      const prevLogs = queryClient.getQueriesData({ queryKey: ['habitLogs'] });

      const filterHabitList = (old) => {
        if (!Array.isArray(old)) return old;
        return old
          .filter((h) => h.id !== id)
          .map((h) => ({
            ...h,
            children: Array.isArray(h.children)
              ? h.children.filter((c) => c.id !== id)
              : h.children,
          }));
      };

      queryClient.setQueriesData({ queryKey: ['allHabits'] }, filterHabitList);
      queryClient.setQueriesData({ queryKey: ['habits'] }, filterHabitList);
      queryClient.setQueriesData({ queryKey: ['habitLogs'] }, (old) =>
        Array.isArray(old) ? old.filter((l) => l.habit_id !== id) : old
      );

      return { prevAllHabits, prevHabits, prevLogs };
    },
    onError: (_err, _id, context) => {
      context?.prevAllHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevLogs?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao excluir hábito');
    },
    onSuccess: () => {
      toast.success('Hábito excluído');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allHabits'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
    },
  });

  const reorderTasks = useMutation({
    mutationFn: (orderedIds) => praxisApi.tasks.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const reorderHabits = useMutation({
    mutationFn: (orderedIds) => praxisApi.habits.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allHabits'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const toggleTask = useMutation({
    mutationFn: (task) => {
      const nextStatus = isTaskDone(task) ? 'pending' : 'completed';
      return praxisApi.tasks.update(task.id, { status: nextStatus });
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['allTasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboardTasks'] });

      const prevTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });
      const prevAllTasks = queryClient.getQueriesData({ queryKey: ['allTasks'] });
      const prevDashboard = queryClient.getQueriesData({ queryKey: ['dashboardTasks'] });

      const nextStatus = isTaskDone(task) ? 'pending' : 'completed';
      if (nextStatus === 'completed') hapticLight();

      const updateList = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: nextStatus,
                completed_date: nextStatus === 'completed' ? today : null,
                completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
              }
            : t
        );
      };

      queryClient.setQueriesData({ queryKey: ['tasks'] }, updateList);
      queryClient.setQueriesData({ queryKey: ['allTasks'] }, updateList);
      queryClient.setQueriesData({ queryKey: ['dashboardTasks'] }, updateList);

      return { prevTasks, prevAllTasks, prevDashboard };
    },
    onError: (_err, _task, context) => {
      context?.prevTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevDashboard?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao atualizar tarefa');
    },
    onSuccess: (data) => {
      dispatchPraxisLevelUpFromResponse(data);
      notifyPraxisRecurrenceSpawned(data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  const toggleHabit = useMutation({
    mutationFn: async ({ habitId, isDone, value }) => {
      const logs = habitLogs.filter(log => log.habit_id === habitId && log.date === today);
      const realLog = logs.find((log) => log.id && !String(log.id).startsWith('temp-'));
      if (isDone && realLog) {
        await praxisApi.habitLogs.delete(realLog.id);
      } else if (!isDone) {
        await praxisApi.habitLogs.create({
          habit_id: habitId,
          date: today,
          outcome: 'done',
          completed: true,
          ...(value !== undefined ? { value } : {}),
        });
      }
    },
    onMutate: async ({ habitId, isDone, value }) => {
      await queryClient.cancelQueries({ queryKey: ['habitLogs'] });
      await queryClient.cancelQueries({ queryKey: ['allHabits'] });
      await queryClient.cancelQueries({ queryKey: ['habits'] });

      const prevLogs = queryClient.getQueriesData({ queryKey: ['habitLogs'] });
      const prevAllHabits = queryClient.getQueriesData({ queryKey: ['allHabits'] });
      const prevHabits = queryClient.getQueriesData({ queryKey: ['habits'] });

      const allActive = queryClient.getQueryData(['habits', 'active', today]) || [];
      const targetHabit = allActive.find((h) => h.id === habitId);
      const targetVal = Number(targetHabit?.target_value) || 0;
      const isCompleted = isDone ? false : (value !== undefined && targetVal > 0 ? value >= targetVal : true);

      if (!isDone && isCompleted) hapticLight();

      queryClient.setQueriesData({ queryKey: ['habitLogs'] }, (old) => {
        if (!Array.isArray(old)) return old;
        if (isDone) {
          return old.filter((l) => !(l.habit_id === habitId && l.date === today));
        }
        const filtered = old.filter((l) => !(l.habit_id === habitId && l.date === today));
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            habit_id: habitId,
            date: today,
            outcome: isCompleted ? 'done' : null,
            completed: isCompleted ? 1 : 0,
            value: isDone ? null : (value !== undefined ? value : (targetVal > 0 ? targetVal : null)),
          },
        ];
      });

      const updateHabitItems = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((h) => {
          if (h.id === habitId) {
            return {
              ...h,
              value_today: isDone ? null : (value !== undefined ? value : (targetVal > 0 ? targetVal : null)),
              completed_today: isCompleted,
              skipped_today: false,
              day_outcome: isDone ? 'open' : (isCompleted ? 'done' : 'open'),
            };
          }
          if (h.children && Array.isArray(h.children)) {
            return {
              ...h,
              children: h.children.map((child) =>
                child.id === habitId
                  ? {
                      ...child,
                      value_today: isDone ? null : (value !== undefined ? value : (targetVal > 0 ? targetVal : null)),
                      completed_today: isCompleted,
                      skipped_today: false,
                      day_outcome: isDone ? 'open' : (isCompleted ? 'done' : 'open'),
                    }
                  : child
              ),
            };
          }
          return h;
        });
      };

      queryClient.setQueriesData({ queryKey: ['allHabits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['habits'] }, updateHabitItems);

      return { prevLogs, prevAllHabits, prevHabits };
    },
    onError: (_err, _vars, context) => {
      context?.prevLogs?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao atualizar hábito');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  const quickIncrementHabit = useMutation({
    mutationFn: async ({ habit, increment }) => {
      return praxisApi.habitLogs.create({
        habit_id: habit.id,
        date: today,
        increment: increment ?? habit.quick_increment ?? 0.5,
      });
    },
    onMutate: async ({ habit, increment }) => {
      await queryClient.cancelQueries({ queryKey: ['habitLogs'] });
      await queryClient.cancelQueries({ queryKey: ['allHabits'] });
      await queryClient.cancelQueries({ queryKey: ['habits'] });

      const prevLogs = queryClient.getQueriesData({ queryKey: ['habitLogs'] });
      const prevAllHabits = queryClient.getQueriesData({ queryKey: ['allHabits'] });
      const prevHabits = queryClient.getQueriesData({ queryKey: ['habits'] });

      const currentLog = habitLogs.find((l) => l.habit_id === habit.id && l.date === today);
      const prevVal = (currentLog && currentLog.value != null && Number.isFinite(Number(currentLog.value)))
        ? Number(currentLog.value)
        : 0;
      const inc = Number(increment ?? habit.quick_increment ?? 0.5);
      const nextVal = Math.round((prevVal + inc) * 1000) / 1000;
      const target = Number(habit.target_value) || 0;
      const willBeDone = target > 0 && nextVal >= target;

      if (willBeDone) hapticLight();

      queryClient.setQueriesData({ queryKey: ['habitLogs'] }, (old) => {
        if (!Array.isArray(old)) return old;
        const filtered = old.filter((l) => !(l.habit_id === habit.id && l.date === today));
        return [
          ...filtered,
          {
            id: currentLog?.id || `temp-${Date.now()}`,
            habit_id: habit.id,
            date: today,
            outcome: willBeDone ? 'done' : null,
            completed: willBeDone ? 1 : 0,
            value: nextVal,
          },
        ];
      });

      const updateHabitItems = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((h) => {
          if (h.id === habit.id) {
            return {
              ...h,
              value_today: nextVal,
              completed_today: willBeDone,
              skipped_today: false,
              day_outcome: willBeDone ? 'done' : 'open',
            };
          }
          if (h.children && Array.isArray(h.children)) {
            return {
              ...h,
              children: h.children.map((child) =>
                child.id === habit.id
                  ? {
                      ...child,
                      value_today: nextVal,
                      completed_today: willBeDone,
                      skipped_today: false,
                      day_outcome: willBeDone ? 'done' : 'open',
                    }
                  : child
              ),
            };
          }
          return h;
        });
      };

      queryClient.setQueriesData({ queryKey: ['allHabits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['habits'] }, updateHabitItems);

      return { prevLogs, prevAllHabits, prevHabits };
    },
    onError: (_err, _vars, context) => {
      context?.prevLogs?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao registrar incremento');
    },
    onSuccess: (data) => {
      dispatchPraxisLevelUpFromResponse(data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['allHabits'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  const skipHabit = useMutation({
    mutationFn: async ({ habitId, skipReason, skipNote }) => {
      await praxisApi.habitLogs.create({
        habit_id: habitId,
        date: today,
        outcome: 'skipped',
        ...(skipReason ? { skip_reason: skipReason } : {}),
        ...(skipNote ? { note: skipNote } : {}),
      });
    },
    onMutate: async ({ habitId, skipReason, skipNote }) => {
      await queryClient.cancelQueries({ queryKey: ['habitLogs'] });
      await queryClient.cancelQueries({ queryKey: ['allHabits'] });
      await queryClient.cancelQueries({ queryKey: ['habits'] });

      const prevLogs = queryClient.getQueriesData({ queryKey: ['habitLogs'] });
      const prevAllHabits = queryClient.getQueriesData({ queryKey: ['allHabits'] });
      const prevHabits = queryClient.getQueriesData({ queryKey: ['habits'] });

      queryClient.setQueriesData({ queryKey: ['habitLogs'] }, (old) => {
        if (!Array.isArray(old)) return old;
        const filtered = old.filter((l) => !(l.habit_id === habitId && l.date === today));
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            habit_id: habitId,
            date: today,
            outcome: 'skipped',
            skip_reason: skipReason || null,
            note: skipNote || null,
            completed: false,
          },
        ];
      });

      const updateHabitItems = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((h) => {
          if (h.id === habitId) {
            return {
              ...h,
              completed_today: false,
              skipped_today: true,
              day_outcome: 'skipped',
            };
          }
          if (h.children && Array.isArray(h.children)) {
            return {
              ...h,
              children: h.children.map((child) =>
                child.id === habitId
                  ? {
                      ...child,
                      completed_today: false,
                      skipped_today: true,
                      day_outcome: 'skipped',
                    }
                  : child
              ),
            };
          }
          return h;
        });
      };

      queryClient.setQueriesData({ queryKey: ['allHabits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['habits'] }, updateHabitItems);

      return { prevLogs, prevAllHabits, prevHabits };
    },
    onError: (_err, _vars, context) => {
      context?.prevLogs?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao registrar');
    },
    onSuccess: () => {
      toast('Registrado. O importante é não quebrar a corrente dois dias seguidos.');
      setSkipSheetHabit(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
    },
  });

  const notTodayTask = useMutation({
    mutationFn: (taskId) => praxisApi.tasks.notToday(taskId, {}),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['allTasks'] });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['dashboardTasks'] });

      const prevAllTasks = queryClient.getQueriesData({ queryKey: ['allTasks'] });
      const prevTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });
      const prevDashboard = queryClient.getQueriesData({ queryKey: ['dashboardTasks'] });

      const updateList = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'pending',
                date: addDaysToDateKey(today, 1),
                day_outcome: 'not_today',
                day_outcome_date: today,
              }
            : t
        );
      };

      queryClient.setQueriesData({ queryKey: ['allTasks'] }, updateList);
      queryClient.setQueriesData({ queryKey: ['tasks'] }, updateList);
      queryClient.setQueriesData({ queryKey: ['dashboardTasks'] }, updateList);

      return { prevAllTasks, prevTasks, prevDashboard };
    },
    onError: (_err, _taskId, context) => {
      context?.prevAllTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevTasks?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevDashboard?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao adiar tarefa');
    },
    onSuccess: () => {
      toast('Adiado. Empurrado pra amanhã sem culpa, mas com compromisso.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
    },
  });

  const habitDayOutcome = (habitId) => {
    const log = todayLogForHabit(habitLogs, habitId, today);
    return getHabitDayOutcome(log);
  };


  const bulkArchiveTasks = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await praxisApi.tasks.update(id, { status: 'cancelled' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
      setBulkArchiveOpen(false);
      setTaskSelectionMode(false);
      setSelectedTaskIds(new Set());
    },
  });

  const bulkCancelTasks = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await praxisApi.tasks.update(id, { status: 'cancelled' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
      setNoiseDialogOpen(false);
    },
  });

  const handleQuickIncrement = async (habit, evt) => {
    if (savingHabitId === habit.id) return;
    setSavingHabitId(habit.id);

    const target = habitRowRefs.current.get(habit.id);
    const rect = (evt?.currentTarget || target)?.getBoundingClientRect?.();
    if (rect) sparkAt(rect.left + 28, rect.top + rect.height / 2);

    try {
      await quickIncrementHabit.mutateAsync({
        habit,
        increment: habit.quick_increment ?? 0.5,
      });
    } finally {
      setSavingHabitId(null);
    }
  };

  const handleToggleHabit = (habit, isDone, evt) => {
    if (isQuickIncrementHabit(habit) && !isDone) {
      handleQuickIncrement(habit, evt);
      return;
    }
    if (isQuantitativeHabit(habit) && !isDone) {
      setQuantSheetHabit(habit);
      return;
    }
    if (!isDone) {
      const target = habitRowRefs.current.get(habit.id);
      const rect = (evt?.currentTarget || target)?.getBoundingClientRect?.();
      if (rect) sparkAt(rect.left + 28, rect.top + rect.height / 2);
    }
    toggleHabit.mutate({ habitId: habit.id, isDone });
  };

  const boardTasksCount = tasks.filter((t) => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return boardColumnForTask(t, today) !== null;
  }).length;

  const weekRangeCurrent = weekRange(today);
  const weekTasksCount = tasks.filter((t) => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (t.category === 'ideias' || t.status === 'cancelled') return false;
    if (!t.date) return false;
    const d = String(t.date).slice(0, 10);
    return d >= weekRangeCurrent.start && d <= weekRangeCurrent.end;
  }).length;

  const scopedTasks = filterTasksByScope(tasks, taskScope, today);
  const overdueInScope = countOpenOverdue(scopedTasks, today);
  const overdueOpenTotal = countOpenOverdue(tasks, today);

  const filteredTasks = filterTasksForListPresentation(scopedTasks, categoryFilter, today)
    .sort((a, b) => sortTasksForList(a, b, today));

  const archivableTasks = filteredTasks.filter((t) => isTaskOpen(t));

  const toggleTaskSelected = (id) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulkArchive = () => {
    const pool =
      selectedTaskIds.size > 0
        ? archivableTasks.filter((t) => selectedTaskIds.has(t.id))
        : archivableTasks;
    if (pool.length === 0) return;
    setBulkArchiveOpen(true);
  };

  const filteredHabits = habits.filter(h => {
    if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
    return true;
  });
  const compoundHabits = filteredHabits.filter((habit) => habit.kind === 'compound');
  const flatHabits = filteredHabits.filter((habit) => habit.kind !== 'compound');
  const { beforeChecks: openingCompounds, afterChecks: closingCompounds } =
    partitionCompoundHabitsForDay(compoundHabits);
  const checkHabits = flatHabits.filter((habit) => habit.tracking_mode !== 'since');
  const sinceHabits = flatHabits.filter((habit) => habit.tracking_mode === 'since');
  const orderedFlatHabits = [
    ...checkHabits,
    ...sinceHabits,
  ];
  const activeLeafHabits = activeHabitsList.flatMap((habit) =>
    habit.kind === 'compound' ? (habit.children || []) : [habit]
  );
  const activeHabitsDueToday = activeLeafHabits.filter(
    (h) => isHabitDueOnDate(h, today)
  );
  const habitDayCounts = countHabitDayOutcomes(activeHabitsDueToday, habitLogs, today);
  const completedHabits = habitDayCounts.done;
  const skippedHabitsToday = habitDayCounts.skipped;
  const habitsDayPct = activeHabitsDueToday.length
    ? Math.round((completedHabits / activeHabitsDueToday.length) * 100)
    : 0;

  const noiseTasks = tasks.filter(
    (t) => (t.status === 'pending' || t.status === 'in_progress') && t.date && t.date < today,
  );

  const moveTask = (taskId, direction) => {
    const orderedIds = buildMovedOrder(tasks, filteredTasks, taskId, direction);
    if (orderedIds) reorderTasks.mutate(orderedIds);
  };

  const handleTaskDragEnd = (result) => {
    if (!result.destination || reorderTasks.isPending) return;
    const orderedIds = buildDragOrder(
      tasks,
      filteredTasks,
      result.source.index,
      result.destination.index,
    );
    if (orderedIds) reorderTasks.mutate(orderedIds);
  };

  const moveHabit = (habitId, direction) => {
    const orderedIds = buildMovedOrder(habits, flatHabits, habitId, direction);
    if (orderedIds) reorderHabits.mutate(orderedIds);
  };

  const confirmDeleteTask = (task) => {
    setTaskPendingDelete(task);
  };

  const confirmDeleteHabit = (habit) => {
    setHabitPendingDelete(habit);
  };

  const todayRadarCount = filterTasksByScope(tasks, 'today', today).length;
  const bulkArchivePool =
    selectedTaskIds.size > 0
      ? archivableTasks.filter((t) => selectedTaskIds.has(t.id))
      : archivableTasks;

  return (
    <div className="praxis-page overflow-x-hidden">
      {lens !== 'board' && lens !== 'week' && (
        <PageHero
        kicker="Hábitos e tarefas"
        kickerIcon={ListTodo}
        title="Hábitos & Tarefas"
        description="Hoje, semana ou atrasadas — arquive em lote o que não vale mais."
        action={(
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            <Button onClick={() => handleOpenCreateTask(null)} className="praxis-touch-target h-11 w-full rounded-full px-4 sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" /> Tarefa
            </Button>
            <Button
              onClick={() => { setEditingHabit(null); setShowHabitForm(true); }}
              className="praxis-touch-target h-11 w-full rounded-full px-4 sm:w-auto"
              variant="outline"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Hábito
            </Button>
          </div>
        )}
      >
        <StatGrid className="sm:grid-cols-3 lg:grid-cols-3">
          <StatTile label="Hoje" value={todayRadarCount} tone="cyan" />
          <StatTile label="Hábitos hoje" value={`${completedHabits}/${activeHabitsDueToday.length}`} />
          <StatTile
            label="Área"
            value={categoryFilter === 'all' ? 'Todas' : (CATEGORIES[categoryFilter]?.label || '—')}
          />
        </StatGrid>
      </PageHero>
      )}

      {lens !== 'board' && lens !== 'week' && (
        <section className="praxis-panel rounded-3xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={view} onValueChange={handleViewChange}>
              <TabsList className="praxis-scroll-x h-11 w-full max-w-full justify-start rounded-2xl bg-white/[0.03] p-1 flex-nowrap">
                <TabsTrigger className="rounded-xl px-3 sm:px-4 shrink-0" value="all">Todos</TabsTrigger>
                <TabsTrigger className="rounded-xl px-3 sm:px-4 shrink-0" value="tasks">Tarefas ({filteredTasks.length})</TabsTrigger>
                <TabsTrigger className="rounded-xl px-3 sm:px-4 shrink-0" value="habits">Hábitos ({habits.length})</TabsTrigger>
              </TabsList>
            </Tabs>

          </div>

          <div className="praxis-scroll-x flex w-full max-w-full items-center gap-2 py-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                categoryFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-secondary/55 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              Todos
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  categoryFilter === key
                    ? `${cat.color} ring-1 ring-current`
                    : 'bg-secondary/55 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {lens === 'board' ? (
        <section className="min-w-0 space-y-3 pt-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="praxis-title text-2xl font-semibold tracking-tight text-foreground">
                Tarefas
              </h2>
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                ({boardTasksCount})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full bg-white/[0.03] p-0.5 border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLensChange('list')}
                  className={cn(
                    'rounded-full px-3.5 py-1 text-xs font-medium transition-colors',
                    lens === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => handleLensChange('board')}
                  className={cn(
                    'rounded-full px-3.5 py-1 text-xs font-medium transition-colors',
                    lens === 'board'
                      ? 'bg-domain-gold/20 text-domain-gold border border-domain-gold/30 shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Quadro
                </button>
                <button
                  type="button"
                  onClick={() => handleLensChange('week')}
                  className={cn(
                    'rounded-full px-3.5 py-1 text-xs font-medium transition-colors',
                    lens === 'week'
                      ? 'bg-domain-gold/20 text-domain-gold border border-domain-gold/30 shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Semana
                </button>
              </div>

              <Button
                onClick={() => handleOpenCreateTask(null)}
                className="praxis-touch-target h-9 rounded-full px-3.5 text-xs font-medium"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Tarefa
              </Button>
            </div>
          </div>

          <QuickTaskInput
            onAdd={handleQuickAddTask}
            isPending={createTask.isPending}
          />

          <TaskBoard
            tasks={tasks}
            allTasks={tasks}
            today={today}
            onUpdateTask={(id, data) => updateTask.mutate({ id, data })}
            onToggleComplete={(task) => toggleTask.mutate(task)}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={(task) => confirmDeleteTask(task)}
            onNotToday={(task) => notTodayTask.mutate(task.id)}
            onOpenCreateTask={(columnId) => {
              if (columnId === 'inbox') handleOpenCreateTask({ date: null, status: 'pending' });
              else if (columnId === 'todo') handleOpenCreateTask({ date: today, status: 'pending' });
              else if (columnId === 'doing') handleOpenCreateTask({ date: today, status: 'in_progress' });
              else if (columnId === 'done') handleOpenCreateTask({ date: today, status: 'completed' });
              else handleOpenCreateTask(null);
            }}
          />
        </section>
      ) : (
        <div className={cn('grid gap-6', view === 'all' && lens === 'list' && 'xl:grid-cols-2 xl:items-start xl:gap-8')}>
        {(view === 'all' || view === 'tasks') && (
          <section className="min-w-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="praxis-kicker">Execução</p>
                <h2 className="praxis-title text-2xl font-semibold">
                  Tarefas
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    ({lens === 'board' ? boardTasksCount : lens === 'week' ? weekTasksCount : filteredTasks.length})
                  </span>
                </h2>
                {lens === 'list' && overdueInScope > 0 && taskScope !== 'overdue' && (
                  <p className="mt-1 text-xs text-destructive">
                    {overdueInScope} atrasada{overdueInScope === 1 ? '' : 's'} neste recorte
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <div className="flex items-center rounded-full bg-white/[0.03] p-0.5 border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLensChange('list')}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      lens === 'list'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLensChange('board')}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      lens === 'board'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Quadro
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLensChange('week')}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      lens === 'week'
                        ? 'bg-domain-gold/20 text-domain-gold border border-domain-gold/30 shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                      )}
                      >
                      Semana
                  </button>
                </div>

                {lens === 'list' && (
                  <>
                    <Button
                      type="button"
                      variant={taskSelectionMode ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-9 rounded-full"
                      onClick={() => {
                        setTaskSelectionMode((v) => !v);
                        setSelectedTaskIds(new Set());
                      }}
                    >
                      {taskSelectionMode ? 'Pronto' : 'Selecionar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full gap-1"
                      disabled={archivableTasks.length === 0 || bulkArchiveTasks.isPending}
                      onClick={openBulkArchive}
                    >
                      <Archive className="h-4 w-4" />
                      Arquivar
                    </Button>
                    {taskScope === 'overdue' && noiseTasks.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setNoiseDialogOpen(true)}
                      >
                        <Eraser className="h-4 w-4" />
                        Limpar atrasadas ({noiseTasks.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <QuickTaskInput
              onAdd={handleQuickAddTask}
              isPending={createTask.isPending}
            />

            {lens === 'list' && (
              <div className="praxis-scroll-x flex gap-2 pb-1">
                {TASK_SCOPE_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleTaskScopeChange(chip.id)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
                      taskScope === chip.id
                        ? 'bg-primary/90 text-primary-foreground'
                        : 'bg-secondary/55 text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    {chip.label}
                    {chip.id === 'overdue' && countOpenOverdue(tasks, today) > 0
                      ? ` (${countOpenOverdue(tasks, today)})`
                      : ''}
                    {chip.id === 'inbox' && countOpenInbox(tasks) > 0
                      ? ` (${countOpenInbox(tasks)})`
                      : ''}
                  </button>
                ))}
              </div>
            )}

            {lens === 'week' ? (
              <TaskWeek
                tasks={categoryFilter === 'all' ? tasks : tasks.filter((t) => t.category === categoryFilter)}
                allTasks={tasks}
                today={today}
                onUpdateTask={(id, data) => updateTask.mutate({ id, data })}
                onToggleComplete={(task) => toggleTask.mutate(task)}
                onEditTask={(task) => setEditingTask(task)}
                onDeleteTask={(task) => confirmDeleteTask(task)}
                onNotToday={(task) => notTodayTask.mutate(task.id)}
                onCreateTaskAt={(initialData) => handleOpenCreateTask(initialData)}
              />
            ) : filteredTasks.length === 0 ? (
              <PraxisEmptyState
                icon={ListTodo}
                title={taskScope === 'inbox' ? 'Caixa vazia' : 'Nenhuma tarefa neste filtro'}
                description={
                  taskScope === 'inbox'
                    ? 'Tarefa sem dia. Entra aqui até você datar.'
                    : taskScope === 'today' && overdueOpenTotal > 0
                    ? `Nada para hoje no calendário. Você tem ${overdueOpenTotal} atrasada${
                        overdueOpenTotal === 1 ? '' : 's'
                      } — vale abrir esse filtro.`
                    : 'Crie uma tarefa ou mude o filtro acima.'
                }
                action={
                  taskScope === 'inbox' ? null : (
                    <>
                      {taskScope === 'today' && overdueOpenTotal > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full praxis-touch-target"
                          onClick={() => handleTaskScopeChange('overdue')}
                        >
                          Ver atrasadas ({overdueOpenTotal})
                        </Button>
                      )}
                      <Button onClick={() => handleOpenCreateTask(null)} className="rounded-full praxis-touch-target">
                        <Plus className="mr-1.5 h-4 w-4" /> Nova tarefa
                      </Button>
                    </>
                  )
                }
              />
            ) : (
              <DragDropContext onDragEnd={handleTaskDragEnd}>
                <Droppable droppableId="task-list">
                  {(dropProvided) => (
                    <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-3">
                      {filteredTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={String(task.id)} index={index} isDragDisabled={taskSelectionMode || reorderTasks.isPending}>
                          {(dragProvided, dragSnapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} style={dragProvided.draggableProps.style} className={cn(dragSnapshot.isDragging && 'relative z-50')}>
                              <Card className={cn(
                                'overflow-hidden shadow-none transition-colors',
                                isTaskDone(task)
                                  ? 'card-domain domain-wellness border-domain-wellness/30 bg-domain-wellness/10'
                                  : 'border-border/80 bg-card/50',
                                dragSnapshot.isDragging && 'border-primary/40 bg-card shadow-lg',
                              )}>
                                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                                  {!taskSelectionMode && (
                                    <button type="button" {...dragProvided.dragHandleProps} className="praxis-touch-target shrink-0 cursor-grab rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground active:cursor-grabbing" aria-label="Arrastar tarefa" title="Arraste para mudar a ordem de execução">
                                      <GripVertical className="h-5 w-5" />
                                    </button>
                                  )}
                      {taskSelectionMode && isTaskOpen(task) && (
                        <Checkbox
                          checked={selectedTaskIds.has(task.id)}
                          onCheckedChange={() => toggleTaskSelected(task.id)}
                          className="shrink-0"
                          aria-label="Selecionar para arquivar"
                        />
                      )}
                      <button
                        onClick={() => toggleTask.mutate(task)}
                        className="praxis-touch-target shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Alternar ${cleanPriorityPrefix(task.title)}`}
                      >
                        {isTaskDone(task) ? (
                          <CheckCircle2 className="h-5 w-5 text-domain-wellness" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p
                            className={cn(
                              'font-semibold leading-snug text-base',
                              isTaskDone(task) && 'text-domain-wellness line-through opacity-80',
                            )}
                          >
                            {cleanPriorityPrefix(task.title)}
                          </p>
                          {task.time && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                              <Clock className="mr-0.5 h-3 w-3" />
                              {String(task.time).slice(0, 5)}
                            </Badge>
                          )}
                          <Badge className={cn('text-[10px] sm:text-xs shrink-0', priorityStyles[task.priority])}>
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                          <CategoryBadge category={task.category} />
                          <TaskRecurrenceBadge task={task} allTasks={tasks} className="shrink-0" />
                          {isTaskOverdue(task, today) && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              Atrasada
                            </Badge>
                          )}
                          {task.status === 'in_progress' && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 border-primary/30 bg-primary/10 text-primary">
                              Andamento
                            </Badge>
                          )}
                          {isInboxTask(task) && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 border-white/15 text-muted-foreground">
                              Caixa
                            </Badge>
                          )}
                        </div>
                        {task.date && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">{task.date}</Badge>
                            {task.day_outcome === 'not_today'
                              && task.day_outcome_date === addDaysToDateKey(today, -1) && (
                              <Badge variant="outline" className="text-[10px] text-amber-200/90 border-amber-500/25">
                                Empurrada de ontem
                              </Badge>
                            )}
                          </div>
                        )}
                        {!task.date && task.recurrence && task.recurrence !== 'none' && (
                          <p className="mt-1 text-xs text-amber-400/90">Defina uma data para a recorrência funcionar.</p>
                        )}
                      </div>

                      <TaskRowMenu
                        label={cleanPriorityPrefix(task.title)}
                        busy={reorderTasks.isPending || notTodayTask.isPending}
                        disableUp={index === 0}
                        disableDown={index === filteredTasks.length - 1}
                        onMoveUp={() => moveTask(task.id, -1)}
                        onMoveDown={() => moveTask(task.id, 1)}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => confirmDeleteTask(task)}
                        showNotToday={
                          isTaskOpen(task)
                          && task.category !== 'ideias'
                          && (!task.date || task.date <= today)
                        }
                        onNotToday={() => notTodayTask.mutate(task.id)}
                      />
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </section>
        )}

        {(view === 'all' || view === 'habits') && lens === 'list' && (
          <section className="min-w-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="praxis-kicker">Consistência</p>
                <h2 className="praxis-title text-2xl font-semibold">
                  Hábitos
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    ({filteredHabits.length})
                  </span>
                </h2>
              </div>
            </div>

            {activeHabitsDueToday.length > 0 && (
              <div className="space-y-1.5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Hábitos de hoje</span>
                  <span>
                    {completedHabits} feitos
                    {skippedHabitsToday > 0 ? ` · ${skippedHabitsToday} não rolou` : ''}
                    {habitDayCounts.open > 0 ? ` · ${habitDayCounts.open} abertos` : ''}
                    {' · '}{habitsDayPct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary rail-inset">
                  <div
                    className="h-full rounded-full transition-[width] duration-200 ease-out"
                    style={{
                      width: `${habitsDayPct}%`,
                      background: 'linear-gradient(90deg, hsl(var(--domain-wellness)), hsl(var(--domain-ember)))',
                    }}
                  />
                </div>
              </div>
            )}

            {filteredHabits.length === 0 ? (
              <PraxisEmptyState
                icon={Flame}
                title="Nenhum hábito ainda"
                description="Cadastre hábitos essenciais — simples ou organizados em rotinas."
                action={(
                  <Button
                    onClick={() => { setEditingHabit(null); setShowHabitForm(true); }}
                    className="rounded-full praxis-touch-target"
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Novo hábito
                  </Button>
                )}
              />
            ) : (
              <div className="space-y-3">
                <CompoundHabitsWidget
                  collapsible
                  compounds={openingCompounds}
                  today={today}
                  status="active"
                  variant="list"
                  onEditCompound={(compound) => {
                    setShowHabitForm(false);
                    setEditingHabit(compound);
                  }}
                />
                {orderedFlatHabits.map((habit, index) => {
                  const isSince = habit.tracking_mode === 'since';
                  if (isSince) {
                    return (
                      <SinceHabitCard
                        key={habit.id}
                        habit={habit}
                        trailing={(
                          <HabitRowMenu
                            label={cleanPriorityPrefix(habit.title)}
                            busy={reorderHabits.isPending}
                            disableUp
                            disableDown
                            onMoveUp={() => moveHabit(habit.id, -1)}
                            onMoveDown={() => moveHabit(habit.id, 1)}
                            onEdit={() => {
                              setShowHabitForm(false);
                              setEditingHabit(habit);
                            }}
                            onDelete={() => confirmDeleteHabit(habit)}
                          />
                        )}
                      />
                    );
                  }
                  const outcome = habitDayOutcome(habit.id);
                  const done = outcome === 'done';
                  const skipped = outcome === 'skipped';
                  const dueToday = isHabitDueOnDate(habit, today);
                  const canCheckIn = !isSince && habit.status === 'active' && dueToday;
                  const todayLog = todayLogForHabit(habitLogs, habit.id, today);
                  const quant = isQuantitativeHabit(habit);
                  const sinceDays = habit.days_since ?? habit.current_streak ?? 0;
                  return (
                    <Card
                      key={habit.id}
                      ref={el => { if (el) habitRowRefs.current.set(habit.id, el); else habitRowRefs.current.delete(habit.id); }}
                      className={cn(
                        'card-domain domain-wellness overflow-hidden bg-card/75 transition-colors',
                        isSince && 'border-domain-gold/25 bg-card/85',
                        !isSince && done && 'border-domain-wellness/30 bg-domain-wellness/10',
                        !isSince && skipped && 'border-amber-500/25 bg-amber-500/[0.08]',
                      )}
                    >
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                        {isSince ? (
                          <div className="flex shrink-0 items-center justify-center rounded-full bg-domain-gold/10 text-domain-gold h-8 w-8">
                            <Clock className="h-4 w-4" aria-hidden />
                          </div>
                        ) : canCheckIn ? (
                          <button
                            type="button"
                            onClick={(evt) => {
                              if (skipped) {
                                toggleHabit.mutate({ habitId: habit.id, isDone: true });
                                return;
                              }
                              handleToggleHabit(habit, done, evt);
                            }}
                            disabled={toggleHabit.isPending || skipHabit.isPending}
                            className="shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                            aria-label={
                              skipped
                                ? `Desfazer não rolou — ${cleanPriorityPrefix(habit.title)}`
                                : isQuickIncrementHabit(habit) && !done
                                  ? formatQuickIncrementAriaLabel(habit)
                                  : `${done ? 'Desmarcar' : 'Concluir'} ${cleanPriorityPrefix(habit.title)}`
                            }
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-domain-wellness" />
                            ) : skipped ? (
                              <span className="flex items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 h-5 w-5">
                                <Minus className="h-3 w-3" />
                              </span>
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                        ) : (
                          <div className="shrink-0 h-5 w-5" aria-hidden />
                        )}
                        {!isSince && (
                          <Flame className={cn(
                            'shrink-0 h-5 w-5 text-primary',
                            done && 'text-domain-wellness',
                            skipped && 'text-amber-400/80',
                          )} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p
                              className={cn(
                                'font-semibold leading-snug text-base',
                                !isSince && done && 'text-domain-wellness line-through opacity-80',
                                !isSince && skipped && 'text-muted-foreground opacity-75',
                              )}
                            >
                              {cleanPriorityPrefix(habit.title)}
                            </p>
                            <CategoryBadge category={habit.category} />
                            {!isSince && isQuickIncrementHabit(habit) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuantSheetHabit(habit);
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors',
                                  done
                                    ? 'border-domain-wellness/30 bg-domain-wellness/10 text-domain-wellness'
                                    : 'border-domain-wellness/30 bg-domain-wellness/10 text-domain-wellness hover:bg-domain-wellness/20 hover:border-domain-wellness/50 cursor-pointer',
                                )}
                                title="Clique para ajustar quantidade"
                                aria-label={`Progresso: ${formatHabitProgress(todayLog?.value, habit.target_value, habit.unit)}. Clique para ajustar.`}
                              >
                                {formatHabitProgress(todayLog?.value, habit.target_value, habit.unit)}
                              </button>
                            ) : null}
                            {isSince && (
                              <>
                                <Badge variant="outline" className="border-domain-gold/30 bg-domain-gold/10 text-[11px] font-semibold tabular-nums text-domain-gold">
                                  {sinceDays} {sinceDays === 1 ? 'dia' : 'dias'}
                                </Badge>
                                <span className="rounded-full border border-domain-gold/20 bg-domain-gold/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-domain-gold">
                                  Limpo
                                </span>
                              </>
                            )}
                            {formatPreferredTime(habit.preferred_time) ? (
                              <Badge variant="outline" className="gap-1 border-domain-gold/30 bg-domain-gold/10 text-[10px] text-domain-gold">
                                <Clock className="h-3 w-3" aria-hidden />
                                {formatPreferredTime(habit.preferred_time)}
                              </Badge>
                            ) : null}
                            {!isSince && skipped && (
                              <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-200/90">
                                Não rolou
                                {todayLog?.skip_reason
                                  ? ` · ${SKIP_REASON_LABELS[todayLog.skip_reason] || todayLog.skip_reason}`
                                  : ''}
                              </Badge>
                            )}
                            {!isSince && habit.current_streak > 0 && (
                              <span className="text-[10px] text-orange-400 shrink-0">🔥{habit.current_streak}</span>
                            )}
                          </div>
                          {isSince && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatSinceDatePt(habit.since_date)}
                              {habit.since_line ? ` · ${habit.since_line}` : ''}
                            </p>
                          )}
                          {!isSince && skipped && todayLog?.note ? (
                            <p className="mt-1 text-[11px] leading-snug text-amber-100/75">
                              “{todayLog.note}”
                            </p>
                          ) : null}
                          {!isSince && (
                            <>
                              <Badge variant="outline" className="mt-1.5 text-xs">
                                {formatFrequencyLabel(habit)}
                              </Badge>
                              {quant && todayLog?.value != null && done && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Hoje: {todayLog.value}
                                  {habit.unit ? ` ${habit.unit}` : ''}
                                </p>
                              )}
                              {!dueToday && habit.status === 'active' && (
                                <p className="text-xs text-muted-foreground">Não previsto para hoje</p>
                              )}
                            </>
                          )}
                        </div>
                        {!isSince && canCheckIn && !done && !skipped && isQuickIncrementHabit(habit) ? (
                          <Button
                            type="button"
                            size="sm"
                            className="praxis-touch-target min-h-[44px] min-w-[72px] px-4 font-bold rounded-full bg-domain-wellness/20 text-domain-wellness border border-domain-wellness/30 hover:bg-domain-wellness/30 active:scale-95 transition-all touch-manipulation"
                            disabled={savingHabitId === habit.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickIncrement(habit, e);
                            }}
                            aria-label={formatQuickIncrementAriaLabel(habit)}
                          >
                            {savingHabitId === habit.id ? (
                              <span className="animate-pulse">…</span>
                            ) : (
                              formatQuickIncrementButtonLabel(habit)
                            )}
                          </Button>
                        ) : null}
                        {!isSince && canCheckIn && outcome !== 'skipped' && !isQuickIncrementHabit(habit) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 rounded-full border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-100 hover:bg-amber-500/20"
                            disabled={skipHabit.isPending}
                            onClick={() => skipHabit.mutate({ habitId: habit.id })}
                          >
                            Não rolou
                          </Button>
                        ) : null}
                        {!isSince && canCheckIn && outcome === 'skipped' ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 rounded-full text-[11px] text-muted-foreground hover:text-foreground"
                              disabled={skipHabit.isPending}
                              onClick={() => setSkipSheetHabit(habit)}
                            >
                              Nomear
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 rounded-full text-[11px]"
                              disabled={toggleHabit.isPending}
                              onClick={() => toggleHabit.mutate({ habitId: habit.id, isDone: true })}
                            >
                              Desfazer
                            </Button>
                          </div>
                        ) : null}
                        <HabitRowMenu
                          label={cleanPriorityPrefix(habit.title)}
                          busy={reorderHabits.isPending || skipHabit.isPending || savingHabitId === habit.id}
                          canCheckIn={canCheckIn}
                          dayOutcome={outcome}
                          disableUp={index === 0}
                          disableDown={index === checkHabits.length - 1}
                          onMoveUp={() => moveHabit(habit.id, -1)}
                          onMoveDown={() => moveHabit(habit.id, 1)}
                          onEdit={() => { setShowHabitForm(false); setEditingHabit(habit); }}
                          onDelete={() => confirmDeleteHabit(habit)}
                          onNaoRolou={() => skipHabit.mutate({ habitId: habit.id })}
                          onNomear={() => setSkipSheetHabit(habit)}
                          onUndoDayOutcome={() => toggleHabit.mutate({ habitId: habit.id, isDone: true })}
                          onAdjustQuantity={isQuantitativeHabit(habit) ? () => setQuantSheetHabit(habit) : undefined}
                          hasValue={todayLog?.value != null && Number(todayLog.value) > 0}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
                <CompoundHabitsWidget
                  collapsible
                  compounds={closingCompounds}
                  today={today}
                  status="active"
                  variant="list"
                  onEditCompound={(compound) => {
                    setShowHabitForm(false);
                    setEditingHabit(compound);
                  }}
                />
              </div>
            )}
          </section>
        )}
      </div>
      )}

      <Dialog
        open={showTaskForm}
        onOpenChange={(open) => {
          setShowTaskForm(open);
          if (!open) setCreateTaskInitial(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <TaskForm
            key={createTaskInitial ? (createTaskInitial.date || '') + '_' + (createTaskInitial.time || '') : 'new-task'}
            initial={createTaskInitial || {}}
            onSubmit={(data) => createTask.mutate(data)}
            onCancel={() => {
              setShowTaskForm(false);
              setCreateTaskInitial(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingTask)} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar tarefa</DialogTitle></DialogHeader>
          {editingTask && (
            <TaskForm
              initial={editingTask}
              onSubmit={(data) => updateTask.mutate({ id: editingTask.id, data })}
              onCancel={() => setEditingTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHabitForm} onOpenChange={setShowHabitForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Novo hábito</DialogTitle></DialogHeader>
          <HabitForm
            key="habit-create"
            onSubmit={(data) => createHabit.mutate(data)}
            onCancel={() => setShowHabitForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingHabit)} onOpenChange={(open) => { if (!open) setEditingHabit(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingHabit?.kind === 'compound' ? 'Editar rotina' : 'Editar hábito'}</DialogTitle>
          </DialogHeader>
          {editingHabit && (
            <HabitForm
              key={editingHabit.id}
              initial={editingHabit}
              onSubmit={(data) => updateHabit.mutate({ id: editingHabit.id, data })}
              onCancel={() => setEditingHabit(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(taskPendingDelete)}
        onOpenChange={(open) => { if (!open) setTaskPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskPendingDelete && (
                <>
                  "{cleanPriorityPrefix(taskPendingDelete.title)}"
                  {taskPendingDelete.status === 'pending' || taskPendingDelete.status === 'in_progress'
                    ? ' está aberta e será excluída.'
                    : ' será excluída.'}{' '}
                  Isso não pode ser desfeito.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => {
                if (taskPendingDelete) deleteTask.mutate(taskPendingDelete.id);
                setTaskPendingDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(habitPendingDelete)}
        onOpenChange={(open) => { if (!open) setHabitPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir hábito?</AlertDialogTitle>
            <AlertDialogDescription>
              {habitPendingDelete && (
                <>
                  "{cleanPriorityPrefix(habitPendingDelete.title)}" será excluído permanentemente, junto com todos
                  os check-ins e o histórico de streak. Isso não pode ser desfeito.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => {
                if (habitPendingDelete) deleteHabit.mutate(habitPendingDelete.id);
                setHabitPendingDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskBulkArchiveDialog
        open={bulkArchiveOpen}
        onOpenChange={setBulkArchiveOpen}
        tasks={bulkArchivePool}
        busy={bulkArchiveTasks.isPending}
        onConfirm={(ids) => bulkArchiveTasks.mutate(ids)}
      />

      <NoiseCleanupDialog
        open={noiseDialogOpen}
        onOpenChange={setNoiseDialogOpen}
        tasks={noiseTasks}
        busy={bulkCancelTasks.isPending}
        onConfirm={(ids) => bulkCancelTasks.mutate(ids)}
      />

      <SkipHabitSheet
        open={Boolean(skipSheetHabit)}
        onOpenChange={(open) => { if (!open) setSkipSheetHabit(null); }}
        habitTitle={skipSheetHabit ? cleanPriorityPrefix(skipSheetHabit.title) : 'Hábito'}
        outcome={skipSheetHabit ? habitDayOutcome(skipSheetHabit.id) : 'open'}
        initialNote={
          skipSheetHabit
            ? (todayLogForHabit(habitLogs, skipSheetHabit.id, today)?.note || '')
            : ''
        }
        busy={skipHabit.isPending}
        onConfirm={({ skipReason, skipNote }) =>
          skipHabit.mutate({ habitId: skipSheetHabit.id, skipReason, skipNote })
        }
        onUndo={() => {
          if (!skipSheetHabit) return;
          toggleHabit.mutate({ habitId: skipSheetHabit.id, isDone: true });
          setSkipSheetHabit(null);
        }}
        onMarkDone={() => {
          if (!skipSheetHabit) return;
          const h = skipSheetHabit;
          setSkipSheetHabit(null);
          if (isQuantitativeHabit(h)) {
            setQuantSheetHabit(h);
            return;
          }
          toggleHabit.mutate({ habitId: h.id, isDone: false });
        }}
      />

      <QuantLogSheet
        open={Boolean(quantSheetHabit)}
        onOpenChange={(open) => {
          if (!open) setQuantSheetHabit(null);
        }}
        habit={quantSheetHabit}
        currentValue={
          quantSheetHabit
            ? todayLogForHabit(habitLogs, quantSheetHabit.id, today)?.value
            : undefined
        }
        busy={toggleHabit.isPending}
        onConfirm={(value) => {
          if (!quantSheetHabit) return;
          const habitId = quantSheetHabit.id;
          setQuantSheetHabit(null);
          toggleHabit.mutate({ habitId, isDone: false, value });
        }}
      />

    </div>
  );
}
