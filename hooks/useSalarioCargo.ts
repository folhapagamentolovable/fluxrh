import { supabase } from '../src/integrations/supabase/client';

export interface HistoricoSalarioCargo {
  id: string;
  cargo_id: string;
  salario_base: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string | null;
  motivo: string;
  percentual_reajuste: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Busca o salário vigente de um cargo para uma data específica
 * 
 * Lógica de busca:
 * 1. Primeiro tenta buscar via RPC get_salario_cargo_vigente para a data exata
 * 2. Se não encontrar, busca o registro histórico mais recente anterior à data
 * 3. Se ainda não encontrar, usa o salário fallback da tabela cargos
 */
export async function getSalarioCargoVigente(
  cargoId: string,
  ano: number,
  mes: number,
  salarioFallback: number
): Promise<number> {
  try {
    // Construir data de referência (dia 01 do mês de competência - dissídio sempre inicia em 01/jan)
    const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
    
    // Buscar salário vigente usando a função do banco (usando any para contornar tipos)
    const { data, error } = await (supabase.rpc as any)('get_salario_cargo_vigente', {
      p_cargo_id: cargoId,
      p_data: dataReferencia
    });
    
    if (error) {
      // Continuar para query direta
    } else if (data !== null && typeof data === 'number' && data > 0) {
      return Number(data);
    }
    
    // Se não encontrou via RPC, buscar diretamente (usando any para tabela nova)
    const { data: historicoValido, error: errorHistorico } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('salario_base, data_inicio_vigencia')
      .eq('cargo_id', cargoId)
      .lte('data_inicio_vigencia', dataReferencia)
      .order('data_inicio_vigencia', { ascending: false })
      .limit(1);
    
    if (!errorHistorico && historicoValido && historicoValido.length > 0) {
      const registro = historicoValido[0];
      return Number(registro.salario_base);
    }
    
    // Se não encontrou registro anterior, buscar o mais antigo
    const { data: historicoAntigo, error: errorAntigo } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('salario_base, data_inicio_vigencia')
      .eq('cargo_id', cargoId)
      .order('data_inicio_vigencia', { ascending: true })
      .limit(1);
    
    if (!errorAntigo && historicoAntigo && historicoAntigo.length > 0) {
      const registroAntigo = historicoAntigo[0];
      return Number(registroAntigo.salario_base);
    }
    
    // Se não encontrou no histórico, usa o fallback da tabela cargos
    return salarioFallback;
    
  } catch (error) {
    return salarioFallback;
  }
}

/**
 * Busca todos os registros de histórico de salário de um cargo
 */
export async function getHistoricoSalarioCargo(cargoId: string): Promise<HistoricoSalarioCargo[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('*')
      .eq('cargo_id', cargoId)
      .order('data_inicio_vigencia', { ascending: false });
    
    if (error) {
      return [];
    }
    
    return (data || []) as HistoricoSalarioCargo[];
  } catch (error) {
    return [];
  }
}

/**
 * Valida se uma data de vigência não sobrepõe registros existentes
 * @returns { valido: boolean, mensagem?: string }
 */
export async function validarDataVigencia(
  cargoId: string,
  dataInicioVigencia: string,
  registroIdExcluir?: string // ID do registro sendo editado (para ignorar ele mesmo)
): Promise<{ valido: boolean; mensagem?: string }> {
  try {
    const { data: registros, error } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('id, data_inicio_vigencia, data_fim_vigencia, salario_base')
      .eq('cargo_id', cargoId)
      .order('data_inicio_vigencia', { ascending: true });
    
    if (error) {
      return { valido: true }; // Permite continuar em caso de erro de conexão
    }
    
    if (!registros || registros.length === 0) {
      return { valido: true };
    }
    
    const novaData = new Date(dataInicioVigencia + 'T00:00:00');
    
    for (const registro of registros) {
      // Ignorar o próprio registro se estiver editando
      if (registroIdExcluir && registro.id === registroIdExcluir) {
        continue;
      }
      
      const inicioExistente = new Date(registro.data_inicio_vigencia + 'T00:00:00');
      
      // Verificar se a nova data é igual a uma data de início existente
      if (novaData.getTime() === inicioExistente.getTime()) {
        return {
          valido: false,
          mensagem: `Já existe um registro com início em ${new Date(registro.data_inicio_vigencia).toLocaleDateString('pt-BR')} (R$ ${Number(registro.salario_base).toFixed(2)})`
        };
      }
    }
    
    return { valido: true };
  } catch (error) {
    return { valido: true }; // Permite continuar em caso de erro
  }
}

