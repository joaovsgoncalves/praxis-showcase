/**
 * Portuguese display names for the English exercise catalog.
 * Phrase replacements first, then word map. Never touches custom names.
 */

const PHRASES = [
  ['barbell close-grip bench press', 'supino pegada fechada com barra'],
  ['barbell decline bench press', 'supino declinado com barra'],
  ['barbell incline bench press', 'supino inclinado com barra'],
  ['barbell guillotine bench press', 'supino guilhotina com barra'],
  ['dumbbell incline bench press', 'supino inclinado com halteres'],
  ['dumbbell decline bench press', 'supino declinado com halteres'],
  ['dumbbell close-grip bench press', 'supino pegada fechada com halteres'],
  ['band bench press', 'supino com elástico'],
  ['barbell bench press', 'supino reto com barra'],
  ['dumbbell bench press', 'supino reto com halteres'],
  ['incline bench press', 'supino inclinado'],
  ['decline bench press', 'supino declinado'],
  ['close-grip bench press', 'supino pegada fechada'],
  ['close grip bench press', 'supino pegada fechada'],
  ['bench press', 'supino'],
  ['romanian deadlift', 'terra romeno'],
  ['stiff leg deadlift', 'stiff'],
  ['deadlift', 'levantamento terra'],
  ['lat pulldown', 'puxada alta'],
  ['pulldown', 'puxada'],
  ['face pull', 'face pull'],
  ['cable fly', 'crucifixo na polia'],
  ['chest fly', 'crucifixo'],
  ['dumbbell fly', 'crucifixo com halteres'],
  ['front raise', 'elevação frontal'],
  ['lateral raise', 'elevação lateral'],
  ['side raise', 'elevação lateral'],
  ['calf raise', 'panturrilha'],
  ['hip thrust', 'elevação de quadril'],
  ['leg press', 'leg press'],
  ['leg curl', 'mesa flexora'],
  ['leg extension', 'cadeira extensora'],
  ['skull crusher', 'tríceps testa'],
  ['triceps extension', 'extensão de tríceps'],
  ['triceps pushdown', 'tríceps pulley'],
  ['biceps curl', 'rosca direta'],
  ['hammer curl', 'rosca martelo'],
  ['preacher curl', 'rosca scott'],
  ['concentration curl', 'rosca concentrada'],
  ['wrist curl', 'rosca de punho'],
  ['overhead press', 'desenvolvimento'],
  ['shoulder press', 'desenvolvimento'],
  ['military press', 'desenvolvimento militar'],
  ['push press', 'push press'],
  ['pull-up', 'barra fixa'],
  ['pull up', 'barra fixa'],
  ['chin-up', 'barra supinada'],
  ['chin up', 'barra supinada'],
  ['push-up', 'flexão'],
  ['push up', 'flexão'],
  ['sit-up', 'abdominal'],
  ['sit up', 'abdominal'],
  ['back extension', 'extensão lombar'],
  ['hip extension', 'extensão de quadril'],
  ['bent-over row', 'remada curvada'],
  ['bent over row', 'remada curvada'],
  ['seated row', 'remada sentada'],
  ['upright row', 'remada alta'],
  ['t bar row', 'remada cavalinho'],
  ['t-bar row', 'remada cavalinho'],
  ['one arm', 'unilateral'],
  ['one-arm', 'unilateral'],
  ['wide grip', 'pegada aberta'],
  ['wide-grip', 'pegada aberta'],
  ['close grip', 'pegada fechada'],
  ['close-grip', 'pegada fechada'],
  ['neutral grip', 'pegada neutra'],
  ['overhand grip', 'pegada pronada'],
  ['underhand grip', 'pegada supinada'],
  ['smith machine', 'smith'],
  ['leverage machine', 'máquina'],
  ['stability ball', 'bola suíça'],
  ['medicine ball', 'medicine ball'],
  ['ez barbell', 'barra W'],
  ['ez-bar', 'barra W'],
  ['trap bar', 'barra hexagonal'],
  ['wheel roller', 'roda abdominal'],
  ['body weight', 'peso corporal'],
  ['front lever', 'front lever'],
  ['back lever', 'back lever'],
  ['muscle up', 'muscle-up'],
  ['muscle-up', 'muscle-up'],
  ['russian twist', 'rotação russa'],
  ['leg raise', 'elevação de pernas'],
  ['knee raise', 'elevação de joelhos'],
  ['glute bridge', 'ponte de glúteo'],
  ['good morning', 'good morning'],
  ['face pull', 'face pull'],
];

