// Utilitário para carregar escalas salvas e preencher folhas de ponto

import { supabase } from '../lib/supabase';
import { converterRegraVisualParaJSON } from './converterRegraVisualParaJSON';

/**
 * Busca a escala salva de um funcionário para um mês/ano específico
 */
export async function buscarEscalaSalva(
  funcionarioId: string,
  mes: number,
  ano: number
) {
  // Buscar escala mensal sem JOIN problemático
  const { data, error } = await supabase
    .from('escala_mensal')
    .select(`
      *,
      funcionario:funcionarios(*),
      empresa:empresas(*),
      posto_trabalho:postos_trabalho(*),
      cargo:cargos(*)
    `)
    .eq('funcionario_id', funcionarioId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle(); // Usa maybeSingle() em vez de single() para não dar erro se não encontrar

  if (error) {
    return null;
  }

  // ⭐ PRIORIZAR codigo_escala atual do funcionário (override individual)
  // Se o funcionário teve a escala alterada em "Funcionários" depois que a escala mensal
  // foi gerada, resolve a regra correta pelo codigo_escala vigente.
  if (data?.funcionario?.codigo_escala) {
    const codigoAtual = data.funcionario.codigo_escala;
    const { data: regraAtual } = await supabase
      .from('regras_escalas')
      .select('id')
      .eq('codigo_escala', codigoAtual)
      .eq('ativa', true)
      .maybeSingle();
    if (regraAtual?.id && regraAtual.id !== data.escala_id) {
      data.escala_id = regraAtual.id;
    }
  }

  // Se não encontrou dados, retorna null sem erro
  if (!data) {
    return null;
  }

  // JOIN manual com regras_escalas - buscar TODOS os campos para converter em regras_json
  if (data.escala_id) {
    const { data: escalaData } = await supabase
      .from('regras_escalas')
      .select('*')
      .eq('id', data.escala_id)
      .maybeSingle();
    
    if (escalaData) {
      // Converter regra visual para regras_json em tempo real
      const regrasJSON = converterRegraVisualParaJSON({
        codigo_escala: escalaData.codigo_escala,
        nome_escala: escalaData.nome_escala,
        turno: escalaData.turno || 'diurno',
        data_vigencia: escalaData.data_vigencia,
        trabalha_segunda: escalaData.trabalha_segunda ?? true,
        trabalha_terca: escalaData.trabalha_terca ?? true,
        trabalha_quarta: escalaData.trabalha_quarta ?? true,
        trabalha_quinta: escalaData.trabalha_quinta ?? true,
        trabalha_sexta: escalaData.trabalha_sexta ?? true,
        trabalha_sabado: escalaData.trabalha_sabado ?? true,
        trabalha_domingo: escalaData.trabalha_domingo ?? true,
        trabalha_feriado: escalaData.trabalha_feriado ?? true,
        tipo_alternancia: escalaData.tipo_alternancia || 'NENHUMA',
        horarios_segunda: escalaData.horarios_segunda || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_terca: escalaData.horarios_terca || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_quarta: escalaData.horarios_quarta || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_quinta: escalaData.horarios_quinta || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_sexta: escalaData.horarios_sexta || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_sabado: escalaData.horarios_sabado || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_domingo: escalaData.horarios_domingo || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' },
        horarios_feriado: escalaData.horarios_feriado || escalaData.horarios_domingo || { entrada: '', saida: '', inicio_almoco: '', termino_almoco: '' }
      });
      
      data.escala = {
        id: escalaData.id,
        codigo_escala: escalaData.codigo_escala,
        nome_escala: escalaData.nome_escala,
        regras_json: regrasJSON
      };
      
    }
  }

  return data;
}

/**
 * Preenche automaticamente uma folha de ponto baseada na escala salva
 */
export async function preencherFolhaPontoComEscala(
  funcionarioId: string,
  mes: number,
  ano: number
) {
  // Buscar escala salva
  const escala = await buscarEscalaSalva(funcionarioId, mes, ano);
  
  if (!escala) {
    throw new Error('Escala não encontrada. Gere e salve a escala primeiro.');
  }

  // Parsear dias trabalhados
  const diasTrabalhados = JSON.parse(escala.dias_trabalhados);
  
  // Estrutura da folha de ponto pré-preenchida
  const folhaPonto = {
    funcionario_id: funcionarioId,
    mes,
    ano,
    escala_id: escala.escala_id,
    empresa_id: escala.empresa_id,
    posto_trabalho_id: escala.posto_trabalho_id,
    cargo_id: escala.cargo_id,
    dias: diasTrabalhados,
    totais: {
      dias_trabalho: escala.total_dias_trabalho,
      dias_folga: escala.total_dias_folga,
      feriados: escala.total_feriados,
      // Campos que serão preenchidos durante o mês:
      faltas: 0,
      atrasos: 0,
      horas_extras: 0,
      atestados: 0
    },
    observacoes: escala.observacoes || ''
  };

  return folhaPonto;
}

/**
 * Calcula horas previstas no mês baseado na escala
 */
export function calcularHorasPrevistas(diasTrabalhados: any): number {
  let totalHoras = 0;

  Object.keys(diasTrabalhados).forEach(diaKey => {
    const dia = diasTrabalhados[diaKey];
    
    if (!dia.folga && !dia.feriado && dia.entrada && dia.saida) {
      // Calcular horas do dia
      const entrada = parseHorario(dia.entrada);
      const saida = parseHorario(dia.saida);
      const inicioRefeicao = parseHorario(dia.inicio_refeicao);
      const terminoRefeicao = parseHorario(dia.termino_refeicao);
      
      let horasDia = saida - entrada;
      
      // Descontar intrajornada se houver
      if (inicioRefeicao !== terminoRefeicao) {
        horasDia -= (terminoRefeicao - inicioRefeicao);
      }
      
      totalHoras += horasDia;
    }
  });

  return totalHoras;
}

/**
 * Converte horário "HH:MM" para minutos
 */
function parseHorario(horario: string): number {
  if (!horario) return 0;
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Busca todas as escalas de um mês para gerar relatório
 */
export async function buscarTodasEscalasMes(mes: number, ano: number) {
  // Buscar escalas mensais sem JOIN problemático
  const { data, error } = await supabase
    .from('escala_mensal')
    .select(`
      *,
      funcionario:funcionarios(nome_completo, cpf),
      empresa:empresas(nome_empresa)
    `)
    .eq('mes', mes)
    .eq('ano', ano);

  if (error) {
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // JOIN manual com regras_escalas
  const escalasIds = [...new Set(data.map(e => e.escala_id).filter(Boolean))];
  
  if (escalasIds.length > 0) {
    const { data: escalasData } = await supabase
      .from('regras_escalas')
      .select('id, nome_escala, codigo_escala')
      .in('id', escalasIds);
    
    if (escalasData) {
      data.forEach(item => {
        if (item.escala_id) {
          item.escala = escalasData.find(e => e.id === item.escala_id) || null;
        }
      });
    }
  }

  return data;
}

/**
 * Gera resumo estatístico das escalas do mês
 */
export async function gerarResumoEscalasMes(mes: number, ano: number) {
  const escalas = await buscarTodasEscalasMes(mes, ano);
  
  const resumo = {
    total_funcionarios: escalas.length,
    total_dias_trabalho: escalas.reduce((sum, e) => sum + (e.total_dias_trabalho || 0), 0),
    total_dias_folga: escalas.reduce((sum, e) => sum + (e.total_dias_folga || 0), 0),
    total_feriados: escalas.reduce((sum, e) => sum + (e.total_feriados || 0), 0),
    media_dias_trabalho: 0,
    escalas_por_tipo: {} as {[key: string]: number}
  };
  
  resumo.media_dias_trabalho = resumo.total_dias_trabalho / escalas.length;
  
  // Contar por tipo de escala
  escalas.forEach(e => {
    const tipo = e.escala?.codigo_escala || 'Sem escala';
    resumo.escalas_por_tipo[tipo] = (resumo.escalas_por_tipo[tipo] || 0) + 1;
  });
  
  return resumo;
}