/**
 * Adiciona um novo registro de salário ao histórico do cargo
 * Reordena automaticamente as datas de fim quando inserido entre registros existentes
 */
export async function adicionarReajusteCargo(
  cargoId: string,
  novoSalario: number,
  dataInicioVigencia: string,
  motivo: string,
  percentualReajuste?: number,
  observacoes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar todos os registros existentes ordenados por data
    const { data: registrosExistentes, error: errorBusca } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('id, data_inicio_vigencia, data_fim_vigencia')
      .eq('cargo_id', cargoId)
      .order('data_inicio_vigencia', { ascending: true });
    
    if (errorBusca) {
    }
    
    const novaDataInicio = new Date(dataInicioVigencia + 'T00:00:00');
    let dataFimNovoRegistro: string | null = null;
    
    if (registrosExistentes && registrosExistentes.length > 0) {
      // 2. Encontrar registro imediatamente anterior (que deve ter sua data_fim ajustada)
      let registroAnterior: any = null;
      let registroPosterior: any = null;
      
      for (const reg of registrosExistentes) {
        const dataInicioReg = new Date(reg.data_inicio_vigencia + 'T00:00:00');
        
        if (dataInicioReg < novaDataInicio) {
          registroAnterior = reg;
        } else if (dataInicioReg > novaDataInicio && !registroPosterior) {
          registroPosterior = reg;
        }
      }
      
      // 3. Ajustar data_fim do registro anterior
      if (registroAnterior) {
        const novaDataFimAnterior = new Date(novaDataInicio);
        novaDataFimAnterior.setDate(novaDataFimAnterior.getDate() - 1);
        const dataFimFormatada = novaDataFimAnterior.toISOString().split('T')[0];
        
        await (supabase as any)
          .from('historico_salarios_cargo')
          .update({ data_fim_vigencia: dataFimFormatada })
          .eq('id', registroAnterior.id);
      }
      
      // 4. Se há registro posterior, definir data_fim do novo registro
      if (registroPosterior) {
        const dataFimNovo = new Date(registroPosterior.data_inicio_vigencia + 'T00:00:00');
        dataFimNovo.setDate(dataFimNovo.getDate() - 1);
        dataFimNovoRegistro = dataFimNovo.toISOString().split('T')[0];
      }
    }
    
    // 5. Inserir novo registro
    const { error: errorInsert } = await (supabase as any)
      .from('historico_salarios_cargo')
      .insert({
        cargo_id: cargoId,
        salario_base: novoSalario,
        data_inicio_vigencia: dataInicioVigencia,
        data_fim_vigencia: dataFimNovoRegistro,
        motivo: motivo,
        percentual_reajuste: percentualReajuste || null,
        observacoes: observacoes || null
      });
    
    if (errorInsert) {
      throw new Error(errorInsert.message);
    }
    
    // 6. Atualizar o salário na tabela cargos apenas se for o registro mais recente (sem data_fim)
    if (!dataFimNovoRegistro) {
      const { error: errorCargo } = await supabase
        .from('cargos')
        .update({ salario_base: novoSalario })
        .eq('id', cargoId);
      
      if (errorCargo) {
      }
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza um registro existente no histórico de salários
 */
export async function atualizarReajusteCargo(
  registroId: string,
  dados: {
    salario_base?: number;
    data_inicio_vigencia?: string;
    motivo?: string;
    percentual_reajuste?: number | null;
    observacoes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any)
      .from('historico_salarios_cargo')
      .update(dados)
      .eq('id', registroId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Exclui um registro do histórico de salários
 * Reabre o registro anterior se necessário
 */
export async function excluirReajusteCargo(
  registroId: string,
  cargoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar o registro que será excluído
    const { data: registroExcluir, error: errorBusca } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('*')
      .eq('id', registroId)
      .single();
    
    if (errorBusca || !registroExcluir) {
      throw new Error('Registro não encontrado');
    }
    
    // 2. Excluir o registro
    const { error: errorDelete } = await (supabase as any)
      .from('historico_salarios_cargo')
      .delete()
      .eq('id', registroId);
    
    if (errorDelete) {
      throw new Error(errorDelete.message);
    }
    
    // 3. Se era o registro vigente (sem data_fim), reabrir o anterior
    if (!registroExcluir.data_fim_vigencia) {
      const { data: registroAnterior, error: errorAnterior } = await (supabase as any)
        .from('historico_salarios_cargo')
        .select('id, salario_base')
        .eq('cargo_id', cargoId)
        .order('data_inicio_vigencia', { ascending: false })
        .limit(1);
      
      if (!errorAnterior && registroAnterior && registroAnterior.length > 0) {
        // Reabrir o registro anterior (remover data_fim)
        await (supabase as any)
          .from('historico_salarios_cargo')
          .update({ data_fim_vigencia: null })
          .eq('id', registroAnterior[0].id);
        
        // Atualizar salário na tabela cargos
        await supabase
          .from('cargos')
          .update({ salario_base: registroAnterior[0].salario_base })
          .eq('id', cargoId);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Busca salários vigentes de múltiplos cargos para uma data específica
 * Otimizado para calcular folhas em lote
 */
export async function getSalariosCargoVigentesLote(
  cargos: Array<{ id: string; salarioFallback: number }>,
  ano: number,
  mes: number
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>();
  // Usar dia 01 do mês de competência (dissídio sempre inicia em 01/jan)
  const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const cargoIds = cargos.map(c => c.id);
  
  try {
    // Buscar todos os históricos válidos para a data
    const { data: historicos, error } = await (supabase as any)
      .from('historico_salarios_cargo')
      .select('cargo_id, salario_base, data_inicio_vigencia')
      .lte('data_inicio_vigencia', dataReferencia)
      .or(`data_fim_vigencia.is.null,data_fim_vigencia.gte.${dataReferencia}`)
      .in('cargo_id', cargoIds)
      .order('data_inicio_vigencia', { ascending: false });
    
    if (error) {
      cargos.forEach(c => resultado.set(c.id, c.salarioFallback));
      return resultado;
    }
    
    // Mapear cargo -> salário mais recente válido para a data
    const salariosPorCargo = new Map<string, number>();
    if (historicos) {
      for (const h of historicos as any[]) {
        if (!salariosPorCargo.has(h.cargo_id)) {
          salariosPorCargo.set(h.cargo_id, Number(h.salario_base));
        }
      }
    }
    
    // Para cargos sem registro válido, buscar o registro mais antigo
    const cargosSemHistorico = cargos.filter(c => !salariosPorCargo.has(c.id));
    
    if (cargosSemHistorico.length > 0) {
      const { data: historicosAntigos, error: errorAntigos } = await (supabase as any)
        .from('historico_salarios_cargo')
        .select('cargo_id, salario_base, data_inicio_vigencia')
        .in('cargo_id', cargosSemHistorico.map(c => c.id))
        .order('data_inicio_vigencia', { ascending: true });
      
      if (!errorAntigos && historicosAntigos) {
        const historicosAntigosPorCargo = new Map<string, number>();
        for (const h of historicosAntigos as any[]) {
          if (!historicosAntigosPorCargo.has(h.cargo_id)) {
            historicosAntigosPorCargo.set(h.cargo_id, Number(h.salario_base));
          }
        }
        
        for (const cargo of cargosSemHistorico) {
          const salarioAntigo = historicosAntigosPorCargo.get(cargo.id);
          if (salarioAntigo !== undefined) {
            salariosPorCargo.set(cargo.id, salarioAntigo);
          }
        }
      }
    }
    
    // Para cada cargo, usar histórico ou fallback
    for (const cargo of cargos) {
      const salarioHistorico = salariosPorCargo.get(cargo.id);
      if (salarioHistorico !== undefined && salarioHistorico > 0) {
        resultado.set(cargo.id, salarioHistorico);
      } else {
        resultado.set(cargo.id, cargo.salarioFallback);
      }
    }
    
    return resultado;
    
  } catch (error) {
    cargos.forEach(c => resultado.set(c.id, c.salarioFallback));
    return resultado;
  }
}
