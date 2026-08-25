/**
 * Utilitários centralizados para status de férias.
 * Qualquer lógica de status deve viver aqui.
 */
import { supabase } from '../lib/supabase';

export type FeriasStatus =
  | 'pendente' | 'programada' | 'em_andamento' | 'gozada'
  | 'vencida' | 'solicitado' | 'reprovada' | 'agendada' | 'aprovada';

/** Status que indicam que as férias foram ou estão sendo gozadas */
export const STATUS_GOZADOS: FeriasStatus[] = [
  'gozada', 'em_andamento', 'concluida' as any
];

/** Status que indicam que as férias estão programadas/aprovadas (mas ainda não iniciaram) */
export const STATUS_PROGRAMADOS: FeriasStatus[] = [
  'programada', 'aprovada', 'agendada'
];

/** Todos os status que indicam que o período NÃO está mais pendente */
export const STATUS_ATIVOS: FeriasStatus[] = [
  ...STATUS_GOZADOS,
  ...STATUS_PROGRAMADOS,
  'em_andamento',
];

export interface FeriasParaAtualizar {
  id: string;
  status: string;
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  data_limite_concessivo: string;
  detalhamento?: any;
  itens_calculados?: any;
}

/**
 * Calcula o status correto de um registro de férias baseado nas datas reais.
 * Retorna null se o status já está correto.
 */
export function calcularStatusCorreto(f: FeriasParaAtualizar): FeriasStatus | null {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Não alterar solicitações pendentes de aprovação nem reprovadas
  if (f.status === 'solicitado' || f.status === 'reprovada') return null;
  // Já está no status final
  if (f.status === 'gozada' || f.status === 'vencida') return null;

  const inicio = f.data_inicio_gozo ? new Date(f.data_inicio_gozo + 'T00:00:00') : null;
  const fim = f.data_fim_gozo ? new Date(f.data_fim_gozo + 'T00:00:00') : null;
  const limite = new Date(f.data_limite_concessivo + 'T00:00:00');

  // Já terminou → gozada
  if (fim && fim < hoje) return 'gozada';

  // Em andamento (iniciou mas não terminou)
  if (inicio && inicio <= hoje && (!fim || fim >= hoje)) return 'em_andamento';

  // Vencida sem gozo agendado
  if (!inicio && limite < hoje) return 'vencida';

  return null; // status atual está correto
}

/**
 * Atualiza automaticamente o status de todos os registros de férias
 * que estejam com status desatualizado em relação às datas reais.
 * Deve ser chamada ao carregar VacationManagement.
 */
export async function sincronizarStatusFerias(): Promise<number> {
  const { data, error } = await supabase
    .from('ferias')
    .select('id, status, data_inicio_gozo, data_fim_gozo, data_limite_concessivo')
    .not('status', 'in', '("solicitado","reprovada","gozada","vencida")');

  if (error || !data) return 0;

  let count = 0;

  for (const f of data) {
    const novoStatus = calcularStatusCorreto(f as FeriasParaAtualizar);
    if (novoStatus && novoStatus !== f.status) {
      const { error: updateError } = await supabase
        .from('ferias')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', f.id);

      if (!updateError) {
        count++;
      }
    }
  }

  return count;
}

/** Labels e cores para cada status */
export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:     { label: 'Pendente',      bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-400' },
  solicitado:   { label: 'Solicitado',    bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  programada:   { label: 'Programada',    bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  aprovada:     { label: 'Aprovada',      bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  agendada:     { label: 'Agendada',      bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  em_andamento: { label: 'Em andamento',  bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  gozada:       { label: 'Gozada',        bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
  vencida:      { label: 'Vencida',       bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  reprovada:    { label: 'Reprovada',     bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-400' },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG['pendente'];
}
