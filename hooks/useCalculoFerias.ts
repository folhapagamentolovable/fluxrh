/**
 * Hook para calcular dias de férias disponíveis baseado nas faltas injustificadas e suspensões
 * do período aquisitivo de 12 meses, seguindo a tabela da CLT.
 */

import { supabase } from '../lib/supabase';

/**
 * Tabela CLT - Redução de dias de férias por faltas injustificadas
 */
const TABELA_CLT_FERIAS = [
  { faltasMax: 5, diasFerias: 30 },
  { faltasMax: 14, diasFerias: 24 },
  { faltasMax: 23, diasFerias: 18 },
  { faltasMax: 32, diasFerias: 12 },
  { faltasMax: Infinity, diasFerias: 0 } // Mais de 32 faltas = perda do direito
];

/**
 * Calcula os dias de férias disponíveis baseado na tabela CLT
 */
export function calcularDiasFeriasPorFaltas(totalFaltasESuspensoes: number): number {
  for (const faixa of TABELA_CLT_FERIAS) {
    if (totalFaltasESuspensoes <= faixa.faltasMax) {
      return faixa.diasFerias;
    }
  }
  return 0; // Fallback
}

/**
 * Busca as folhas de ponto do período aquisitivo e calcula total de faltas + suspensões
 */
export async function calcularFaltasESupensoesPeriodoAquisitivo(
  funcionarioId: string,
  dataInicioAquisitivo: string, // YYYY-MM-DD
  dataFimAquisitivo: string // YYYY-MM-DD
): Promise<{
  totalFaltasInjustificadas: number;
  totalSuspensoes: number;
  totalFaltasESuspensoes: number;
  folhasPonto: any[];
}> {
  // Converter datas para mês/ano
  const dataInicio = new Date(dataInicioAquisitivo + 'T00:00:00');
  const dataFim = new Date(dataFimAquisitivo + 'T00:00:00');
  
  // Buscar todas as folhas de ponto do período
  const { data: folhasPonto, error } = await supabase
    .from('folhas_ponto')
    .select('mes, ano, total_faltas_injustificadas, total_suspensoes, dados_dias')
    .eq('funcionario_id', funcionarioId)
    .order('ano', { ascending: true })
    .order('mes', { ascending: true });
  
  if (error) {
    return {
      totalFaltasInjustificadas: 0,
      totalSuspensoes: 0,
      totalFaltasESuspensoes: 0,
      folhasPonto: []
    };
  }
  
  // Filtrar folhas dentro do período aquisitivo
  const folhasDoPeriodo = (folhasPonto || []).filter(folha => {
    // Criar data do primeiro e último dia do mês da folha
    const primeiroDiaMes = new Date(folha.ano, folha.mes - 1, 1);
    const ultimoDiaMes = new Date(folha.ano, folha.mes, 0);
    
    // Verificar se o mês está dentro do período aquisitivo
    // Um mês está incluído se qualquer parte dele está no período
    return primeiroDiaMes <= dataFim && ultimoDiaMes >= dataInicio;
  });
  
  // Somar faltas e suspensões
  let totalFaltasInjustificadas = 0;
  let totalSuspensoes = 0;
  
  for (const folha of folhasDoPeriodo) {
    // Usar campos totalizados se disponíveis
    totalFaltasInjustificadas += folha.total_faltas_injustificadas || 0;
    totalSuspensoes += folha.total_suspensoes || 0;
    
    // Se não tiver o campo total_suspensoes, contar do dados_dias
    if (folha.total_suspensoes === null || folha.total_suspensoes === undefined) {
      if (folha.dados_dias) {
        try {
          const dadosDias = typeof folha.dados_dias === 'string' 
            ? JSON.parse(folha.dados_dias) 
            : folha.dados_dias;
          
          Object.values(dadosDias).forEach((dia: any) => {
            if (dia.suspensao) {
              totalSuspensoes += 1;
            }
          });
        } catch (e) {
        }
      }
    }
  }
  
  return {
    totalFaltasInjustificadas,
    totalSuspensoes,
    totalFaltasESuspensoes: totalFaltasInjustificadas + totalSuspensoes,
    folhasPonto: folhasDoPeriodo
  };
}

/**
 * Calcula os dias de férias disponíveis para um funcionário em um período aquisitivo específico
 */
export async function calcularDiasFeriasDisponiveis(
  funcionarioId: string,
  dataInicioAquisitivo: string,
  dataFimAquisitivo: string
): Promise<{
  diasFerias: number;
  totalFaltasInjustificadas: number;
  totalSuspensoes: number;
  totalFaltasESuspensoes: number;
  perdeuDireito: boolean;
}> {
  const resultado = await calcularFaltasESupensoesPeriodoAquisitivo(
    funcionarioId,
    dataInicioAquisitivo,
    dataFimAquisitivo
  );
  
  const diasFerias = calcularDiasFeriasPorFaltas(resultado.totalFaltasESuspensoes);
  
  return {
    diasFerias,
    totalFaltasInjustificadas: resultado.totalFaltasInjustificadas,
    totalSuspensoes: resultado.totalSuspensoes,
    totalFaltasESuspensoes: resultado.totalFaltasESuspensoes,
    perdeuDireito: diasFerias === 0
  };
}

/**
 * Atualiza o campo dias_direito na tabela ferias
 */
export async function atualizarDiasDireitoFerias(
  feriasId: string,
  funcionarioId: string,
  dataInicioAquisitivo: string,
  dataFimAquisitivo: string
): Promise<{ success: boolean; diasDireito: number; error?: string }> {
  try {
    const calculo = await calcularDiasFeriasDisponiveis(
      funcionarioId,
      dataInicioAquisitivo,
      dataFimAquisitivo
    );
    
    const { error } = await supabase
      .from('ferias')
      .update({ dias_direito: calculo.diasFerias })
      .eq('id', feriasId);
    
    if (error) throw error;
    
    return { success: true, diasDireito: calculo.diasFerias };
  } catch (error: any) {
    return { success: false, diasDireito: 30, error: error.message };
  }
}

/**
 * Descrição da redução de férias para exibição
 */
export function getDescricaoReducaoFerias(totalFaltasESuspensoes: number): string {
  if (totalFaltasESuspensoes <= 5) {
    return `${totalFaltasESuspensoes} falta(s)/suspensão(ões) - Mantém 30 dias`;
  } else if (totalFaltasESuspensoes <= 14) {
    return `${totalFaltasESuspensoes} falta(s)/suspensão(ões) - Reduzido para 24 dias`;
  } else if (totalFaltasESuspensoes <= 23) {
    return `${totalFaltasESuspensoes} falta(s)/suspensão(ões) - Reduzido para 18 dias`;
  } else if (totalFaltasESuspensoes <= 32) {
    return `${totalFaltasESuspensoes} falta(s)/suspensão(ões) - Reduzido para 12 dias`;
  } else {
    return `${totalFaltasESuspensoes} falta(s)/suspensão(ões) - PERDEU DIREITO às férias`;
  }
}
