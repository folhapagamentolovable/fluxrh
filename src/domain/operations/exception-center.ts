import { prioritizeOperationalItems, type OperationalItem } from './operational-state.ts';

export const getVisibleExceptions = (
  items: readonly OperationalItem[],
  resolvedIds: readonly string[],
  query = '',
): OperationalItem[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  return prioritizeOperationalItems(items).filter((item) => {
    if (item.state === 'normal' || resolvedIds.includes(item.id)) return false;
    if (!normalizedQuery) return true;
    return `${item.title} ${item.subject}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery);
  });
};

export const getSelectedException = (
  items: readonly OperationalItem[],
  selectedId?: string,
): OperationalItem | undefined => items.find(({ id }) => id === selectedId) ?? items[0];
