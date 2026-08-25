import { useCallback, useEffect, useState } from 'react';
import type { OperationalRepository, OperationalSnapshot } from '@/domain/operations/operational-repository';

type SnapshotState =
  | { status: 'loading'; snapshot?: undefined; error?: undefined }
  | { status: 'ready'; snapshot: OperationalSnapshot; error?: undefined }
  | { status: 'error'; snapshot?: undefined; error: string };

export const useOperationalSnapshot = (repository: OperationalRepository) => {
  const [state, setState] = useState<SnapshotState>({ status: 'loading' });

  const load = useCallback((signal?: AbortSignal) => {
    setState({ status: 'loading' });
    repository.getSnapshot(signal).then(
      (snapshot) => setState({ status: 'ready', snapshot }),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', error: 'Não foi possível carregar a operação.' });
      },
    );
  }, [repository]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, retry: () => load() };
};
