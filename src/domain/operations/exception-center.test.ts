import assert from 'node:assert/strict';
import test from 'node:test';
import { getSelectedException, getVisibleExceptions } from './exception-center.ts';
import type { OperationalItem } from './operational-state.ts';

const items: readonly OperationalItem[] = [
  { id: 'payroll', state: 'critical', ageMinutes: 10, title: 'Folha bloqueada', subject: 'Unidade Centro', evidence: [], recommendation: 'Revisar', owner: 'DP', dueLabel: 'Agora' },
  { id: 'absence', state: 'decision', ageMinutes: 20, title: 'Ausência', subject: 'Maria Oliveira', evidence: [], recommendation: 'Solicitar', owner: 'RH', dueLabel: 'Hoje' },
  { id: 'normal', state: 'normal', ageMinutes: 30, title: 'Concluído', subject: 'Rotina', evidence: [], recommendation: 'Nenhuma', owner: 'FluxPay', dueLabel: 'Ontem' },
];

test('busca por pessoa e mantém apenas exceções abertas', () => {
  assert.deepEqual(getVisibleExceptions(items, [], 'maria').map(({ id }) => id), ['absence']);
});

test('ao resolver a seleção avança para a próxima exceção priorizada', () => {
  const before = getVisibleExceptions(items, []);
  assert.equal(getSelectedException(before)?.id, 'payroll');
  const after = getVisibleExceptions(items, ['payroll']);
  assert.equal(getSelectedException(after, 'payroll')?.id, 'absence');
});
