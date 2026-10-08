import assert from 'node:assert/strict';
import { pickTodayPriorities } from './todayPriorities.js';

const today = '2026-08-24';
const task = (id, title, extra = {}) => ({ id, title, status: 'pending', ...extra });

const recorte = pickTodayPriorities([
  task('rca', 'Preparar RCA de seg–qua', { category: 'farmacia', date: today, time: '14:30', priority: 'high' }),
  task('cartinha', 'Escrever cartinha', { category: 'pessoal', date: today, priority: 'high' }),
  task('animalia', 'Animália — um bloco só', { category: 'gofluxo', date: today, priority: 'high' }),
], today);
assert.deepEqual(Object.fromEntries(Object.entries(recorte).map(([key, value]) => [key, value?.id])), {
  renda: 'rca', avanco: 'animalia', obrigatorio: 'cartinha',
});

const filtered = pickTodayPriorities([
  task('future', 'Futura', { category: 'farmacia', date: '2026-08-25' }),
  task('idea', 'Ideia', { category: 'ideias', date: today }),
  task('inbox', 'Sem data', { category: 'pessoal' }),
], today);
assert.deepEqual(filtered, { obrigatorio: null, renda: null, avanco: null });

const unique = pickTodayPriorities([
  task('same', 'Farmácia must', { category: 'farmacia', date: today, priority: 'high' }),
  task('next', 'Outro must', { category: 'pessoal', date: today, time: '10:00' }),
], today);
assert.equal(unique.renda.id, 'same');
assert.equal(unique.obrigatorio.id, 'next');
assert.notEqual(unique.renda.id, unique.obrigatorio.id);

assert.deepEqual(pickTodayPriorities([], today), { obrigatorio: null, renda: null, avanco: null });
const onlyFarmacia = pickTodayPriorities([
  task('farmacia', 'Única tarefa', { category: 'farmacia', date: today }),
], today);
assert.equal(onlyFarmacia.renda.id, 'farmacia');
assert.equal(onlyFarmacia.obrigatorio, null);

console.log('todayPriorities.test.mjs: ok');
