import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TASK_LENSES,
  BOARD_COLUMNS,
  isInboxTask,
  boardColumnForTask,
  tasksForBoardColumn,
  moveTaskToColumn,
  weekRange,
  taskBlock,
} from '../src/lib/taskLenses.js';
import {
  TASK_SCOPE_CHIPS,
  filterTasksByScope,
  countOpenInbox,
  filterTasksForListPresentation,
  sortTasksForList,
} from '../src/lib/taskListFilters.js';
import {
  taskScopeFromSearchParams,
  setTaskScopeInSearchParams,
  taskLensFromSearchParams,
  setTaskLensInSearchParams,
} from '../src/lib/urlDeepLinks.js';

describe('taskLenses - PRD Fase 0', () => {
  // Caso 1: Aberta sem data → inbox
  it('1. maps open task without date to inbox', () => {
    const pendingNoDate = { id: 't1', status: 'pending', date: null };
    const inProgressNoDate = { id: 't2', status: 'in_progress', date: '' };

    assert.equal(isInboxTask(pendingNoDate), true);
    assert.equal(isInboxTask(inProgressNoDate), true);
    assert.equal(boardColumnForTask(pendingNoDate, '2026-08-24'), 'inbox');
    assert.equal(boardColumnForTask(inProgressNoDate, '2026-08-24'), 'inbox');
  });

  // Caso 2: pending com data → todo
  it('2. maps pending task with date to todo', () => {
    const pendingWithDate = { id: 't3', status: 'pending', date: '2026-08-24' };
    assert.equal(isInboxTask(pendingWithDate), false);
    assert.equal(boardColumnForTask(pendingWithDate, '2026-08-24'), 'todo');
  });

  // Caso 3: in_progress com data → doing
  it('3. maps in_progress task with date to doing', () => {
    const inProgressWithDate = { id: 't4', status: 'in_progress', date: '2026-08-24' };
    assert.equal(isInboxTask(inProgressWithDate), false);
    assert.equal(boardColumnForTask(inProgressWithDate, '2026-08-24'), 'doing');
  });

  // Caso 4: completed com completed_date=hoje → done; ontem → fora do quadro
  it('4. maps completed task completed today to done, and completed yesterday outside board', () => {
    const doneToday = {
      id: 't5',
      status: 'completed',
      date: '2026-08-24',
      completed_date: '2026-08-24',
    };
    const doneYesterday = {
      id: 't6',
      status: 'completed',
      date: '2026-08-23',
      completed_date: '2026-08-23',
    };

    assert.equal(boardColumnForTask(doneToday, '2026-08-24'), 'done');
    assert.equal(boardColumnForTask(doneYesterday, '2026-08-24'), null);
  });

  // Caso 5: Ideia aberta → fora do quadro
  it('5. excludes ideas from board columns', () => {
    const ideaOpenNoDate = { id: 't7', status: 'pending', category: 'ideias', date: null };
    const ideaOpenWithDate = { id: 't8', status: 'pending', category: 'ideias', date: '2026-08-24' };

    assert.equal(boardColumnForTask(ideaOpenNoDate, '2026-08-24'), null);
    assert.equal(boardColumnForTask(ideaOpenWithDate, '2026-08-24'), null);
  });

  // Caso 6: moveTaskToColumn(inbox→todo) em 24/08 → { date: '2026-08-24' }
  it('6. moveTaskToColumn(inbox -> todo) sets date to today', () => {
    const inboxTask = { id: 't9', status: 'pending', date: null };
    const patch = moveTaskToColumn(inboxTask, 'todo', '2026-08-24');
    assert.deepEqual(patch, { date: '2026-08-24' });
  });

  // Caso 7: moveTaskToColumn(todo→inbox) → { date: null, time: null }
  it('7. moveTaskToColumn(todo -> inbox) clears date and time', () => {
    const todoTask = { id: 't10', status: 'pending', date: '2026-08-24', time: '10:00' };
    const patch = moveTaskToColumn(todoTask, 'inbox', '2026-08-24');
    assert.deepEqual(patch, { date: null, time: null });
  });

  // Caso 8: weekRange('2026-08-24') → 24/08 (seg) … 30/08 (dom)
  it('8. weekRange computes monday to sunday range', () => {
    const range = weekRange('2026-08-24');
    assert.equal(range.start, '2026-08-24');
    assert.equal(range.end, '2026-08-30');
    assert.equal(range.days?.length, 7);
    assert.equal(range.days[0], '2026-08-24');
    assert.equal(range.days[6], '2026-08-30');

    // Mid-week check (Wednesday 2026-08-26)
    const midWeek = weekRange('2026-08-26');
    assert.equal(midWeek.start, '2026-08-24');
    assert.equal(midWeek.end, '2026-08-30');

    // Sunday check (2026-08-30)
    const sunday = weekRange('2026-08-30');
    assert.equal(sunday.start, '2026-08-24');
    assert.equal(sunday.end, '2026-08-30');
  });

  // Additional checks for exports & helper contracts
  it('checks constants and additional column moves', () => {
    assert.deepEqual(TASK_LENSES, ['list', 'board', 'week']);
    assert.deepEqual(BOARD_COLUMNS, ['inbox', 'todo', 'doing', 'done']);

    // move to doing
    const fromTodo = { id: 't11', status: 'pending', date: '2026-08-24' };
    assert.deepEqual(moveTaskToColumn(fromTodo, 'doing', '2026-08-24'), { status: 'in_progress' });

    // move to done
    assert.deepEqual(moveTaskToColumn(fromTodo, 'done', '2026-08-24'), { status: 'completed' });

    // tasksForBoardColumn
    const tasks = [
      { id: '1', status: 'pending', date: null },
      { id: '2', status: 'pending', date: '2026-08-24' },
      { id: '3', status: 'in_progress', date: '2026-08-24' },
      { id: '4', status: 'completed', completed_date: '2026-08-24' },
      { id: '5', status: 'pending', category: 'ideias', date: null },
    ];
    assert.deepEqual(tasksForBoardColumn(tasks, 'inbox', '2026-08-24').map(t => t.id), ['1']);
    assert.deepEqual(tasksForBoardColumn(tasks, 'todo', '2026-08-24').map(t => t.id), ['2']);
    assert.deepEqual(tasksForBoardColumn(tasks, 'doing', '2026-08-24').map(t => t.id), ['3']);
    assert.deepEqual(tasksForBoardColumn(tasks, 'done', '2026-08-24').map(t => t.id), ['4']);
  });

  // taskBlock contract
  it('taskBlock returns block if task has time, null otherwise', () => {
    const timedTask = { id: 't12', date: '2026-08-24', time: '15:00', duration_minutes: 60 };
    assert.deepEqual(taskBlock(timedTask), {
      date: '2026-08-24',
      start: '15:00',
      end: '16:00',
    });

    const untimedTask = { id: 't13', date: '2026-08-24', time: null };
    assert.equal(taskBlock(untimedTask), null);

    const emptyTimeTask = { id: 't14', date: '2026-08-24', time: '' };
    assert.equal(taskBlock(emptyTimeTask), null);
  });

  // taskListFilters extensions
  it('taskListFilters supports inbox scope and chip', () => {
    assert.ok(TASK_SCOPE_CHIPS.some(chip => chip.id === 'inbox' && chip.label === 'Caixa'));

    const sampleTasks = [
      { id: 'inbox-1', status: 'pending', date: null },
      { id: 'today-1', status: 'pending', date: '2026-08-24' },
      { id: 'done-1', status: 'completed', completed_date: '2026-08-24' },
      { id: 'cancelled-1', status: 'cancelled', date: null },
    ];

    const inboxTasks = filterTasksByScope(sampleTasks, 'inbox', '2026-08-24');
    assert.deepEqual(inboxTasks.map(t => t.id), ['inbox-1']);
    assert.equal(countOpenInbox(sampleTasks), 1);
  });

  it('today list keeps tasks completed today instead of dropping the green check', () => {
    const today = '2026-09-02';
    const tasks = [
      { id: 'open', status: 'pending', date: today, category: 'farmacia' },
      { id: 'done-today', status: 'completed', date: today, completed_date: today, category: 'pessoal' },
      { id: 'done-yesterday', status: 'completed', date: '2026-09-01', completed_date: '2026-09-01', category: 'pessoal' },
      { id: 'cancelled', status: 'cancelled', date: today, category: 'pessoal' },
    ];

    const scoped = filterTasksByScope(tasks, 'today', today);
    const visible = filterTasksForListPresentation(scoped, 'all', today);

    assert.deepEqual(visible.map((t) => t.id).sort(), ['done-today', 'open']);
  });

  it('completed tasks group at the top in green, open tasks stay below', () => {
    const today = '2026-09-02';
    const tasks = [
      { id: 'nota', status: 'completed', date: today, completed_date: today, sort_order: 1, time: '14:10' },
      { id: 'email', status: 'pending', date: today, sort_order: 2, time: '14:35' },
      { id: 'gofluxo', status: 'completed', date: today, completed_date: today, sort_order: 3, time: '15:00' },
      { id: 'rca', status: 'pending', date: today, sort_order: 4, time: '15:10' },
    ];

    const ordered = [...tasks].sort((a, b) => sortTasksForList(a, b, today));
    assert.deepEqual(ordered.map((t) => t.id), ['nota', 'gofluxo', 'email', 'rca']);
  });

  // urlDeepLinks extensions
  it('urlDeepLinks supports lens and inbox scope', () => {
    const params1 = new URLSearchParams('tab=tasks&lens=board&scope=inbox');
    assert.equal(taskLensFromSearchParams(params1), 'board');
    assert.equal(taskScopeFromSearchParams(params1), 'inbox');

    const nextLens = setTaskLensInSearchParams(params1, 'list');
    assert.equal(nextLens.get('lens'), null);

    const nextLensWeek = setTaskLensInSearchParams(params1, 'week');
    assert.equal(nextLensWeek.get('lens'), 'week');

    const paramsDefault = new URLSearchParams();
    assert.equal(taskLensFromSearchParams(paramsDefault), 'list');

    const nextScope = setTaskScopeInSearchParams(paramsDefault, 'inbox');
    assert.equal(nextScope.get('scope'), 'inbox');
  });
});
