import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prioritizeOperationalItems,
  summarizeOperationalItems,
  type OperationalItem,
} from './operational-state.ts';

const item = (id: string, state: OperationalItem['state'], ageMinutes: number): OperationalItem => ({
  id,
  state,
  ageMinutes,
  title: id,
  subject: 'Cenário de teste',
  evidence: [],
  recommendation: 'Revisar',
  owner: 'RH',
  dueLabel: 'Hoje',
});

test('resume os quatro estados e separa decisões humanas', () => {
  const summary = summarizeOperationalItems([
    item('normal', 'normal', 1),
    item('atenção', 'attention', 2),
    item('decisão', 'decision', 3),
    item('crítico', 'critical', 4),
  ]);

  assert.deepEqual(summary, {
    total: 4,
    normal: 1,
    attention: 1,
    decision: 1,
    critical: 1,
    requiresHumanAction: 2,
  });
});

test('prioriza criticidade e usa idade como desempate', () => {
  const ordered = prioritizeOperationalItems([
    item('atenção', 'attention', 90),
    item('crítico recente', 'critical', 10),
    item('decisão', 'decision', 120),
    item('crítico antigo', 'critical', 180),
  ]);

  assert.deepEqual(ordered.map(({ id }) => id), [
    'crítico antigo',
    'crítico recente',
    'decisão',
    'atenção',
  ]);
});
