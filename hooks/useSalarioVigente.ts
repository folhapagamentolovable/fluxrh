import { supabase } from '../src/integrations/supabase/client';

/**
 * Busca o salário vigente de um funcionário para uma data específica
 * 
 * Lógica de busca:
 * 1. Primeiro tenta buscar via RPC get_salario_vigente para a data exata
 * 2. Se não encontrar, busca o registro histórico mais antigo (para datas anteriores ao histórico)
 * 3. Se ainda não encontrar, usa o salário fallback do cargo
 * 
 * IMPORTANTE: Esta lógica garante que:
 * - Para competências APÓS o dissídio: usa o novo salário
 * - Para competências ANTES do dissídio: usa o salário anterior (se existir no histórico)
 * - Para competências anteriores a qualquer histórico: usa o registro mais antigo
 */
export async function getSalarioVigente(
  funcionarioId: string,
  ano: number,
  mes: number,
  salarioFallback: number
): Promise<number> {
  try {
    // Construir data de referência (dia 01 do mês de competência - dissídio sempre inicia em 01/jan)
    const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
    
    // Buscar salário vigente usando a função do banco
    const { data, error } = await supabase
      .rpc('get_salario_vigente', {
        p_funcionario_id: funcionarioId,
        p_data: dataReferencia
      });
    
    if (error) {
      return salarioFallback;
    }
    
    if (data !== null && data > 0) {
      return Number(data);
    }
    
    // ⭐ LÓGICA CORRIGIDA: Buscar o salário válido para a data de competência
    // Prioridade: registro com data_inicio_vigencia <= dataReferencia E (data_fim_vigencia IS NULL OU >= dataReferencia)
    // Se não encontrar, buscar o registro com data_inicio_vigencia mais próxima ANTERIOR à data de referência
    const { data: historicoValido, error: errorHistorico } = await supabase
      .from('historico_salarios')
      .select('salario_base, data_inicio_vigencia, data_fim_vigencia')
      .eq('funcionario_id', funcionarioId)
      .lte('data_inicio_vigencia', dataReferencia)
      .order('data_inicio_vigencia', { ascending: false })
      .limit(1);
    
    if (!errorHistorico && historicoValido && historicoValido.length > 0) {
      const registro = historicoValido[0];
      return Number(registro.salario_base);
    }
    
    // Se não encontrou registro anterior, buscar o mais antigo (para datas antes do primeiro registro)
    const { data: historicoAntigo, error: errorAntigo } = await supabase
      .from('historico_salarios')
      .select('salario_base, data_inicio_vigencia')
      .eq('funcionario_id', funcionarioId)
      .order('data_inicio_vigencia', { ascending: true })
      .limit(1);
    
    if (!errorAntigo && historicoAntigo && historicoAntigo.length > 0) {
      const registroAntigo = historicoAntigo[0];
      return Number(registroAntigo.salario_base);
    }
    
    // Se não encontrou no histórico, usa o fallback do cargo
    return salarioFallback;
    
  } catch (error) {
    return salarioFallback;
  }
}

/**
 * Busca salários vigentes para múltiplos funcionários de uma vez
 * Otimizado para calcular folhas em lote
 * 
 * Mesma lógica de getSalarioVigente:
 * 1. Busca registros válidos para a data de referência
 * 2. Para funcionários sem registro válido, busca o registro mais antigo
 * 3. Usa fallback do cargo apenas se não houver histórico
 */
export async function getSalariosVigentesLote(
  funcionarios: Array<{ id: string; salarioFallback: number }>,
  ano: number,
  mes: number
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>();
  // Usar dia 01 do mês de competência (dissídio sempre inicia em 01/jan)
  const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const funcionarioIds = funcionarios.map(f => f.id);
  
  try {
    // Buscar todos os históricos de salários ativos para a data
    const { data: historicos, error } = await supabase
      .from('historico_salarios')
      .select('funcionario_id, salario_base, data_inicio_vigencia')
      .lte('data_inicio_vigencia', dataReferencia)
      .or(`data_fim_vigencia.is.null,data_fim_vigencia.gte.${dataReferencia}`)
      .in('funcionario_id', funcionarioIds)
      .order('data_inicio_vigencia', { ascending: false });
    
    if (error) {
      // Retornar fallbacks
      funcionarios.forEach(f => resultado.set(f.id, f.salarioFallback));
      return resultado;
    }
    
    // Mapear funcionário -> salário mais recente válido para a data
    const salariosPorFuncionario = new Map<string, number>();
    if (historicos) {
      for (const h of historicos) {
        // Só adiciona se ainda não tem (primeiro encontrado é o mais recente por conta do ORDER BY)
        if (!salariosPorFuncionario.has(h.funcionario_id)) {
          salariosPorFuncionario.set(h.funcionario_id, Number(h.salario_base));
        }
      }
    }
    
    // ⭐ Para funcionários sem registro válido (data de referência anterior ao primeiro registro),
    // buscar o registro mais antigo e usar esse salário
    const funcionariosSemHistorico = funcionarios.filter(f => !salariosPorFuncionario.has(f.id));
    
    if (funcionariosSemHistorico.length > 0) {
      const { data: historicosAntigos, error: errorAntigos } = await supabase
        .from('historico_salarios')
        .select('funcionario_id, salario_base, data_inicio_vigencia')
        .in('funcionario_id', funcionariosSemHistorico.map(f => f.id))
        .order('data_inicio_vigencia', { ascending: true });
      
      if (!errorAntigos && historicosAntigos) {
        // Mapear o registro mais antigo por funcionário
        const historicosAntigosPorFunc = new Map<string, { salario_base: number; data_inicio_vigencia: string }>();
        for (const h of historicosAntigos) {
          if (!historicosAntigosPorFunc.has(h.funcionario_id)) {
            historicosAntigosPorFunc.set(h.funcionario_id, h);
          }
        }
        
        // Para cada funcionário sem histórico válido, usar o registro mais antigo disponível
        // (Isso cobre casos onde a competência é anterior ao primeiro registro de histórico)
        for (const func of funcionariosSemHistorico) {
          const registroAntigo = historicosAntigosPorFunc.get(func.id);
          if (registroAntigo) {
            // Usar o salário do registro mais antigo para datas anteriores
            salariosPorFuncionario.set(func.id, Number(registroAntigo.salario_base));
          }
        }
      }
    }
    
    // Para cada funcionário, usar histórico ou fallback
    for (const func of funcionarios) {
      const salarioHistorico = salariosPorFuncionario.get(func.id);
      if (salarioHistorico !== undefined && salarioHistorico > 0) {
        resultado.set(func.id, salarioHistorico);
      } else {
        resultado.set(func.id, func.salarioFallback);
      }
    }
    
    return resultado;
    
  } catch (error) {
    // Retornar fallbacks
    funcionarios.forEach(f => resultado.set(f.id, f.salarioFallback));
    return resultado;
  }
}
