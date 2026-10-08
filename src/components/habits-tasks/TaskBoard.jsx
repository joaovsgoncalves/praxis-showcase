import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { BOARD_COLUMNS, tasksForBoardColumn, moveTaskToColumn } from '@/lib/taskLenses';
import TaskBoardCard from './TaskBoardCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLUMN_CONFIG = {
  inbox: {
    id: 'inbox',
    title: 'Caixa',
    emptyText: 'Nenhuma tarefa na caixa.',
  },
  todo: {
    id: 'todo',
    title: 'A fazer',
    emptyText: 'Nenhuma tarefa a fazer.',
  },
  doing: {
    id: 'doing',
    title: 'Andamento',
    emptyText: 'Nenhuma em andamento.',
  },
  done: {
    id: 'done',
    title: 'Feito',
    emptyText: 'Todas as tarefas concluídas.',
  },
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      setIsDesktop(mql.matches);
    };
    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

export default function TaskBoard({
  tasks = [],
  allTasks = [],
  today,
  onUpdateTask,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onNotToday,
  onOpenCreateTask,
}) {
  const isDesktop = useIsDesktop();
  const isDragDisabled = !isDesktop;

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const task = tasks.find((t) => String(t.id) === String(draggableId));
    if (!task) return;

    const patch = moveTaskToColumn(task, destination.droppableId, today);
    if (Object.keys(patch).length === 0) return;
    onUpdateTask?.(task.id, patch);
  };

  const handleMoveToColumn = (task, targetColumn) => {
    const patch = moveTaskToColumn(task, targetColumn, today);
    if (Object.keys(patch).length === 0) return;
    onUpdateTask?.(task.id, patch);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="praxis-scroll-x flex gap-3 overflow-x-auto pb-4 pt-1 xl:grid xl:grid-cols-4 xl:gap-3.5 xl:overflow-visible">
        {BOARD_COLUMNS.map((columnId) => {
          const colConfig = COLUMN_CONFIG[columnId];
          const columnTasks = tasksForBoardColumn(tasks, columnId, today);

          return (
            <div
              key={columnId}
              className="flex w-[min(280px,85vw)] shrink-0 min-w-[240px] flex-col rounded-2xl border border-white/[0.06] bg-[#12151c]/90 p-3 xl:w-auto xl:min-w-[240px] xl:flex-1"
            >
              {/* Header da coluna: Título + Badge contagem + Botão + */}
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight text-stone-100">
                    {colConfig.title}
                  </span>
                  <span className="rounded-md bg-stone-800/80 px-1.5 py-0.5 text-xs font-mono tabular-nums text-stone-400">
                    {columnTasks.length}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-white/10 transition-colors"
                  onClick={() => onOpenCreateTask?.(columnId)}
                  aria-label={'Adicionar tarefa em ' + colConfig.title}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Lista de cartões */}
              <Droppable droppableId={columnId} isDropDisabled={isDragDisabled}>
                {(droppableProvided, droppableSnapshot) => (
                  <div
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    className={cn(
                      'flex-1 min-h-[140px] space-y-2 rounded-xl p-0.5 transition-colors',
                      droppableSnapshot.isDraggingOver && 'bg-white/[0.02] ring-1 ring-white/10'
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={String(task.id)}
                        index={index}
                        isDragDisabled={isDragDisabled}
                      >
                        {(draggableProvided, draggableSnapshot) => (
                          <TaskBoardCard
                            task={task}
                            today={today}
                            currentColumn={columnId}
                            allTasks={allTasks.length > 0 ? allTasks : tasks}
                            isDragDisabled={isDragDisabled}
                            dragProvided={draggableProvided}
                            snapshot={draggableSnapshot}
                            onToggleComplete={onToggleComplete}
                            onMoveToColumn={handleMoveToColumn}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            onNotToday={onNotToday}
                          />
                        )}
                      </Draggable>
                    ))}
                    {droppableProvided.placeholder}
                    {columnTasks.length === 0 && !droppableSnapshot.isDraggingOver && (
                      <div className="flex items-center justify-center py-8 text-center">
                        <p className="text-xs text-muted-foreground/45">{colConfig.emptyText}</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
