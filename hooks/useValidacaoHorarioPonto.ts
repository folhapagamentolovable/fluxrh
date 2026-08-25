import { supabase } from '../lib/supabase';
import { getHorariosDia, trabalhaNoDia, garantirCache } from '../utils/regrasEscalaCache';

export interface Inconsistencia {
  tipo: 'HORARIO_FORA_TOLERANCIA' | 'POSTO_DIFERENTE' | 'DIA_FOLGA' | 'SEM_ESCALA';
  descricao: string;
  horario_esperado?: string;
  horario_registrado?: string;
  posto_esperado?: string;
  posto_registrado?: string;
}

export interface ResultadoValidacao {
  valido: boolean;
  inconsistencias: Inconsistencia[];
  horarioEsperado?: {
    entrada: string;
    saida: string;
  };
  ehDiaFolga: boolean;
  ehPostoDiferente: boolean;
}

interface RegraEscala {
  codigo_escala: string;
  nome_escala: string;
  horarios_segunda: { entrada: string; saida: string } | null;
  horarios_terca: { entrada: string; saida: string } | null;
  horarios_quarta: { entrada: string; saida: string } | null;
  horarios_quinta: { entrada: string; saida: string } | null;
  horarios_sexta: { entrada: string; saida: string } | null;
  horarios_sabado: { entrada: string; saida: string } | null;
  horarios_domingo: { entrada: string; saida: string } | null;
  horarios_feriado: { entrada: string; saida: string } | null;
  trabalha_feriado: boolean;
  trabalha_segunda: boolean;
  trabalha_terca: boolean;
  trabalha_quarta: boolean;
  trabalha_quinta: boolean;
  trabalha_sexta: boolean;
  trabalha_sabado: boolean;
  trabalha_domingo: boolean;
}

// Constantes
const TOLERANCIA_MINUTOS = 5;

/**
 * Converte string de horário (HH:mm) para minutos desde meia-noite
 */
