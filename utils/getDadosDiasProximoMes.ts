import { supabase } from '../lib/supabase';

/**
 * Busca a folha de ponto do próximo mês para cálculo de VT/VA antecipado.
 * Se a folha de ponto ainda não foi gerada, usa a ESCALA MENSAL como fallback
 * (dias programados), padronizando no formato { dados_dias }.
 *
 * Retorna `null` se nenhum dos dois existir.
 */
export async function getDadosDiasProximoMes(
  funcionarioId: string,
  mes: number,
  ano: number
): Promise<{ dados_dias: any } | null> {
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;

  // 1) Tentar folha de ponto do próximo mês
  const { data: folhaPontoProximoMes } = await supabase
    .from('folhas_ponto')
    .select('dados_dias')
    .eq('funcionario_id', funcionarioId)
    .eq('mes', proximoMes)
    .eq('ano', proximoAno)
    .maybeSingle();

  if (folhaPontoProximoMes?.dados_dias) {
    return { dados_dias: folhaPontoProximoMes.dados_dias };
  }

  // 2) Fallback: escala mensal do próximo mês
  const { data: escalaProximoMes } = await supabase
    .from('escala_mensal')
    .select('dias_trabalhados')
    .eq('funcionario_id', funcionarioId)
    .eq('mes', proximoMes)
    .eq('ano', proximoAno)
    .maybeSingle();

  if (escalaProximoMes?.dias_trabalhados) {
    const dias = typeof escalaProximoMes.dias_trabalhados === 'string'
      ? JSON.parse(escalaProximoMes.dias_trabalhados)
      : escalaProximoMes.dias_trabalhados;
    return { dados_dias: dias };
  }

  return null;
}