const WORDS = {
  barbell: 'barra',
  dumbbell: 'halter',
  dumbbells: 'halteres',
  cable: 'polia',
  band: 'elástico',
  kettlebell: 'kettlebell',
  smith: 'smith',
  leverage: 'máquina',
  machine: 'máquina',
  seated: 'sentado',
  standing: 'em pé',
  lying: 'deitado',
  prone: 'deitado',
  incline: 'inclinado',
  decline: 'declinado',
  reverse: 'invertido',
  alternating: 'alternado',
  alternate: 'alternado',
  assisted: 'assistido',
  weighted: 'com carga',
  stretch: 'alongamento',
  stretching: 'alongamento',
  squat: 'agachamento',
  squats: 'agachamento',
  lunge: 'afundo',
  lunges: 'afundo',
  row: 'remada',
  rows: 'remada',
  curl: 'rosca',
  curls: 'rosca',
  press: 'press',
  raise: 'elevação',
  raises: 'elevação',
  fly: 'crucifixo',
  flye: 'crucifixo',
  flyes: 'crucifixo',
  dip: 'paralela',
  dips: 'paralelas',
  crunch: 'abdominal',
  crunches: 'abdominal',
  plank: 'prancha',
  shrug: 'encolhimento',
  pullover: 'pullover',
  kickback: 'kickback',
  extension: 'extensão',
  hyperextension: 'hiperextensão',
  twist: 'rotação',
  jump: 'salto',
  jumps: 'saltos',
  step: 'step',
  circle: 'círculo',
  circles: 'círculos',
  hold: 'isometria',
  hanging: 'suspenso',
  chest: 'peito',
  back: 'costas',
  shoulder: 'ombro',
  shoulders: 'ombros',
  biceps: 'bíceps',
  triceps: 'tríceps',
  forearm: 'antebraço',
  forearms: 'antebraço',
  glute: 'glúteo',
  glutes: 'glúteos',
  hamstring: 'posterior',
  hamstrings: 'posteriores',
  quad: 'quadríceps',
  quads: 'quadríceps',
  calf: 'panturrilha',
  calves: 'panturrilhas',
  abs: 'abdômen',
  abdominal: 'abdominal',
  oblique: 'oblíquo',
  obliques: 'oblíquos',
  hip: 'quadril',
  hips: 'quadril',
  neck: 'pescoço',
  wrist: 'punho',
  wrists: 'punhos',
  knee: 'joelho',
  knees: 'joelhos',
  heel: 'calcanhar',
  toe: 'ponta do pé',
  side: 'lateral',
  front: 'frontal',
  rear: 'posterior',
  upper: 'superior',
  lower: 'inferior',
  inner: 'interno',
  outer: 'externo',
  single: 'unilateral',
  double: 'duplo',
  full: 'completo',
  half: 'meio',
  bent: 'flexionado',
  straight: 'esticado',
  wide: 'aberto',
  close: 'fechado',
  high: 'alto',
  low: 'baixo',
  with: 'com',
  on: 'no',
  and: 'e',
  the: '',
  a: '',
  an: '',
  of: 'de',
  to: '',
  for: 'para',
  from: 'de',
  male: '',
  female: '',
  version: '',
};

function titlePt(s) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function translateExerciseNameToPt(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
  if (!s) return '';

  for (const [en, pt] of PHRASES) {
    s = s.replaceAll(en, pt);
  }

  s = s
    .split(/(\s+|[()[\],/])/)
    .map((tok) => {
      if (!tok || /^[\s()[\],/]+$/.test(tok)) return tok;
      const key = tok.replace(/\.+$/, '');
      if (Object.prototype.hasOwnProperty.call(WORDS, key)) return WORDS[key];
      return tok;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

  return titlePt(s);
}

export function displayExerciseName(exercise) {
  if (!exercise) return 'Exercício';
  if (typeof exercise === 'string') return exercise;
  const pt = (exercise.name_pt || exercise.display_name || '').trim();
  if (pt) return pt;
  const name = (exercise.exercise_name_snapshot || exercise.exercise_name || exercise.name || '').trim();
  if (exercise.source === 'catalog' || exercise.is_custom === 0) {
    return translateExerciseNameToPt(name) || name || 'Exercício';
  }
  return name || 'Exercício';
}
