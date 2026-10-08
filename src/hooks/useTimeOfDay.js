import { useEffect, useState } from 'react';

// Phases used by the dashboard to rearrange and re-emphasize widgets.
export function getTimeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'late_night';
  if (h < 11) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 22) return 'evening';
  return 'late_night';
}

const GREETING = {
  morning: { greeting: 'Bom dia', emoji: '🌅' },
  afternoon: { greeting: 'Boa tarde', emoji: '☀️' },
  evening: { greeting: 'Boa noite', emoji: '🌙' },
  late_night: { greeting: 'Tá tarde', emoji: '💤' },
};

/**
 * Frases estoicas / memento mori — uma por hora do dia (ciclo estável).
 * Índice = dia do ano * 24 + hora, pra não repetir a mesma o dia inteiro
 * e mudar de verdade a cada hora que passa.
 */
export const STOIC_HOURLY_LINES = [
  'Memento mori. O dia não volta.',
  'Você não é o que planeja. É o que executa.',
  'A morte chega. Até lá, faça o que importa.',
  'O tempo gasta você. Gaste ele de volta com intenção.',
  'Disciplina é liberdade com nome adulto.',
  'Menos desculpa. Mais próximo passo.',
  'O que você evita agora cobra juros depois.',
  'Ação pequena hoje vence intenção grande amanhã.',
  'Você não controla o vento. Controla a vela.',
  'O corpo morre. O caráter você constrói agora.',
  'Pare de ensaiar a vida. Entre em cena.',
  'Um dia bem feito vale mais que mil planos.',
  'A pressa fútil é fuga. O foco é respeito ao tempo.',
  'Se dói e é certo, ainda é o caminho.',
  'Nada é seu pra sempre — nem essa hora.',
  'Faça o difícil enquanto ainda dá pra escolher.',
  'A mente mente. O ato mostra quem você é.',
  'Hoje é o único material que você tem.',
  'Não peça mais tempo. Use o que sobrou.',
  'Virtude sem prática é pose.',
  'O túmulo não lê sua lista de intenções.',
  'Resista ao fácil quando o fácil te enfraquece.',
  'Comece antes de se sentir pronto.',
  'Memento vivere: viva como se importasse.',
  'A calma também se treina — com trabalho feito.',
  'O futuro é devedor. Pague com ação presente.',
  'Corte o ruído. Fique com o essencial.',
  'Sua atenção é o bem mais caro do dia.',
  'Não espere motivação. Crie movimento.',
  'A morte é certa. A mediocridade é opcional.',
  'Seja severo com a desculpa, gentil com o esforço.',
  'O dia pede presença, não perfeição.',
  'O que você repete, você se torna.',
  'Tempo ocioso sem descanso é desperdício disfarçado.',
  'Olhe a hora. Ela não espera você amadurecer.',
  'Faça uma coisa difícil antes do conforto.',
];

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Frase estável para a hora civil atual (muda só na virada da hora). */
export function getStoicHourlyLine(date = new Date()) {
  const idx = (dayOfYear(date) * 24 + date.getHours()) % STOIC_HOURLY_LINES.length;
  return STOIC_HOURLY_LINES[idx];
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatClockTime(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function snapshot(date = new Date()) {
  const tod = getTimeOfDay(date);
  return {
    tod,
    ...GREETING[tod],
    tagline: getStoicHourlyLine(date),
    clock: formatClockTime(date),
    hourKey: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`,
  };
}

/**
 * Greeting + relógio + frase estoica da hora.
 * Atualiza no próximo minuto inteiro e a cada 30s depois (hora e frase em sync).
 */
export function useTimeOfDay() {
  const [state, setState] = useState(() => snapshot());

  useEffect(() => {
    let intervalId = 0;
    const tick = () => setState(snapshot());

    // alinha no próximo minuto pra hora virar redonda
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 30 * 1000);
    }, Math.max(250, msToNextMinute));

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