function horarioParaMinutos(horario: string): number {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Verifica se dois horários estão dentro da tolerância
 */
function dentroTolerancia(horarioRegistrado: string, horarioEsperado: string): boolean {
  const registrado = horarioParaMinutos(horarioRegistrado);
  const esperado = horarioParaMinutos(horarioEsperado);
  const diferenca = Math.abs(registrado - esperado);
  return diferenca <= TOLERANCIA_MINUTOS;
}

/**
 * Obtém o dia da semana (0=Segunda, 6=Domingo)
 */
function getDiaSemana(data: Date): number {
  const dia = data.getDay();
  return dia === 0 ? 6 : dia - 1;
}

/**
 * Busca a regra de escala do funcionário
 */
async function buscarRegraEscala(funcionarioId: string): Promise<RegraEscala | null> {
  // Primeiro buscar o código de escala do funcionário
  const { data: funcionario, error: funcError } = await supabase
    .from('funcionarios')
    .select('codigo_escala')
    .eq('id', funcionarioId)
    .single();

  if (funcError || !funcionario?.codigo_escala) {
    return null;
  }

  // Buscar a regra de escala
  const { data: regra, error: regraError } = await supabase
    .from('regras_escalas')
    .select('*')
    .eq('codigo_escala', funcionario.codigo_escala)
    .eq('ativa', true)
    .single();

  if (regraError || !regra) {
    return null;
  }

  return regra as RegraEscala;
}

/**
 * Verifica se é feriado, considerando a cidade/estado do posto do funcionário.
 */
async function verificarFeriado(data: Date, funcionarioId?: string): Promise<boolean> {
  const dataStr = data.toISOString().split('T')[0];

  const { data: feriadosDia, error } = await supabase
    .from('feriados')
    .select('*')
    .eq('data_feriado', dataStr);

  if (error || !feriadosDia || feriadosDia.length === 0) return false;

  // Buscar cidade/estado do posto do funcionário (se informado)
  let cidade: string | null | undefined;
  let estado: string | null | undefined;
  if (funcionarioId) {
    const { data: func } = await supabase
      .from('funcionarios')
      .select('posto_trabalho:postos_trabalho(cidade, estado)')
      .eq('id', funcionarioId)
      .maybeSingle();
    cidade = (func as any)?.posto_trabalho?.cidade;
    estado = (func as any)?.posto_trabalho?.estado;
  }

  const { filtrarFeriadosPorLocalidade } = await import('../utils/feriadosFilter');
  const aplicaveis = filtrarFeriadosPorLocalidade(feriadosDia, cidade, estado);
  return aplicaveis.length > 0;
}

/**
 * Determina se o funcionário deve trabalhar no dia e qual o horário esperado
 * consultando diretamente a tabela escala_mensal (dias_trabalhados).
 */
async function determinarHorarioEsperado(
  regra: RegraEscala,
  funcionarioId: string,
  data: Date,
  ehFeriado: boolean
): Promise<{ trabalha: boolean; entrada?: string; saida?: string }> {
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();
  const dia = data.getDate();

  // Consultar escala_mensal para o dia exato
  const { data: escalaMensal } = await supabase
    .from('escala_mensal')
    .select('dias_trabalhados')
    .eq('funcionario_id', funcionarioId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle();

  if (escalaMensal?.dias_trabalhados) {
    let diasTrabalhados: any[] = [];
    try {
      const raw = typeof escalaMensal.dias_trabalhados === 'string'
        ? JSON.parse(escalaMensal.dias_trabalhados)
        : escalaMensal.dias_trabalhados;

      if (Array.isArray(raw)) {
        // Formato array: [{dia: 1, status: 'TRABALHO', entrada: '08:00', saida: '17:00'}, ...]
        diasTrabalhados = raw;
      } else if (raw && typeof raw === 'object') {
        // Formato objeto: {"dia_1": {status, entrada, saida}, ...} ou {"1": {...}}
        diasTrabalhados = Object.entries(raw).map(([chave, valor]: [string, any]) => {
          const numDia = parseInt(chave.replace('dia_', ''), 10);
          return { dia: numDia, ...valor };
        });
      }
    } catch { /* fallback abaixo */ }

    const diaInfo = diasTrabalhados.find((d: any) => Number(d.dia) === dia);
    if (diaInfo) {
      // Formato com status explícito (array)
      if (diaInfo.status === 'FOLGA' || diaInfo.status === 'FERIADO') {
        return { trabalha: false };
      }
      if (diaInfo.status === 'TRABALHO') {
        return {
          trabalha: true,
          entrada: diaInfo.entrada || undefined,
          saida: diaInfo.saida || undefined,
        };
      }
      // Formato objeto sem status — se tem entrada/saida, trabalha; se não tem, folga
      if (!diaInfo.status) {
        if (diaInfo.entrada && diaInfo.saida) {
          return { trabalha: true, entrada: diaInfo.entrada, saida: diaInfo.saida };
        }
        return { trabalha: false };
      }
    }
  }

  // Fallback: usar regras_escalas quando não há escala_mensal cadastrada
  const diaSemana = getDiaSemana(data);
  const diaSemanaStr = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'][diaSemana];

  if (ehFeriado) {
    if (!regra.trabalha_feriado) return { trabalha: false };
    const h = regra.horarios_feriado as { entrada: string; saida: string } | null;
    return h?.entrada ? { trabalha: true, entrada: h.entrada, saida: h.saida } : { trabalha: false };
  }

  const trabalhaNoDia = (regra as any)[`trabalha_${diaSemanaStr}`];
  if (trabalhaNoDia === false) return { trabalha: false };

  const horarios = (regra as any)[`horarios_${diaSemanaStr}`] as { entrada: string; saida: string } | null;
  if (horarios?.entrada) return { trabalha: true, entrada: horarios.entrada, saida: horarios.saida };

  const base = regra.horarios_segunda as { entrada: string; saida: string } | null;
  if (base?.entrada) return { trabalha: true, entrada: base.entrada, saida: base.saida };

  return { trabalha: true };
}

/**
 * Valida o registro de ponto do funcionário
 */
export async function validarRegistroPonto(
  funcionarioId: string,
  postoTrabalhoId: string,
  postoTrabalhoIdEsperado: string | null,
  horarioRegistro: string,
  tipoRegistro: 'entrada' | 'inicio_refeicao' | 'fim_refeicao' | 'saida'
): Promise<ResultadoValidacao> {
  const inconsistencias: Inconsistencia[] = [];
  const hoje = new Date();
  
  // Ignorar refeições conforme solicitado
  if (tipoRegistro === 'inicio_refeicao' || tipoRegistro === 'fim_refeicao') {
    // Ainda verificar posto diferente
    if (postoTrabalhoIdEsperado && postoTrabalhoId !== postoTrabalhoIdEsperado) {
      const { data: postoEsperado } = await supabase
        .from('postos_trabalho')
        .select('nome_posto')
        .eq('id', postoTrabalhoIdEsperado)
        .single();
      
      const { data: postoRegistrado } = await supabase
        .from('postos_trabalho')
        .select('nome_posto')
        .eq('id', postoTrabalhoId)
        .single();

      inconsistencias.push({
        tipo: 'POSTO_DIFERENTE',
        descricao: `Registro em posto diferente do alocado`,
        posto_esperado: postoEsperado?.nome_posto || 'Não definido',
        posto_registrado: postoRegistrado?.nome_posto || 'Desconhecido'
      });
    }

    return {
      valido: inconsistencias.length === 0,
      inconsistencias,
      ehDiaFolga: false,
      ehPostoDiferente: inconsistencias.some(i => i.tipo === 'POSTO_DIFERENTE')
    };
  }

  // Verificar se é posto diferente
  const ehPostoDiferente = postoTrabalhoIdEsperado !== null && postoTrabalhoId !== postoTrabalhoIdEsperado;
  
  if (ehPostoDiferente) {
    const { data: postoEsperado } = await supabase
      .from('postos_trabalho')
      .select('nome_posto')
      .eq('id', postoTrabalhoIdEsperado)
      .single();
    
    const { data: postoRegistrado } = await supabase
      .from('postos_trabalho')
      .select('nome_posto')
      .eq('id', postoTrabalhoId)
      .single();

    inconsistencias.push({
      tipo: 'POSTO_DIFERENTE',
      descricao: `Você está registrando ponto em um posto diferente do seu posto de alocação`,
      posto_esperado: postoEsperado?.nome_posto || 'Não definido',
      posto_registrado: postoRegistrado?.nome_posto || 'Desconhecido'
    });
  }

  // Buscar regra de escala
  const regra = await buscarRegraEscala(funcionarioId);
  
  if (!regra) {
    // Sem escala definida - não há como validar horários
    return {
      valido: inconsistencias.length === 0,
      inconsistencias: inconsistencias.length > 0 ? inconsistencias : [{
        tipo: 'SEM_ESCALA',
        descricao: 'Escala não definida para este funcionário. O horário não pode ser validado.',
        horario_registrado: horarioRegistro
      }],
      ehDiaFolga: false,
      ehPostoDiferente
    };
  }

  // Garantir que o cache está carregado
  await garantirCache();

  // Verificar feriado
  const ehFeriado = await verificarFeriado(hoje, funcionarioId);

  // Verificar se trabalha hoje usando o cache
  if (!trabalhaNoDia(regra.codigo_escala, hoje.getDay(), ehFeriado)) {
    inconsistencias.push({
      tipo: 'DIA_FOLGA',
      descricao: ehFeriado
        ? 'Hoje é feriado e você não deveria trabalhar segundo sua escala'
        : 'Hoje é seu dia de folga segundo sua escala',
      horario_registrado: horarioRegistro
    });
    return { valido: false, inconsistencias, ehDiaFolga: true, ehPostoDiferente };
  }

  // Buscar horários do dia via cache
  const horariosDia = getHorariosDia(regra.codigo_escala, hoje.getDay(), ehFeriado);
  const horarioEsperado = horariosDia
    ? { trabalha: true, entrada: horariosDia.entrada, saida: horariosDia.saida }
    : { trabalha: true };

  // Validar horário com tolerância de 5 minutos
  if (horarioEsperado.entrada && horarioEsperado.saida) {
    const horarioEsperadoStr = tipoRegistro === 'entrada'
      ? horarioEsperado.entrada
      : horarioEsperado.saida;

    if (!dentroTolerancia(horarioRegistro, horarioEsperadoStr)) {
      const registradoMin = horarioParaMinutos(horarioRegistro);
      const esperadoMin = horarioParaMinutos(horarioEsperadoStr);
      const diferencaMin = registradoMin - esperadoMin;
      
      let descricao = '';
      if (tipoRegistro === 'entrada') {
        if (diferencaMin > 0) {
          descricao = `Entrada ${Math.abs(diferencaMin)} minutos atrasada`;
        } else {
          descricao = `Entrada ${Math.abs(diferencaMin)} minutos antecipada`;
        }
      } else {
        if (diferencaMin > 0) {
          descricao = `Saída ${Math.abs(diferencaMin)} minutos após o previsto`;
        } else {
          descricao = `Saída ${Math.abs(diferencaMin)} minutos antecipada`;
        }
      }

      inconsistencias.push({
        tipo: 'HORARIO_FORA_TOLERANCIA',
        descricao,
        horario_esperado: horarioEsperadoStr,
        horario_registrado: horarioRegistro
      });
    }

    return {
      valido: inconsistencias.length === 0,
      inconsistencias,
      horarioEsperado: {
        entrada: horarioEsperado.entrada,
        saida: horarioEsperado.saida
      },
      ehDiaFolga: false,
      ehPostoDiferente
    };
  }

  return {
    valido: inconsistencias.length === 0,
    inconsistencias,
    ehDiaFolga: false,
    ehPostoDiferente
  };
}

/**
 * Hook para usar a validação de horário de ponto
 */
export function useValidacaoHorarioPonto() {
  return {
    validarRegistroPonto
  };
}
