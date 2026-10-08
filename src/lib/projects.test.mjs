import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRONT_STATUS_LABELS,
  GUIDANCE_REASON_LABELS,
  formatGuidanceTime,
  formatGuidanceReason,
  buildFrontsViewModel,
  findProjectForGuidancePriority,
} from './projects.js';

test('FRONT_STATUS_LABELS maps columns to human readable visual labels', () => {
  assert.equal(FRONT_STATUS_LABELS.andando, 'Em curso');
  assert.equal(FRONT_STATUS_LABELS.radar, 'Depois');
  assert.equal(FRONT_STATUS_LABELS.aguardando, 'Aguardando');
  assert.equal(FRONT_STATUS_LABELS.pausado, 'Pausado');
});

test('formatGuidanceReason returns human reason or reason code label', () => {
  assert.equal(
    formatGuidanceReason({ reason: 'Entrega do cliente', reason_code: 'client_commitment' }),
    'Entrega do cliente'
  );
  assert.equal(
    formatGuidanceReason({ reason: '', reason_code: 'client_commitment' }),
    'Compromisso com cliente'
  );
  assert.equal(
    formatGuidanceReason({ reason: '', reason_code: 'deadline' }),
    'Prazo'
  );
});

test('buildFrontsViewModel groups roots into Trabalho, Formacao and Construcao propria', () => {
  const sampleProjects = [
    { id: '1', slug: 'rca', name: 'RCA', kind: 'trabalho', column: 'andando' },
    { id: '2', slug: 'gofluxo', name: 'GoFluxo', kind: 'trabalho', column: 'radar' },
    { id: '3', slug: 'animalia', name: 'Animália', kind: 'cliente', parent_slug: 'gofluxo', column: 'andando' },
    { id: '4', slug: 'faculdade', name: 'Faculdade', kind: 'estudo', column: 'andando' },
    { id: '5', slug: 'praxis', name: 'Praxis', kind: 'produto', column: 'andando' },
  ];

  const guidance = {
    fresh: true,
    priorities: [
      { rank: 1, project_slug: 'praxis', action: 'Polir tela de frentes' },
      { rank: 2, project_slug: 'animalia', action: 'Revisar piloto' },
    ],
  };

  const vm = buildFrontsViewModel(sampleProjects, guidance);

  assert.equal(vm.groups.length, 3);
  assert.equal(vm.groups[0].id, 'trabalho');
  assert.equal(vm.groups[1].id, 'estudo');
  assert.equal(vm.groups[2].id, 'produto');

  // GoFluxo has Animália as subfront
  const gofluxo = vm.groups[0].fronts.find((f) => f.slug === 'gofluxo');
  assert.ok(gofluxo);
  assert.equal(gofluxo.subfronts.length, 1);
  assert.equal(gofluxo.subfronts[0].slug, 'animalia');
  assert.equal(gofluxo.subfronts[0].isSubfront, true);
  assert.equal(gofluxo.subfronts[0].parentName, 'GoFluxo');
  assert.equal(gofluxo.subfronts[0].recommendedRank, 2);

  // Praxis has rank 1
  const praxis = vm.groups[2].fronts.find((f) => f.slug === 'praxis');
  assert.ok(praxis);
  assert.equal(praxis.recommendedRank, 1);
});

test('buildFrontsViewModel sets recommendedRank to null when guidance is not fresh', () => {
  const sampleProjects = [
    { id: '1', slug: 'praxis', name: 'Praxis', kind: 'produto', column: 'andando' },
  ];
  const guidance = {
    fresh: false,
    priorities: [
      { rank: 1, project_slug: 'praxis', action: 'Polir tela' },
    ],
  };

  const vm = buildFrontsViewModel(sampleProjects, guidance);
  assert.equal(vm.groups[0].fronts[0].recommendedRank, null);
});

test('findProjectForGuidancePriority matches priority to project by slug or id', () => {
  const projects = [
    { id: '10', slug: 'praxis', name: 'Praxis' },
    { id: '20', slug: 'rca', name: 'RCA' },
  ];
  const priority = { project_slug: 'rca', rank: 1 };
  const found = findProjectForGuidancePriority(priority, projects);
  assert.equal(found.id, '20');
});
