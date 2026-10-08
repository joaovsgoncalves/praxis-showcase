/** Normaliza ?tab= para Hábitos & Tarefas */
export function habitTasksTabFromSearchParams(searchParams) {
  const tab = searchParams.get('tab');
  if (tab === 'habits' || tab === 'tasks') return tab;
  return 'all';
}

export function setHabitTasksTabInSearchParams(searchParams, view) {
  const next = new URLSearchParams(searchParams);
  if (view === 'all') next.delete('tab');
  else next.set('tab', view);
  return next;
}

export function stripQueryParam(searchParams, key) {
  const next = new URLSearchParams(searchParams);
  next.delete(key);
  return next;
}

const TASK_SCOPES = new Set(['today', 'inbox', 'week', 'overdue', 'all']);

export function taskScopeFromSearchParams(searchParams) {
  const scope = searchParams.get('scope');
  return TASK_SCOPES.has(scope) ? scope : 'today';
}

export function setTaskScopeInSearchParams(searchParams, scope) {
  const next = new URLSearchParams(searchParams);
  if (!scope || scope === 'today') next.delete('scope');
  else next.set('scope', scope);
  return next;
}

const TASK_LENSES = new Set(['list', 'board', 'week']);

export function taskLensFromSearchParams(searchParams) {
  const lens = searchParams.get('lens');
  return TASK_LENSES.has(lens) ? lens : 'list';
}

export function setTaskLensInSearchParams(searchParams, lens) {
  const next = new URLSearchParams(searchParams);
  if (!lens || lens === 'list') next.delete('lens');
  else next.set('lens', lens);
  return next;
}
