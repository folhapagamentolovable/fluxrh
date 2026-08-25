import type { OperationalItem } from './operational-state';

export type OperationalDataQuality = 'fresh' | 'degraded' | 'offline';

export interface AutomationActivity {
  id: string;
  time: string;
  text: string;
}

export interface OperationalSnapshot {
  items: readonly OperationalItem[];
  activities: readonly AutomationActivity[];
  quality: OperationalDataQuality;
  updatedAt: string;
}

export interface OperationalRepository {
  getSnapshot(signal?: AbortSignal): Promise<OperationalSnapshot>;
  resolveException(id: string, signal?: AbortSignal): Promise<void>;
}
