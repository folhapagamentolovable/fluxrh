import type { OperationalDataQuality, OperationalRepository, OperationalSnapshot } from '@/domain/operations/operational-repository';
import { automationActivityFixture, operationalItemsFixture } from '../fixtures/operational-items';

const wait = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timeout = window.setTimeout(resolve, milliseconds);
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timeout);
    reject(new DOMException('Operação cancelada', 'AbortError'));
  }, { once: true });
});

const detectQuality = (): OperationalDataQuality => {
  if (!navigator.onLine) return 'offline';
  const hashQuery = window.location.hash.split('?')[1] ?? '';
  const requestedState = new URLSearchParams(hashQuery || window.location.search).get('demoState');
  return requestedState === 'degraded' ? 'degraded' : 'fresh';
};

export const fixtureOperationalRepository: OperationalRepository = {
  async getSnapshot(signal): Promise<OperationalSnapshot> {
    await wait(250, signal);
    const quality = detectQuality();
    return {
      items: operationalItemsFixture,
      activities: automationActivityFixture,
      quality,
      updatedAt: quality === 'fresh' ? 'há 2 minutos' : 'há 38 minutos',
    };
  },
  async resolveException(_id, signal): Promise<void> {
    await wait(180, signal);
  },
};
