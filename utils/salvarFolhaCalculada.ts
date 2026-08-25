import { supabase } from '../lib/supabase';
import { ResultadoCalculoFolha } from './calcularFolhaPagamento';
import { notifyNewHolerite } from '../hooks/usePushNotifications';
import { normalizarFolhaCalculada } from './normalizarFolhaCalculada';

export interface DadosFolhaCalculada extends ResultadoCalculoFolha {
  funcionario_id: string;
  mes: number;
  ano: number;
}

/**
 * Salva ou atualiza a folha de pagamento calculada no banco de dados
 */
export async function salvarFolhaCalculada(
  funcionarioId: string,
  mes: number,
  ano: number,
  resultado: ResultadoCalculoFolha,
  camposAdicionais?: { // ⭐ Parâmetro opcional para campos extras
    desc_avaria_utilitario?: number;
    desc_rondas_nao_realizadas_benef?: number; // ⭐ NOVO: Rondas como benefício
    eventos_excepcionais?: any[];
  }
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // ⭐ Buscar dados do funcionário para incluir nome, empresa e posto
    const { data: funcionario, error: funcError } = await supabase
      .from('funcionarios')
      .select('nome_completo, empresa_id, posto_trabalho_id')
      .eq('id', funcionarioId)
      .single();
    
    if (funcError) {
    }

    
    // Preparar dados para inserção/atualização
    const dadosFolha: any = normalizarFolhaCalculada({
      funcionario_id: funcionarioId,
      nome_funcionario: funcionario?.nome_completo || null, // ⭐ ADICIONADO
      mes,
      ano,
      empresa_id: funcionario?.empresa_id || null, // ⭐ ADICIONADO
      posto_trabalho_id: funcionario?.posto_trabalho_id || null, // ⭐ ADICIONADO
      ...resultado,
      // ⭐ Sobrescrever com campos adicionais se fornecidos
      ...(camposAdicionais?.desc_avaria_utilitario !== undefined && {
        desc_avaria_utilitario: camposAdicionais.desc_avaria_utilitario
      }),
      ...(camposAdicionais?.desc_rondas_nao_realizadas_benef !== undefined && {
        desc_rondas_nao_realizadas_benef: camposAdicionais.desc_rondas_nao_realizadas_benef
      }),
      ...(camposAdicionais?.eventos_excepcionais && {
        eventos_excepcionais: camposAdicionais.eventos_excepcionais
      })
    });
    
    // 🔍 DEBUG: Log dos dados ANTES de salvar
    
    // Usar upsert para inserir ou atualizar
    const { data, error } = await supabase
      .from('folha_calculada')
      .upsert(dadosFolha, {
        onConflict: 'funcionario_id,mes,ano'
      })
      .select()
      .single();
    
    // 🔍 DEBUG: Log do resultado APÓS salvar
    if (data) {
    }
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    
    // 🔔 Enviar notificação push para o funcionário
    try {
      await notifyNewHolerite([funcionarioId], mes, ano);
    } catch (notifyError) {
    }
    
    return {
      success: true,
      data
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
}

/**
 * Busca a folha calculada de um funcionário em um período
 */
export async function buscarFolhaCalculada(
  funcionarioId: string,
  mes: number,
  ano: number
): Promise<{ success: boolean; error?: string; data?: DadosFolhaCalculada }> {
  try {
    const { data, error } = await supabase
      .from('folha_calculada')
      .select(`
        funcionario_id,
        mes,
        ano,
        total_proventos,
        total_descontos,
        total_beneficios,
        salario_liquido,
        eventos_excepcionais
      `)
      .eq('funcionario_id', funcionarioId)
      .eq('mes', mes)
      .eq('ano', ano)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return { success: true, data: undefined };
      }
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      data: data as any as DadosFolhaCalculada
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
}

/**
 * Busca todas as folhas calculadas de um período
 */
export async function buscarFolhasCalculadasPorPeriodo(
  mes: number,
  ano: number
): Promise<{ success: boolean; error?: string; data?: DadosFolhaCalculada[] }> {
  try {
    const { data, error } = await supabase
      .from('folha_calculada')
      .select(`
        *,
        funcionarios:funcionario_id (
          nome_completo,
          cpf,
          cargo:cargo_id (
            nome_cargo
          )
        )
      `)
      .eq('mes', mes)
      .eq('ano', ano)
      .order('funcionarios(nome_completo)');
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      data: (data || []) as any as DadosFolhaCalculada[]
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
}

/**
 * Deleta a folha calculada de um funcionário em um período
 */
export async function deletarFolhaCalculada(
  funcionarioId: string,
  mes: number,
  ano: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('folha_calculada')
      .delete()
      .eq('funcionario_id', funcionarioId)
      .eq('mes', mes)
      .eq('ano', ano);
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return { success: true };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
}

/**
 * Notifica múltiplos funcionários sobre novos holerites
 * Útil quando calcular folha em lote
 */
export async function notificarNovasFollhas(
  funcionarioIds: string[],
  mes: number,
  ano: number
): Promise<{ success: boolean; notificados: number }> {
  try {
    if (funcionarioIds.length === 0) {
      return { success: true, notificados: 0 };
    }
    
    const result = await notifyNewHolerite(funcionarioIds, mes, ano);
    
    return {
      success: result,
      notificados: funcionarioIds.length
    };
  } catch (error) {
    return { success: false, notificados: 0 };
  }
}
