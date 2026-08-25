export type OperationalState = 'normal' | 'attention' | 'decision' | 'critical';

export type OperationalOwner = 'FluxPay' | 'Liderança' | 'RH' | 'DP' | 'Financeiro';

export interface OperationalItem {
  id: string;
  state: OperationalState;
  title: string;
  subject: string;
  evidence: readonly string[];
  recommendation: string;
  owner: OperationalOwner;
  dueLabel: string;
  ageMinutes: number;
  primaryAction?: string;
}

export interface OperationalSummary {
  total: number;
  normal: number;
  attention: number;
  decision: number;
  critical: number;
  requiresHumanAction: number;
}

export const operationalStateOrder: Record<OperationalState, number> = {
  critical: 0,
  decision: 1,
  attention: 2,
  normal: 3,
};

export const summarizeOperationalItems = (
  items: readonly OperationalItem[],
): OperationalSummary => {
  const summary: OperationalSummary = {
    total: items.length,
    normal: 0,
    attention: 0,
    decision: 0,
    critical: 0,
    requiresHumanAction: 0,
  };

  for (const item of items) {
    summary[item.state] += 1;
    if (item.state === 'decision' || item.state === 'critical') {
      summary.requiresHumanAction += 1;
    }
  }

  return summary;
};

export const prioritizeOperationalItems = (
  items: readonly OperationalItem[],
): OperationalItem[] => [...items].sort((left, right) => {
  const stateDifference = operationalStateOrder[left.state] - operationalStateOrder[right.state];
  return stateDifference || right.ageMinutes - left.ageMinutes;
});
