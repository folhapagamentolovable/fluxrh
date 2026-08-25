// Utilitário para cálculo de folha de pagamento

import type { FolhaPonto, ParametrosCalculo, Funcionario } from '../lib/supabase';

// Array de nomes dos meses
const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export interface ResultadoCalculoFolha {
  // Proventos
  salario_base: number;
  horas_extras_50: number;
  horas_extras_100: number;
  adicional_noturno: number;
  intrajornada_50: number;
  intrajornada_100: number;
  dsr_horas_extras: number;
  dsr_adicional_noturno: number;
  adicional_insalubridade: number;
  adicional_acumulo_funcao: number;
  salario_familia: number;
  complemento_salario: number;
  vale_transporte: number;
  vale_transporte_mes_anterior: number;
  vale_transporte_mes_atual: number;
  vale_alimentacao: number;
  vale_alimentacao_mes_anterior: number;
  vale_alimentacao_mes_atual: number;
  cesta_basica: number;
  plr: number;
  premio_permanencia: number;
  
  // Folgas trabalhadas contabilizadas para VA/VT
  folgas_trabalhadas_vt: number;
  folgas_trabalhadas_va: number;
  
  // Valores monetários de VT/VA por folgas trabalhadas
  valor_vt_folgas_trabalhadas?: number;
  valor_va_folgas_trabalhadas?: number;
  
  // Dias de referência para VT/VA
  dias_vt_mes_anterior?: number;
  dias_vt_mes_atual?: number;
  dias_va_mes_anterior?: number;
  dias_va_mes_atual?: number;
  
  // Proventos - 13º Salário
  decimo_terceiro_primeira_parcela?: number;
  decimo_terceiro_segunda_parcela?: number;
  decimo_terceiro_vantagens_primeira_parcela?: number;
  decimo_terceiro_vantagens_segunda_parcela?: number;
  decimo_terceiro_integral?: number;
  vantagens_13?: number;
  
  // Proventos - Serviços Externos e Outros
  servicos_externos_folhas_pagamento?: number;
  servicos_externos_controle_rondas?: number;
  folga_trabalhada?: number;
  reembolsos_uber?: number;
  supervisao_palmeiras?: number;
  
  // Proventos - Rescisão
  decimo_terceiro_proporcional_rescisao?: number;
  ferias_proporcionais_rescisao?: number;
  um_terco_ferias_proporcional_rescisao?: number;
  plr_proporcional_rescisao?: number;
  decimo_terceiro_vantagens_rescisao?: number;
  
  // Descontos
  desconto_inss: number;
  desconto_irrf: number;
  desconto_vt: number;
  desconto_vt_faltas: number;
  desconto_va_faltas: number;
  desconto_seguro_vida: number;
  desconto_convenio_odonto: number;
  desconto_contribuicao_assistencial: number;
  desconto_atrasos: number;
  desconto_faltas: number;
  desconto_dsr_faltas: number; // Desconto DSR s/ Faltas (Limpeza/Zeladoria) - CLT
  dias_dsr_faltas: number; // Quantidade de dias de DSR descontados
  desconto_plr: number;
  desconto_pensao_alimenticia: number;
  desconto_rondas_nao_realizadas: number;
  desc_rondas_nao_realizadas_benef: number;
  desconto_adiantamento_quinzenal: number;
  desconto_complemento_anterior: number;
  desconto_adiantamento_salario: number;
  desc_avaria_utilitario: number;
  
  // Descontos - 13º Salário
  inss_13?: number;
  inss_ferias?: number;
  adiantamento_13_salario?: number;
  adiantamento_vantagens_13?: number;
  
  // Benefícios - Descontos
  desc_ajuste_beneficios?: number;
  
  // Totais
  total_proventos: number;
  total_descontos: number;
  total_beneficios: number;
  salario_liquido: number;
  
  // Bases de cálculo
  base_inss: number;
  base_irrf: number;
  base_fgts: number;
  
  // Encargos
  fgts: number;
  inss_patronal: number;
}

/**
 * Trunca (corta) um valor para 2 casas decimais SEM arredondar
 * Exemplo: 196.8599 → 196.85 (não arredonda para 196.86)
 * Isso garante que a soma dos valores exibidos seja igual ao total
 */
function truncar(valor: number): number {
  return Math.floor(valor * 100) / 100;
}

/**
 * Calcula o valor de uma hora de trabalho baseado no salário e jornada
 */
function calcularValorHora(salarioBase: number, jornadaMensal: number): number {
  return salarioBase / jornadaMensal;
}

/**
 * Calcula DSR (Descanso Semanal Remunerado) sobre horas extras ou adicional noturno
 * Seguindo a fórmula: (Valor Total / Dias Úteis) * Dias Não Úteis
 */
function calcularDSR(valorVariavel: number, diasUteis: number, domingosFeriados: number): number {
  if (diasUteis <= 0) return 0;
  return (valorVariavel / diasUteis) * domingosFeriados;
}

/**
 * Calcula INSS baseado na tabela progressiva dos parâmetros
 * MÉTODO: Progressivo por faixa com TRUNCAMENTO (não arredondamento)
 * 
 * Exemplo (Base R$ 2.264,60):
 * - Faixa 1: R$ 1.621,00 × 7,5% = 121,575 → trunca 121,57
 * - Faixa 2: R$ 643,60 × 9% = 57,924 → trunca 57,92
 * - Total: 121,57 + 57,92 = R$ 179,49
 */
export function calcularINSS(salarioBruto: number, parametros: ParametrosCalculo): number {
  // Montar faixas a partir dos parâmetros do banco
  const faixas = [
    { 
      limite: parametros.inss_faixa1_limite || 0, 
      aliquota: (parametros.inss_faixa1_aliquota || 0) / 100
    },
    { 
      limite: parametros.inss_faixa2_limite || 0, 
      aliquota: (parametros.inss_faixa2_aliquota || 0) / 100
    },
    { 
      limite: parametros.inss_faixa3_limite || 0, 
      aliquota: (parametros.inss_faixa3_aliquota || 0) / 100
    },
    { 
      limite: parametros.inss_faixa4_limite || 0, 
      aliquota: (parametros.inss_faixa4_aliquota || 0) / 100
    }
  ];
  
  // Calcular INSS progressivo por faixa
  let inssTotal = 0;
  let baseRestante = salarioBruto;
  let limiteAnterior = 0;
  
  for (const faixa of faixas) {
    if (baseRestante <= 0) break;
    
    // Calcular quanto da base cai nesta faixa
    const limiteFaixa = faixa.limite - limiteAnterior;
    const baseNaFaixa = Math.min(baseRestante, limiteFaixa);
    
    // Calcular INSS desta faixa e TRUNCAR (não arredondar)
    const inssFaixa = truncar(baseNaFaixa * faixa.aliquota);
    inssTotal += inssFaixa;
    
    // Atualizar para próxima faixa
    baseRestante -= baseNaFaixa;
    limiteAnterior = faixa.limite;
    
    // Se a base está dentro desta faixa, parar
    if (salarioBruto <= faixa.limite) break;
  }
  
  // Arredondar o total final para 2 casas decimais
  return Number(inssTotal.toFixed(2));
}

/**
 * Calcula IRRF baseado na tabela progressiva dos parâmetros
 * ATUALIZADO: Isenção lida da tabela parametros_calculo (isencao_irpf) — atualmente R$ 5.000,00 (Lei 2026)
 */
export function calcularIRRF(salarioBruto: number, inss: number, parametros: ParametrosCalculo, dependentes: number = 0, salarioBrutoParaIsencao?: number): number {
  // NOVA REGRA (2026): Isenção de IRRF para salário bruto até o limite configurado em parametros_calculo.isencao_irpf (R$ 5.000,00)
  const limiteIsencaoSalarioBruto = parametros.isencao_irpf || 5000.00;
  const salarioBrutoVerificacao = salarioBrutoParaIsencao !== undefined ? salarioBrutoParaIsencao : salarioBruto;
  
  if (salarioBrutoVerificacao <= limiteIsencaoSalarioBruto) {
    return 0;
  }
  
  // Dedução por dependente (valor fixo 2024)
  const deducaoPorDependente = 189.59;
  const baseCalculo = salarioBruto - inss - (dependentes * deducaoPorDependente);
  
  // Verificar isenção sobre a base de cálculo (usa valor do banco)
  if (baseCalculo <= limiteIsencaoSalarioBruto) {
    return 0;
  }
  
  // Tabela IRRF 2024 (temporário - TODO: migrar para banco de dados)
  const faixas = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 }
  ];
  
  for (const faixa of faixas) {
    if (baseCalculo <= faixa.limite) {
      const irrf = (baseCalculo * faixa.aliquota) - faixa.deducao;
      return Math.max(0, Number(irrf.toFixed(2)));
    }
  }
  
  return 0;
}

/**
 * Calcula a folha de pagamento completa
 */
export function calcularFolhaPagamento(
  folhaPonto: FolhaPonto,
  funcionario: Funcionario,
  parametros: ParametrosCalculo,
  salarioBase: number,
  jornadaMensal: number = 220, // horas padrão por mês
  folhaPontoMesAnterior?: FolhaPonto, // folha de ponto do mês anterior (para cálculo de VT/VA)
  escalaMensalProximoMes?: any, // escala mensal do PRÓXIMO mês (para VT/VA antecipado)
  folhasPontoSemestre?: FolhaPonto[], // folhas de ponto do semestre (para cálculo de PLR com desconto por faltas)
  descontoRondasNaoRealizadas: number = 0, // desconto de rondas não realizadas (vem dos eventos excepcionais)
  descontoAvariaUtilitario: number = 0, // desconto de avaria de utilitário (vem dos eventos excepcionais)
  eventosExcepcionaisProventos: number = 0, // soma dos eventos excepcionais de proventos (para base INSS/IRRF/FGTS)
  eventosExcepcionais: any[] = [] // lista completa de eventos excepcionais (para campos específicos como adiantamento de salário)
): ResultadoCalculoFolha {

  
  // ========================================
  // VERIFICAR SE FUNCIONÁRIO ESTÁ INATIVO (AFASTADO)
  // ========================================
  const funcionarioInativo = funcionario.ativo === false;
  
  if (funcionarioInativo) {
  }
  
  // ========================================
  // CÁLCULO DO SALÁRIO PROPORCIONAL
  // ========================================
  
  // ========================================
  // CÁLCULO DE DIAS CORRIDOS TRABALHADOS
  // ========================================
  // REGRA: Conta dias trabalhados + folgas + feriados
  // NÃO conta: Faltas e atestados (descontados à parte)
  
  const ano = folhaPonto.ano;
  const mes = folhaPonto.mes;
  const diasDoMes = new Date(ano, mes, 0).getDate();
  
  // ========================================
  // CALCULAR DIAS CORRIDOS TRABALHADOS
  // ========================================
  let diasCorridosTrabalhados = 30; // Padrão: 30 dias fixos (CLT - mês completo)
  let isPeriodoParcialAdmissaoDemissao = false; // Flag: proporcionalidade por admissão/demissão
  
  // Se tem data_inicio ou data_fim, calcular dias reais (admissão/demissão)
  const folhaComDatas = folhaPonto as any;
  if (folhaComDatas.data_inicio || folhaComDatas.data_fim) {
    const dataInicio = folhaComDatas.data_inicio 
      ? new Date(folhaComDatas.data_inicio + 'T00:00:00')
      : new Date(ano, mes - 1, 1);
    
    const dataFim = folhaComDatas.data_fim 
      ? new Date(folhaComDatas.data_fim + 'T00:00:00')
      : new Date(ano, mes, 0);
    
    // Calcular diferença em dias (inclusivo)
    const diffTime = dataFim.getTime() - dataInicio.getTime();
    diasCorridosTrabalhados = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    isPeriodoParcialAdmissaoDemissao = diasCorridosTrabalhados < 30;
    
  } else if (folhaPonto.dados_dias) {
    // ALTERNATIVA: Se não tem data_inicio/data_fim, contar dias no dados_dias
    // Isso permite calcular proporcional quando o usuário deleta dias da folha
    const dadosDias = typeof folhaPonto.dados_dias === 'string' 
      ? JSON.parse(folhaPonto.dados_dias) 
      : folhaPonto.dados_dias;
    
    const totalDiasNaFolha = Object.keys(dadosDias).length;
    
    // Verificar se o mês naturalmente tem menos de 30 dias (fevereiro, etc.)
    // CLT: mês comercial SEMPRE = 30 dias, independente do calendário
    const diasNaturaisDoMes = new Date(ano, mes, 0).getDate();
    
    // Só considerar período parcial se o total de dias na folha for MENOR
    // que os dias naturais do mês (ou seja, dias foram realmente deletados/removidos)
    // Se o mês tem 28 dias (fevereiro) e a folha tem 28 dias, é mês COMPLETO = 30 dias CLT
    if (totalDiasNaFolha < diasNaturaisDoMes) {
      diasCorridosTrabalhados = totalDiasNaFolha;
      
    } else {
      // Mês completo: usar 30 dias (CLT)
    }
  }
  
  // REGRA ESPECIAL: Funcionário INATIVO sempre usa 30 dias fixos (mês completo de faltas)
  if (funcionarioInativo) {
    diasCorridosTrabalhados = 30;
  }
  
  // ========================================
  // CÁLCULO DO SALÁRIO PROPORCIONAL
  // ========================================
  // REGRA CLT: Divisor é SEMPRE 30 (não o número de dias do mês)
  // Fórmula: (Salário Base / 30) × Dias Corridos Trabalhados
  // Dias Corridos = Dias trabalhados + Folgas + Feriados (SEM descontar faltas)
  
  const divisorLegal = 30; // CLT - divisor fixo
  
  const salarioProporcional = (salarioBase / divisorLegal) * diasCorridosTrabalhados;
  
  // ========================================
  // CONTAR FALTAS E SUSPENSÕES CORRETAMENTE
  // ========================================
  // Primeiro: tentar obter de total_faltas_injustificadas
  // Se for 0 ou null, verificar se há faltas nos dados_dias
  let faltasInjustificadas = folhaPonto.total_faltas_injustificadas || 0;
  let suspensoesTotal = (folhaPonto as any).total_suspensoes || 0;
  
  // Se não encontrou faltas nos totais, tentar contar dos dados_dias
  if (faltasInjustificadas === 0 && folhaPonto.dados_dias) {
    const dadosDias = typeof folhaPonto.dados_dias === 'string'
      ? JSON.parse(folhaPonto.dados_dias)
      : folhaPonto.dados_dias;
    
    let faltasContadas = 0;
    let suspensoesContadas = 0;
    
    Object.values(dadosDias).forEach((dados: any) => {
      if (dados.falta_injustificada === true) faltasContadas++;
      if (dados.suspensao === true) suspensoesContadas++;
    });
    
    if (faltasContadas > 0 || suspensoesContadas > 0) {
      faltasInjustificadas = faltasContadas;
      suspensoesTotal = suspensoesContadas;
    }
  }
  
  
  // ========================================
  // CALCULAR DIAS DSR SOBRE FALTAS (para proporcionalidade)
  // ========================================
  // O DSR sobre faltas também deve reduzir a proporcionalidade dos adicionais
  // pois representa dias de remuneração perdidos
  let dias_dsr_faltas_para_proporcionalidade = 0;
  
  // Códigos de escala de Limpeza e Zeladoria
  const ESCALAS_LIMPEZA_ZELADORIA_PROP = [
    'GALLIMPT1', 'GALZELADT1', 'FIGZELADT1', 
    'PALMLIMPT1', 'PALMLIMPT2', 
    'FIGLIMPT1', 'FIGLIMPT2'
  ];
  
  const codigoEscalaFuncProp = (
    funcionario.codigo_escala || 
    funcionario.cargo?.escala?.codigo_escala ||
    ''
  ).toUpperCase();
  
  const nomeCargoFuncProp = (funcionario.nome_cargo || funcionario.cargo?.nome_cargo || '').toUpperCase();
  
  const isLimpezaZeladoriaProp = 
    ESCALAS_LIMPEZA_ZELADORIA_PROP.some(esc => codigoEscalaFuncProp === esc) ||
    codigoEscalaFuncProp.includes('LIM') || 
    codigoEscalaFuncProp.includes('ZEL') ||
    nomeCargoFuncProp.includes('LIMPEZA') ||
    nomeCargoFuncProp.includes('ZELADORIA');
  
  // Calcular dias DSR para proporcionalidade (só para Limpeza/Zeladoria)
  if (isLimpezaZeladoriaProp && (faltasInjustificadas > 0 || suspensoesTotal > 0)) {
    // Analisar dados_dias para identificar semanas com faltas
    const faltasPorSemanaProp: { [semana: number]: boolean } = {};
    let faltasEncontradasProp = false;
    
    if (folhaPonto.dados_dias) {
      const dadosDiasProp = typeof folhaPonto.dados_dias === 'string'
        ? JSON.parse(folhaPonto.dados_dias)
        : folhaPonto.dados_dias;
      
      Object.entries(dadosDiasProp).forEach(([dia, dados]: [string, any]) => {
        const diaNum = parseInt(dia.replace(/\D/g, ''));
        if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) return;
        
        const primeiroDiaDoMesProp = new Date(ano, mes - 1, 1);
        const diaSemanaProp = primeiroDiaDoMesProp.getDay();
        const numSemanaProp = Math.ceil((diaNum + diaSemanaProp) / 7);
        
        if (dados.falta_injustificada === true || dados.suspensao === true) {
          faltasPorSemanaProp[numSemanaProp] = true;
          faltasEncontradasProp = true;
        }
      });
    }
    
    if (faltasEncontradasProp) {
      dias_dsr_faltas_para_proporcionalidade = Object.keys(faltasPorSemanaProp).length;
    } else {
      // Fallback: cada falta/suspensão = 1 semana de DSR (max 4)
      const totalOcorrenciasProp = faltasInjustificadas + suspensoesTotal;
      dias_dsr_faltas_para_proporcionalidade = Math.min(totalOcorrenciasProp, 4);
    }
    
  }
  
  // ========================================
  // DIAS EFETIVOS PARA ADICIONAIS
  // ========================================
  // Os adicionais de insalubridade e acúmulo de função devem ser 
  // proporcionais aos DIAS EFETIVAMENTE TRABALHADOS
  // Descontando: faltas + suspensões + DSR sobre faltas (para Limpeza/Zeladoria)
  // Ex: 3 faltas no mês + 3 DSRs perdidos = adicional calculado sobre 24/30 avos
  const diasEfetivosParaAdicionais = Math.max(0, diasCorridosTrabalhados - faltasInjustificadas - suspensoesTotal - dias_dsr_faltas_para_proporcionalidade);
  
  
  // ✅ CORREÇÃO: Valor da hora SEMPRE baseado no salário base integral
  // Mesmo em período parcial, HE e intrajornadas usam salário base
  const valorHora = calcularValorHora(salarioBase, jornadaMensal);
  
  
  // ========================================
  // PROVENTOS
  // ========================================
  
  // ========================================
  // CALCULAR DIAS ÚTEIS E NÃO ÚTEIS (PARA DSR)
  // ========================================
  // Regra solicitada: Considerar a quantidade exata de cada mês (28, 29, 30 ou 31 dias)
  // Dias úteis = Segunda a Sábado (exceto feriados)
  // Dias não úteis = Domingos + Feriados
  
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0); // Último dia do mês (28, 29, 30 ou 31)
  const totalDiasNoMes = ultimoDia.getDate();
  
  let diasUteis = 0;
  let diasNaoUteis = 0;
  let feriadosNaoDomingo = 0;

  // 1. Contar domingos e dias úteis preliminares baseados no calendário real
  for (let diaCont = 1; diaCont <= totalDiasNoMes; diaCont++) {
    const dataRef = new Date(ano, mes - 1, diaCont);
    if (dataRef.getDay() === 0) { // Domingo
      diasNaoUteis++;
    } else { // Segunda a Sábado
      diasUteis++;
    }
  }

  // 2. Ajustar por feriados registrados na folha de ponto
  if (folhaPonto.dados_dias) {
    const dadosDias = typeof folhaPonto.dados_dias === 'string' 
      ? JSON.parse(folhaPonto.dados_dias) 
      : folhaPonto.dados_dias;
    
    Object.entries(dadosDias).forEach(([diaKey, diaData]: [string, any]) => {
      if (diaData.feriado) {
        const numeroDia = parseInt(diaKey.replace('dia_', ''));
        if (numeroDia >= 1 && numeroDia <= totalDiasNoMes) {
          const dataFeriado = new Date(ano, mes - 1, numeroDia);
          // Só conta feriado se não for domingo (pois domingo já foi contado como não útil)
          if (dataFeriado.getDay() !== 0) {
            feriadosNaoDomingo++;
          }
        }
      }
    });
  }
  
  // Ajuste final: Move feriados de dias úteis para não úteis
  diasUteis -= feriadosNaoDomingo;
  diasNaoUteis += feriadosNaoDomingo;
  
  // Garantia: diasUteis + diasNaoUteis deve ser igual a totalDiasNoMes (28, 29, 30 ou 31)
  
  
  // Horas extras 50% - TRUNCAR resultado
  const horas_extras_50 = truncar((folhaPonto.total_horas_extras_50 || 0) * valorHora * 1.5);
  
  // Horas extras 100% - TRUNCAR resultado
  const horas_extras_100 = truncar((folhaPonto.total_horas_extras_100 || 0) * valorHora * 2);
  
  // Adicional noturno (20% sobre o valor da hora) - TRUNCAR resultado
  const adicional_noturno = truncar((folhaPonto.total_horas_noturnas || 0) * valorHora * 0.2);
  
  // Intrajornada 50% - TRUNCAR resultado
  const intrajornada_50 = truncar((folhaPonto.total_intrajornada_50 || 0) * valorHora * 1.5);
  
  // Intrajornada 100% - TRUNCAR resultado
  const intrajornada_100 = truncar((folhaPonto.total_intrajornada_100 || 0) * valorHora * 2.0);
  
  // DSR sobre horas extras - TRUNCAR resultado
  // Fórmula: [valor_HE_50% + valor_HE_100% + valor_intra_50% + valor_intra_100%] ÷ dias_úteis × dias_não_úteis
  const totalValorHorasExtras = horas_extras_50 + horas_extras_100 + intrajornada_50 + intrajornada_100;
  const dsr_horas_extras = truncar(calcularDSR(totalValorHorasExtras, diasUteis, diasNaoUteis));
  
  // DSR sobre adicional noturno - TRUNCAR resultado
  const dsr_adicional_noturno = truncar(calcularDSR(adicional_noturno, diasUteis, diasNaoUteis));
  
  // ========================================
  // ADICIONAL DE INSALUBRIDADE (CLT Art. 192)
  // ========================================
  // Base: X% do SALÁRIO MÍNIMO NACIONAL vigente
  // Proporcional aos DIAS EFETIVAMENTE TRABALHADOS (descontando faltas/suspensões)
  // Ex: 3 faltas = adicional calculado sobre 27/30 avos do salário mínimo
  const insalubridadeIntegral = (parametros.salario_minimo || 0) * ((parametros.percentual_insalubridade || 0) / 100);
  const adicional_insalubridade = funcionario.adicional_insalubridade 
    ? truncar(insalubridadeIntegral * (diasEfetivosParaAdicionais / 30))
    : 0;
  
  // ========================================
  // ADICIONAL POR ACÚMULO DE FUNÇÃO
  // ========================================
  // Base: X% do SALÁRIO BASE do funcionário
  // Proporcional aos DIAS EFETIVAMENTE TRABALHADOS (descontando faltas/suspensões)
  // Ex: 3 faltas = adicional calculado sobre 27/30 avos do salário base
  const acumuloFuncaoIntegral = salarioBase * ((parametros.percentual_acumulo_funcao || 0) / 100);
  const adicional_acumulo_funcao = funcionario.acumulo_funcao
    ? truncar(acumuloFuncaoIntegral * (diasEfetivosParaAdicionais / 30))
    : 0;
  
  
  // ========================================
  // CALCULAR SALÁRIO BRUTO (necessário para Salário Família)
  // ========================================
  // NOTA: Este salário bruto é usado apenas para verificar direito ao salário família
  // O salário bruto para INSS/IRRF será calculado depois, incluindo desconto de faltas
  const salario_bruto = salarioProporcional + 
    horas_extras_50 + horas_extras_100 + 
    adicional_noturno + 
    intrajornada_50 + intrajornada_100 +
    dsr_horas_extras + dsr_adicional_noturno +
    adicional_insalubridade + adicional_acumulo_funcao;
  
  // ========================================
  // SALÁRIO FAMÍLIA
  // ========================================
  // Regras para ter direito:
  // 1. Funcionário deve ser registrado (carteira assinada)
  // 2. Ter filhos < 14 anos (campo quantidade_filhos)
  // 3. Remuneração mensal bruta <= R$ 1.906,04
  // 4. Valor: R$ 65,00 por filho (cumulativo)
  
  let salario_familia = 0;
  
  // Verificar se funcionário é registrado
  const funcionarioRegistrado = funcionario.funcionario_registrado !== undefined ? funcionario.funcionario_registrado : true;
  
  // Verificar se tem filhos < 14 anos
  const quantidadeFilhos = funcionario.quantidade_filhos || 0;
  
  // Limite de remuneração para ter direito ao salário família (2025)
  const limiteRemuneracaoSalarioFamilia = 1906.04;
  
  if (funcionarioRegistrado && quantidadeFilhos > 0 && salario_bruto <= limiteRemuneracaoSalarioFamilia) {
    salario_familia = quantidadeFilhos * parametros.salario_familia;
    
  } else {
  }
  
  // ========================================
  // CÁLCULO DE VALE TRANSPORTE E VALE ALIMENTAÇÃO
  // ========================================
  
  // ========================================
  // CÁLCULO DE VT/VA - USAR FOLHA DE PONTO DO MÊS SEGUINTE
  // ========================================
  // SIMPLES: Contar dias trabalhados na folha de ponto do mês seguinte
  
  let diasTrabalhadosVT_referencia = 0;
  let diasTrabalhadosVA_referencia = 0;
  let folgasTrabalhadasVT_referencia = 0; // Folgas trabalhadas contadas para VT
  let folgasTrabalhadasVA_referencia = 0; // Folgas trabalhadas contadas para VA
  
  const mesReferencia = mes;
  const anoReferencia = ano;
  
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  
  
  // Detectar se funcionário é Vigia/Vigilante (regra especial: feriado trabalhado NÃO é FT)
  const cargoNomeProx = (funcionario.nome_cargo || funcionario.cargo?.nome_cargo || '').toUpperCase();
  const isVigiaCalcVtVa = cargoNomeProx.includes('VIGIA') || cargoNomeProx.includes('VIGILANTE');

  // Usar folha de ponto do mês seguinte (já tem tudo calculado)
  if (escalaMensalProximoMes && escalaMensalProximoMes.dados_dias) {
    const dados = typeof escalaMensalProximoMes.dados_dias === 'string'
      ? JSON.parse(escalaMensalProximoMes.dados_dias)
      : escalaMensalProximoMes.dados_dias;
    
    // Contar dias trabalhados (com entrada e saída)
    Object.values(dados).forEach((d: any) => {
      // ⭐ NOVA REGRA FT: dias com ft_manual=true são pagos via diária integral
      //    (R$200 Vigia/Aux. Limpeza, R$250 Zelador) que JÁ inclui VT e VA.
      //    Excluí-los das contagens evita pagamento em dobro de benefícios.
      if (d.ft_manual === true) return;

      // CORRIGIDO: Conta qualquer dia com entrada/saída (inclusive folgas trabalhadas)
      if (d.entrada && d.saida) {
        diasTrabalhadosVT_referencia++; // Todos os dias trabalhados (incluindo folgas)

        // ⭐ REGRA ATUALIZADA: FT (Folga Trabalhada) NÃO gera mais VT/VA suplementares.
        // FT é um benefício isolado em forma de DIÁRIA (R$) por função (Vigia/Aux. Limpeza/Zelador),
        // configurada na Tabela de Apoio. NÃO somar mais folgasTrabalhadasVT/VA aqui.

        // Calcular horas para VA (≥6h)
        const [hE, mE] = d.entrada.split(':').map(Number);
        const [hS, mS] = d.saida.split(':').map(Number);
        const [hIR, mIR] = (d.inicio_refeicao || '00:00').split(':').map(Number);
        const [hTR, mTR] = (d.termino_refeicao || '00:00').split(':').map(Number);

        let totalMin = (hS * 60 + mS) - (hE * 60 + mE);
        if (totalMin < 0) totalMin += 24 * 60;
        totalMin -= (hTR * 60 + mTR) - (hIR * 60 + mIR);

        if (totalMin / 60 >= 6) {
          diasTrabalhadosVA_referencia++; // Apenas ≥6h
        }
      }
    });
    
  } else {
    
    // ⭐ CORREÇÃO: Sem folha de ponto do próximo mês = ZERO VT/VA
    diasTrabalhadosVT_referencia = 0;
    diasTrabalhadosVA_referencia = 0;
  }
  
  // ========================================
  // PROPORCIONALIZAR VT/VA PARA PERÍODO PARCIAL
  // ========================================
  // REGRA: VT/VA são proporcionais aos dias efetivamente trabalhados no mês
  
  // Se funcionário está inativo (afastado), zerar VT/VA do mês seguinte
  if (funcionarioInativo) {
    diasTrabalhadosVT_referencia = 0;
    diasTrabalhadosVA_referencia = 0;
    
  }
  
  
  // ========================================
  // CALCULAR VT - REGRAS:
  // 1. Apenas se funcionário.recebe_vt = true
  // 2. Apenas se funcionário está ativo (não afastado)
  // 3. Usar dias de trabalho do MÊS CORRENTE
  // 4. Multiplicar por 2 (ida e volta)
  // 5. Proporcional aos dias trabalhados
  // ========================================
  let vale_transporte = 0;
  
  // Determinar valor do VT baseado na faixa do funcionário
  const valorVtDiario = (funcionario as any).faixa_vt === 2 
    ? ((parametros as any).vale_transporte_faixa2 || parametros.vale_transporte) 
    : parametros.vale_transporte;
  
  if (funcionario.recebe_vt && !funcionarioInativo) {
    // VT do mês corrente - proporcional aos dias trabalhados
    vale_transporte = valorVtDiario * diasTrabalhadosVT_referencia * 2;
  } else if (!funcionario.recebe_vt) {
  }
  
  // ========================================
  // CALCULAR VA - REGRAS:
  // 1. Todos os funcionários recebem VA (não há campo booleano)
  // 2. Apenas se funcionário está ativo (não afastado)
  // 3. Usar APENAS dias com jornada ≥6h do MÊS CORRENTE
  // 4. Proporcional aos dias trabalhados
  // ========================================
  const vale_alimentacao = !funcionarioInativo 
    ? parametros.vale_alimentacao * diasTrabalhadosVA_referencia
    : 0;
  
  // Nome do mês para exibição
  const mesReferenciaNome = meses[mesReferencia - 1];
  
  // ========================================
  // CALCULAR VT/VA DO MÊS CORRENTE (ADMISSÃO NO MEIO DO MÊS)
  // ========================================
  // REGRA NOVA: Se funcionário foi admitido APÓS o dia 01 do mês corrente,
  // deve receber VA/VT proporcional aos dias trabalhados no mês de admissão
  
  let vale_transporte_mes_anterior = 0;
  let vale_alimentacao_mes_anterior = 0;
  
  // Verificar se há data de admissão e se foi no meio do mês corrente
  const dataAdmissao = funcionario.data_admissao ? new Date(funcionario.data_admissao) : null;
  
  if (dataAdmissao && !funcionarioInativo) {
    const mesAdmissao = dataAdmissao.getMonth() + 1;
    const anoAdmissao = dataAdmissao.getFullYear();
    const diaAdmissao = dataAdmissao.getDate();
    
    // Se foi admitido no mês corrente E após o dia 01
    if (mesAdmissao === mes && anoAdmissao === ano && diaAdmissao > 1) {
      
      // Contar dias efetivamente trabalhados no mês corrente (da folha de ponto)
      let diasTrabalhadosVT_mesCorrente = 0;
      let diasTrabalhadosVA_mesCorrente = 0;
      
      if (folhaPonto.dados_dias) {
        const dadosDias = typeof folhaPonto.dados_dias === 'string' 
          ? JSON.parse(folhaPonto.dados_dias) 
          : folhaPonto.dados_dias;
        
        Object.entries(dadosDias).forEach(([diaKey, diaData]: [string, any]) => {
          // ⭐ NOVA REGRA FT: dia com ft_manual=true é pago via diária integral
          //    e NÃO conta para VT/VA (evita pagamento em dobro).
          if (diaData?.ft_manual === true) return;

          // CORRIGIDO: Conta qualquer dia com entrada/saída (inclusive folgas trabalhadas)
          // Excluindo apenas faltas injustificadas e atestados
          const isDiaTrabalhado = !diaData.falta_injustificada && !diaData.atestado && diaData.entrada && diaData.saida;
          
          if (isDiaTrabalhado) {
            // VT: conta todos os dias trabalhados (se funcionário recebe VT)
            diasTrabalhadosVT_mesCorrente++;
            
            // VA: apenas dias com jornada ≥6h
            // Calcular horas trabalhadas do dia
            const entrada = diaData.entrada.split(':').map(Number);
            const saida = diaData.saida.split(':').map(Number);
            const inicioRefeicao = diaData.inicio_refeicao ? diaData.inicio_refeicao.split(':').map(Number) : null;
            const terminoRefeicao = diaData.termino_refeicao ? diaData.termino_refeicao.split(':').map(Number) : null;
            
            let minutosEntrada = entrada[0] * 60 + entrada[1];
            let minutosSaida = saida[0] * 60 + saida[1];
            
            // Se saída é menor que entrada, é trabalho noturno que cruza meia-noite
            if (minutosSaida < minutosEntrada) {
              minutosSaida += 24 * 60;
            }
            
            let minutosRefeicao = 0;
            if (inicioRefeicao && terminoRefeicao) {
              const minutosInicioRefeicao = inicioRefeicao[0] * 60 + inicioRefeicao[1];
              const minutosTerminoRefeicao = terminoRefeicao[0] * 60 + terminoRefeicao[1];
              minutosRefeicao = minutosTerminoRefeicao - minutosInicioRefeicao;
            }
            
            const minutosTrabalho = minutosSaida - minutosEntrada - minutosRefeicao;
            const horasTrabalho = minutosTrabalho / 60;
            
            // VA: apenas se jornada ≥6h
            if (horasTrabalho >= 6) {
              diasTrabalhadosVA_mesCorrente++;
            }
          }
        });
      }
      
      // Determinar valor do VT baseado na faixa do funcionário
      const valorVtDiarioMesCorrente = (funcionario as any).faixa_vt === 2 
        ? ((parametros as any).vale_transporte_faixa2 || parametros.vale_transporte) 
        : parametros.vale_transporte;
      
      // Calcular VT do mês corrente (apenas se funcionário recebe VT)
      if (funcionario.recebe_vt) {
        vale_transporte_mes_anterior = valorVtDiarioMesCorrente * diasTrabalhadosVT_mesCorrente * 2;
      }
      
      // Calcular VA do mês corrente
      vale_alimentacao_mes_anterior = parametros.vale_alimentacao * diasTrabalhadosVA_mesCorrente;
      
    }
  }
  
  
  
  // ========================================
  // CESTA BÁSICA E PRÊMIO PERMANÊNCIA
  // ========================================
  
  // Contar faltas injustificadas e total de faltas (atestado + injustificada)
  // Total de faltas injustificadas + suspensões (contam igual para todos os efeitos)
  const totalFaltasInjustificadas = (folhaPonto.total_faltas_injustificadas || 0);
  const totalSuspensoes = (folhaPonto as any).total_suspensoes || 0;
  const totalFaltasInjustificadasESuspensoes = totalFaltasInjustificadas + totalSuspensoes;
  const totalFaltasJustificadas = folhaPonto.total_faltas_justificadas || 0; // atestados
  const totalFaltas = totalFaltasInjustificadasESuspensoes + totalFaltasJustificadas;
  
  // Log se houver suspensões
  if (totalSuspensoes > 0) {
  }
  
  // ========================================
  // CESTA BÁSICA - VALOR INTEGRAL (com regras de elegibilidade)
  // ========================================
  // REGRA DE VALOR: Sempre INTEGRAL, exceto em meses parciais (admissão/demissão)
  // REGRAS DE ELEGIBILIDADE (perde inteiramente se):
  //   1. Mais de 1 falta injustificada no mês
  //   2. Salário nominal (base) > R$ 3.312,58
  //   3. Funcionário inativo (afastamento por doença > 30 dias ou acidente > 90 dias)
  // PROPORCIONALIDADE: Apenas quando diasCorridosTrabalhados < 30 (admissão/demissão parcial)
  
  let cesta_basica = 0;
  const LIMITE_SALARIO_CESTA = 3312.58;
  const perdeuPorFaltas = totalFaltasInjustificadas > 1; // > 1 falta injustificada (suspensões NÃO contam)
  const perdeuPorSalario = salarioBase > LIMITE_SALARIO_CESTA;
  const perdeuPorInatividade = funcionarioInativo; // afastamento por doença/acidente
  const perdeuCesta = perdeuPorFaltas || perdeuPorSalario || perdeuPorInatividade;
  
  if (!perdeuCesta) {
    // Valor integral, proporcional APENAS em meses parciais por ADMISSÃO/DEMISSÃO
    // Faltas, atestados ou dias deletados NÃO tornam proporcional
    if (isPeriodoParcialAdmissaoDemissao) {
      cesta_basica = (parametros.cesta_basica / 30) * diasCorridosTrabalhados;
    } else {
      cesta_basica = parametros.cesta_basica;
    }
  }
  
  const motivoPerda = perdeuPorFaltas 
    ? `> 1 falta injustificada (${totalFaltasInjustificadas})` 
    : perdeuPorSalario 
      ? `Salário R$ ${salarioBase.toFixed(2)} > R$ ${LIMITE_SALARIO_CESTA.toFixed(2)}`
      : perdeuPorInatividade 
        ? 'Funcionário inativo/afastado'
        : '';
  
  
  // ========================================
  // PLR - PARTICIPAÇÃO NOS LUCROS E RESULTADOS
  // ========================================
  // PLR só é pago em março (2ª parcela - 50%) e agosto (1ª parcela - 50%)
  // Valor base: R$ 330,88 por ano
  // Proporcional: 1/12 por mês trabalhado (mínimo 15 dias no mês)
  // Desconto por faltas no semestre:
  //   - Falta justificada (atestado): -20% por falta
  //   - Falta injustificada: -25% por falta
  //   - Sem faltas = 100% do valor
  
  let plr = 0;
  if (mes === 3 || mes === 8) {
    const dataAdmissao = funcionario.data_admissao ? new Date(funcionario.data_admissao) : null;
    if (dataAdmissao) {
      const mesAdmissao = dataAdmissao.getMonth() + 1;
      const anoAdmissao = dataAdmissao.getFullYear();
      const diaAdmissao = dataAdmissao.getDate();
      
      // Determinar período do semestre
      let mesesSemestre: number[] = [];
      let anoReferencia = ano;
      
      if (mes === 8) {
        // 1ª parcela (paga em agosto): janeiro a junho do ano atual
        mesesSemestre = [1, 2, 3, 4, 5, 6];
      } else if (mes === 3) {
        // 2ª parcela (paga em março): julho a dezembro do ano anterior
        mesesSemestre = [7, 8, 9, 10, 11, 12];
        anoReferencia = ano - 1;
      }
      
      // ========================================
      // 1. CALCULAR MESES TRABALHADOS (Proporcionalidade)
      // ========================================
      let mesesTrabalhados = 0;
      
      for (const m of mesesSemestre) {
        // Verificar se já estava admitido no mês
        if (anoReferencia === anoAdmissao && m < mesAdmissao) continue;
        
        // Se foi admitido no mês, verificar se trabalhou pelo menos 15 dias
        if (anoReferencia === anoAdmissao && m === mesAdmissao) {
          if (diaAdmissao <= 15) {
            mesesTrabalhados++;
          }
        } else if (anoReferencia > anoAdmissao || (anoReferencia === anoAdmissao && m > mesAdmissao)) {
          // Mês completo trabalhado
          mesesTrabalhados++;
        }
      }
      
      // ========================================
      // 2. CALCULAR DESCONTO POR FALTAS NO SEMESTRE
      // ========================================
      let totalFaltasJustificadasSemestre = 0;
      let totalFaltasInjustificadasSemestre = 0;
      let totalSuspensoesSemestre = 0; // NOVO: Contar suspensões como faltas injustificadas
      
      // Se temos as folhas do semestre, contar faltas reais
      if (folhasPontoSemestre && folhasPontoSemestre.length > 0) {
        for (const folhaSemestre of folhasPontoSemestre) {
          totalFaltasJustificadasSemestre += folhaSemestre.total_faltas_justificadas || 0;
          totalFaltasInjustificadasSemestre += folhaSemestre.total_faltas_injustificadas || 0;
          totalSuspensoesSemestre += (folhaSemestre as any).total_suspensoes || 0;
        }
        
      } else {
        // Fallback: usar apenas as faltas do mês atual (não ideal, mas evita erro)
        totalFaltasJustificadasSemestre = folhaPonto.total_faltas_justificadas || 0;
        totalFaltasInjustificadasSemestre = folhaPonto.total_faltas_injustificadas || 0;
        totalSuspensoesSemestre = (folhaPonto as any).total_suspensoes || 0;
        
      }
      
      // Calcular percentual de desconto por faltas
      // Falta justificada: -20% por falta
      // Falta injustificada + suspensão: -25% por falta
      const descontoFaltasJustificadas = totalFaltasJustificadasSemestre * 20; // 20% por falta
      const descontoFaltasInjustificadas = (totalFaltasInjustificadasSemestre + totalSuspensoesSemestre) * 25; // 25% por falta/suspensão
      const descontoTotalPercentual = descontoFaltasJustificadas + descontoFaltasInjustificadas;
      
      // Percentual final (mínimo 0%, máximo 100%)
      const percentualFinal = Math.max(0, Math.min(100, 100 - descontoTotalPercentual));
      
      // ========================================
      // 3. CALCULAR VALOR DA PLR
      // ========================================
      const plrAnual = 330.88;
      const plrSemestral = plrAnual * 0.5; // 50% por semestre (R$ 165,44)
      const plrProporcional = (plrSemestral / 6) * mesesTrabalhados; // Proporcional aos meses trabalhados
      plr = plrProporcional * (percentualFinal / 100); // Aplicar desconto por faltas
      
    }
  }
  
  // ========================================
  // PRÊMIO PERMANÊNCIA - INCENTIVO POR ASSIDUIDADE
  // ========================================
  // REGRA: Trabalhou pelo menos 10 dias no mês corrente SEM faltas = prêmio INTEGRAL
  // - Não é proporcional
  // - Perde se tiver 1 ou mais faltas (atestado OU injustificada)
  // - Perde se funcionário inativo
  // - Perde se trabalhou menos de 10 dias no mês
  
  let premio_permanencia = 0;
  
  if (!funcionarioInativo && totalFaltas === 0 && diasCorridosTrabalhados >= 20) {
    premio_permanencia = parametros.premio_permanencia_base;
  }
  
  
  // ========================================
  // DESCONTOS
  // ========================================
  
  // ⚠️ IMPORTANTE: Calcular desconto de faltas ANTES do INSS
  // Faltas reduzem a base de cálculo do INSS
  
  // Desconto de faltas injustificadas (cálculo antecipado)
  const valorDia = salarioProporcional / 30;
  const cargoNome = funcionario.cargo?.nome_cargo?.toUpperCase() || '';
  const isVigia = cargoNome.includes('VIGIA') || cargoNome.includes('VIGILANTE');
  const multiplicadorFalta = isVigia ? 2 : 1;
  const desconto_faltas_antecipado = funcionarioInativo 
    ? salarioProporcional 
    : faltasInjustificadas * valorDia * multiplicadorFalta;
  
  // ========================================
  // SALÁRIO BRUTO PARA INSS E IRRF (ATUALIZADO)
  // ========================================
  // Conforme solicitado:
  // Salário Bruto = Salário Base + HE 50% + HE 100% + Intrajornada 50% + Intrajornada 100%
  //               + Adicional Noturno + Adicional Insalubridade + Adicional Acúmulo Função
  //               + DSRs - Faltas - Desconto Rondas Não Realizadas - Desconto Avaria Utilitário
  // NOTA: descontos excepcionais vêm dos eventos excepcionais (valores manuais)
  const desconto_rondas_para_base = descontoRondasNaoRealizadas;
  const desconto_avaria_para_base = descontoAvariaUtilitario;
  
  // Calcular salário bruto com valores TRUNCADOS para garantir consistência
  const salario_bruto_para_inss_irrf = 
    truncar(salarioProporcional) + 
    truncar(horas_extras_50) + 
    truncar(horas_extras_100) + 
    truncar(intrajornada_50) + 
    truncar(intrajornada_100) +
    truncar(adicional_noturno) + 
    truncar(adicional_insalubridade) + 
    truncar(adicional_acumulo_funcao) +
    truncar(dsr_horas_extras) + 
    truncar(dsr_adicional_noturno) +
    truncar(eventosExcepcionaisProventos) - // ⭐ INCLUIR EVENTOS EXCEPCIONAIS DE PROVENTOS
    truncar(desconto_faltas_antecipado) -
    truncar(desconto_rondas_para_base) -
    truncar(desconto_avaria_para_base);
  
  // Base de cálculo do INSS = Salário Bruto (já com faltas e rondas descontadas)
  // NOTA: Salário Família NÃO entra na base do INSS (é pago pelo INSS)
  const base_calculo_inss = salario_bruto_para_inss_irrf;
  
  
  // INSS - calcular após ter o total_proventos correto (será recalculado depois)
  let desconto_inss = 0;
  
  // IRRF - será recalculado após ter INSS correto
  let desconto_irrf = 0;
  
  // Vale transporte (6% do salário proporcional) - apenas se funcionário recebe VT
  
  const desconto_vt = funcionario.recebe_vt 
    ? truncar(salarioProporcional * (parametros.percentual_desconto_vt / 100))
    : 0;
  
  
  // Outros descontos fixos - apenas para funcionários registrados
  const desconto_seguro_vida = (funcionarioRegistrado && funcionario.recebe_seguro_vida) 
    ? parametros.desconto_seguro_vida 
    : 0;
  
  const desconto_convenio_odonto = funcionarioRegistrado ? parametros.convenio_odontologico : 0;
  const desconto_contribuicao_assistencial = funcionarioRegistrado ? parametros.contribuicao_assistencial : 0;
  
  // Desconto PLR (Taxa Sindical): R$ 12,00 fixo aplicado APENAS em SETEMBRO
  // Condição: funcionário deve ter recebido PLR em agosto (1ª parcela) OU março (2ª parcela)
  // Se não recebeu PLR em nenhuma das parcelas, desconto = 0
  let desconto_plr = 0;
  
  if (mes === 9 && funcionarioRegistrado) {
    // Verificar se recebeu PLR em agosto (1ª parcela) do ano atual
    let recebeuPlrAgosto = false;
    let recebeuPlrMarco = false;
    
    // Calcular se teria direito à PLR de agosto (mesmo cálculo usado acima)
    const dataAdmissao = funcionario.data_admissao ? new Date(funcionario.data_admissao) : null;
    if (dataAdmissao) {
      const mesAdmissao = dataAdmissao.getMonth() + 1;
      const anoAdmissao = dataAdmissao.getFullYear();
      const diaAdmissao = dataAdmissao.getDate();
      
      // Verificar PLR de agosto (janeiro a junho do ano atual)
      let mesesTrabalhadosAgosto = 0;
      for (const m of [1, 2, 3, 4, 5, 6]) {
        if (ano === anoAdmissao && m < mesAdmissao) continue;
        if (ano === anoAdmissao && m === mesAdmissao && diaAdmissao <= 15) {
          mesesTrabalhadosAgosto++;
        } else if (ano > anoAdmissao || (ano === anoAdmissao && m > mesAdmissao)) {
          mesesTrabalhadosAgosto++;
        }
      }
      
      // Se trabalhou pelo menos 1 mês no semestre, teve direito à PLR de agosto
      if (mesesTrabalhadosAgosto > 0) {
        // Verificar se teve faltas que zeraram a PLR
        let totalFaltasAgosto = 0;
        if (folhasPontoSemestre && folhasPontoSemestre.length > 0) {
          // Usar folhas do semestre de agosto (jan-jun)
          for (const folhaSemestre of folhasPontoSemestre) {
            if (folhaSemestre.ano === ano && folhaSemestre.mes >= 1 && folhaSemestre.mes <= 6) {
              const faltasJust = folhaSemestre.total_faltas_justificadas || 0;
              const faltasInjust = folhaSemestre.total_faltas_injustificadas || 0;
              totalFaltasAgosto += (faltasJust * 20) + (faltasInjust * 25);
            }
          }
        }
        
        // Se desconto por faltas < 100%, recebeu PLR
        if (totalFaltasAgosto < 100) {
          recebeuPlrAgosto = true;
        }
      }
      
      // Verificar PLR de março (julho a dezembro do ano anterior)
      let mesesTrabalhadosMarco = 0;
      for (const m of [7, 8, 9, 10, 11, 12]) {
        if ((ano - 1) === anoAdmissao && m < mesAdmissao) continue;
        if ((ano - 1) === anoAdmissao && m === mesAdmissao && diaAdmissao <= 15) {
          mesesTrabalhadosMarco++;
        } else if ((ano - 1) > anoAdmissao || ((ano - 1) === anoAdmissao && m > mesAdmissao)) {
          mesesTrabalhadosMarco++;
        }
      }
      
      // Se trabalhou pelo menos 1 mês no semestre, teve direito à PLR de março
      if (mesesTrabalhadosMarco > 0) {
        // Verificar se teve faltas que zeraram a PLR
        let totalFaltasMarco = 0;
        if (folhasPontoSemestre && folhasPontoSemestre.length > 0) {
          // Usar folhas do semestre de março (jul-dez do ano anterior)
          for (const folhaSemestre of folhasPontoSemestre) {
            if (folhaSemestre.ano === (ano - 1) && folhaSemestre.mes >= 7 && folhaSemestre.mes <= 12) {
              const faltasJust = folhaSemestre.total_faltas_justificadas || 0;
              const faltasInjust = folhaSemestre.total_faltas_injustificadas || 0;
              totalFaltasMarco += (faltasJust * 20) + (faltasInjust * 25);
            }
          }
        }
        
        // Se desconto por faltas < 100%, recebeu PLR
        if (totalFaltasMarco < 100) {
          recebeuPlrMarco = true;
        }
      }
    }
    
    // Aplicar desconto se recebeu PLR em agosto OU março
    if (recebeuPlrAgosto || recebeuPlrMarco) {
      desconto_plr = 12.00; // Valor fixo de R$ 12,00
      
    } else {
    }
  }
  
  // Pensão Alimentícia (se houver)
  // TODO: Implementar lógica de busca de pensão alimentícia do funcionário
  const desconto_pensao_alimenticia = 0; // Por enquanto zerado, aguardando implementação
  
  // Desconto por Rondas Não Realizadas (manual - vem dos eventos excepcionais)
  const desconto_rondas_nao_realizadas = descontoRondasNaoRealizadas;
  
  // Desconto de atrasos (valor da hora * horas de atraso) - TRUNCAR
  const desconto_atrasos = truncar((folhaPonto.total_atrasos || 0) * valorHora);
  
  // Desconto de faltas injustificadas
  // REGRA ESPECIAL 1: Para VIGIAS (escala 12x36), cada falta conta em DOBRO
  // Motivo: Trabalham 15 dias/mês mas recebem salário integral (30 dias)
  // Se faltarem 1 dia, perdem 2 dias de salário
  // REGRA ESPECIAL 2: Para INATIVOS (afastados o mês todo), descontar o salário integral
  // IMPORTANTE: Divisor é SEMPRE 30 (CLT), não o número de dias do mês
  
  // Variáveis já declaradas anteriormente para cálculo da base do INSS
  // const valorDia, cargoNome, isVigia, multiplicadorFalta já existem
  
  let desconto_faltas: number;
  
  if (funcionarioInativo) {
    // Funcionário inativo: descontar o salário proporcional inteiro
    desconto_faltas = salarioProporcional;
    
  } else {
    // Funcionário ativo: cálculo normal
    // Multiplicador: 2x para vigias, 1x para outros cargos
    const multiplicadorFalta = isVigia ? 2 : 1;
    desconto_faltas = truncar(faltasInjustificadas * valorDia * multiplicadorFalta);
    
  }
  
  // ========================================
  // DESCONTO DSR s/ FALTAS (Limpeza e Zeladoria) - CLT
  // ========================================
  // REGRA: Para funcionários de Limpeza e Zeladoria, cada semana com falta
  // injustificada ou suspensão resulta na perda do DSR (domingo) daquela semana
  // Identificação: pelo código da escala (LIM, ZEL, LIMP)
  
  let desconto_dsr_faltas = 0;
  let dias_dsr_faltas = 0;
  
  // Códigos de escala de Limpeza e Zeladoria
  const ESCALAS_LIMPEZA_ZELADORIA = [
    'GALLIMPT1', 'GALZELADT1', 'FIGZELADT1', 
    'PALMLIMPT1', 'PALMLIMPT2', 
    'FIGLIMPT1', 'FIGLIMPT2'
  ];
  
  // Buscar código da escala de múltiplas fontes possíveis
  const codigoEscalaFunc = (
    funcionario.codigo_escala || 
    funcionario.cargo?.escala?.codigo_escala ||
    ''
  ).toUpperCase();
  
  // Verificar também pelo nome do cargo (fallback)
  const nomeCargoFunc = (funcionario.nome_cargo || funcionario.cargo?.nome_cargo || '').toUpperCase();
  
  const isLimpezaZeladoria = 
    ESCALAS_LIMPEZA_ZELADORIA.some(esc => codigoEscalaFunc === esc) ||
    codigoEscalaFunc.includes('LIM') || 
    codigoEscalaFunc.includes('ZEL') ||
    nomeCargoFunc.includes('LIMPEZA') ||
    nomeCargoFunc.includes('ZELADORIA');
  
  // LOG de diagnóstico - sempre mostrar para depuração
  
  if (isLimpezaZeladoria && !funcionarioInativo) {
    // Estratégia 1: Analisar dados_dias para identificar semanas com faltas explícitas
    const faltasPorSemana: { [semana: number]: boolean } = {};
    let faltasEncontradasEmDadosDias = false;
    
    if (folhaPonto.dados_dias) {
      const dadosDias = typeof folhaPonto.dados_dias === 'string'
        ? JSON.parse(folhaPonto.dados_dias)
        : folhaPonto.dados_dias;
      
      Object.entries(dadosDias).forEach(([dia, dados]: [string, any]) => {
        // Extrair número do dia (suporta formatos "dia_5" ou "5")
        const diaNum = parseInt(dia.replace(/\D/g, ''));
        if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) return;
        
        // Calcular número da semana (considerando que semana começa no domingo)
        const primeiroDiaDoMes = new Date(ano, mes - 1, 1);
        const diaSemana = primeiroDiaDoMes.getDay(); // 0 = domingo
        const numSemana = Math.ceil((diaNum + diaSemana) / 7);
        
        // Verificar se é falta injustificada ou suspensão (flag explícito)
        const isFaltaInjustificada = dados.falta_injustificada === true;
        const isSuspensao = dados.suspensao === true;
        
        if (isFaltaInjustificada || isSuspensao) {
          faltasPorSemana[numSemana] = true;
          faltasEncontradasEmDadosDias = true;
        }
      });
    }
    
    
    // Estratégia 2: Usar totais da folha de ponto se não encontrou flags explícitos
    // Assume que cada falta/suspensão ocorre em uma semana diferente (até 4 semanas/mês)
    if (!faltasEncontradasEmDadosDias) {
      const totalFaltasInjustificadas = folhaPonto.total_faltas_injustificadas || 0;
      const totalSuspensoes = (folhaPonto as any).total_suspensoes || 0;
      const totalOcorrencias = totalFaltasInjustificadas + totalSuspensoes;
      
      
      if (totalOcorrencias > 0) {
        // Cada ocorrência afeta no máximo 1 semana - limita a 4 semanas (máximo por mês)
        dias_dsr_faltas = Math.min(totalOcorrencias, 4);
      }
    } else {
      // Contar semanas com faltas encontradas nos dados_dias
      dias_dsr_faltas = Object.keys(faltasPorSemana).length;
    }
    
    // Calcular valor do desconto DSR
    // FÓRMULA CORRETA: Salário Base ÷ 30 × qtde_semanas_com_falta
    // IMPORTANTE: Usar salarioBase (não salarioProporcional) conforme CLT
    const valorDiaDSR = salarioBase / 30;
    desconto_dsr_faltas = dias_dsr_faltas * valorDiaDSR;
    
  } else {
  }
  
  // Desconto de adiantamento quinzenal (% do salário proporcional) - apenas se funcionário recebe
  // Regra: se admitido após o dia 10 no mês de admissão, NÃO aplicar adiantamento quinzenal
  let aplicarAdiantamentoQuinzenal = !!funcionario.recebe_adiantamento_quinzenal;
  if (aplicarAdiantamentoQuinzenal && funcionario.data_admissao) {
    const dAdm = new Date(funcionario.data_admissao);
    const mAdm = dAdm.getMonth() + 1;
    const aAdm = dAdm.getFullYear();
    if (mAdm === mes && aAdm === ano && dAdm.getDate() > 10) {
      aplicarAdiantamentoQuinzenal = false;
    }
  }
  const desconto_adiantamento_quinzenal = aplicarAdiantamentoQuinzenal
    ? salarioProporcional * (parametros.percentual_adiantamento_quinzenal / 100)
    : 0;

  // Desconto de adiantamento de salário (valor manual - preenchido via modal de eventos excepcionais)
  let desconto_adiantamento_salario = 0;

  // Aplicar eventos excepcionais do tipo "Adiantam. de Salário" ao campo específico
  if (eventosExcepcionais && eventosExcepcionais.length > 0) {
    eventosExcepcionais.forEach((evento: any) => {
      if (evento.tipo === 'desconto' && evento.descricao === 'Adiantam. de Salário') {
        desconto_adiantamento_salario += Number(evento.valor) || 0;
      }
    });
  }

  
  // ========================================
  // DESCONTO DE COMPLEMENTO SALARIAL DO MÊS ANTERIOR
  // ========================================
  // Se houve complemento no mês anterior, descontar neste mês
  let desconto_complemento_anterior = 0;
  if (folhaPontoMesAnterior && (folhaPontoMesAnterior as any).resultado_calculo) {
    const resultadoAnterior = typeof (folhaPontoMesAnterior as any).resultado_calculo === 'string'
      ? JSON.parse((folhaPontoMesAnterior as any).resultado_calculo)
      : (folhaPontoMesAnterior as any).resultado_calculo;
    
    if (resultadoAnterior.complemento_salario > 0) {
      desconto_complemento_anterior = resultadoAnterior.complemento_salario;
    }
  }
  
  // ========================================
  // DESCONTOS DE VA E VT POR FALTAS
  // ========================================
  
  // Contar faltas (atestados + injustificadas) e verificar se eram dias com >6h
  let faltasComVT = 0; // Todas as faltas geram desconto de VT (2 VTs por falta)
  let faltasComVA = 0; // Apenas faltas em dias com >6h geram desconto de VA (1 VA por falta)
  
  // Usar a mesma variável jornadaDiaria já declarada anteriormente (linha 323)
  
  if (folhaPonto.dados_dias) {
    const dadosDias = typeof folhaPonto.dados_dias === 'string' 
      ? JSON.parse(folhaPonto.dados_dias) 
      : folhaPonto.dados_dias;
    
    // Detectar se funcionário é Aux. Limpeza ou Zelador (escalas LIM/ZEL)
    // Esses profissionais trabalham apenas 4h aos sábados e NÃO recebem VA neste dia,
    // portanto faltas em sábado não devem gerar desconto de VA.
    const codigoEscala = (funcionario.codigo_escala || '').toUpperCase();
    const isLimpezaOuZeladoria = codigoEscala.includes('LIM') || codigoEscala.includes('ZEL');

    Object.entries(dadosDias).forEach(([dataKey, dia]: [string, any]) => {
      // Verificar se é falta (atestado, injustificada ou suspensão)
      const isFalta = dia.atestado || dia.falta_injustificada || dia.suspensao;
      
      // Identificar o dia da semana para regras especiais
      let isSabado = false;
      try {
        const matchDia = /^dia_(\d{1,2})$/.exec(dataKey);
        if (matchDia && folhaPonto.mes && folhaPonto.ano) {
          const numeroDia = parseInt(matchDia[1], 10);
          const dataFalta = new Date(folhaPonto.ano, folhaPonto.mes - 1, numeroDia);
          isSabado = dataFalta.getDay() === 6;
        } else {
          const dataFalta = new Date(`${dataKey}T12:00:00`);
          if (!isNaN(dataFalta.getTime())) {
            isSabado = dataFalta.getDay() === 6;
          }
        }
      } catch { /* ignora data inválida */ }

      // REGRA: Aux. Limpeza / Zeladores não recebem VA aos sábados (jornada de 4h)
      const isLimpezaZeladoriaSabado = isLimpezaOuZeladoria && isSabado;

      if (isFalta) {
        // Toda falta gera desconto de 2 VTs (ida e volta)
        faltasComVT++;

        // Faltas em sábado para Limpeza/Zeladoria não geram desconto de VA
        if (isLimpezaZeladoriaSabado) return;

        // Verificar se seria um dia com >6h de trabalho
        let horasTrabalhoPrevistas = 0;
        
        // Tentar calcular pelas horas previstas do dia
        if (dia.entrada && dia.saida) {
          const entrada = dia.entrada.split(':').map(Number);
          const saida = dia.saida.split(':').map(Number);
          const inicioRefeicao = dia.inicio_refeicao ? dia.inicio_refeicao.split(':').map(Number) : null;
          const terminoRefeicao = dia.termino_refeicao ? dia.termino_refeicao.split(':').map(Number) : null;
          
          let minE = entrada[0] * 60 + entrada[1];
          let minS = saida[0] * 60 + saida[1];
          if (minS < minE) minS += 24 * 60;
          
          let minR = 0;
          if (inicioRefeicao && terminoRefeicao) {
            minR = (terminoRefeicao[0] * 60 + terminoRefeicao[1]) - (inicioRefeicao[0] * 60 + inicioRefeicao[1]);
          }
          horasTrabalhoPrevistas = (minS - minE - minR) / 60;
        } else {
          horasTrabalhoPrevistas = 8; // Assume 8h padrão
        }
        
        // Se seria um dia com 6h ou mais, gera desconto de VA
        if (horasTrabalhoPrevistas >= 6) {
          faltasComVA++;
        }
      } else if (dia.entrada && dia.saida) {
        // ⭐ REGRA NOVA: Dia TRABALHADO, mas com jornada efetiva <= 4h (Atrasos/Saídas Antecipadas)
        // Descontar o VA do dia se a jornada efetiva for <= 4h e o dia NÃO for sábado (para Limpeza/Zeladoria)
        
        if (isLimpezaZeladoriaSabado) return;

        // Calcular jornada efetiva realizada no dia
        let horasTrabalhadasEfetivas = 0;
        
        // CORREÇÃO: Primeiro verificar se há cálculo pronto nos dados_dias
        if (dia.calculo && typeof dia.calculo.total_horas === 'number') {
          horasTrabalhadasEfetivas = dia.calculo.total_horas;
        } else {
          // Fallback para cálculo manual se não houver objeto 'calculo'
          const entrada = dia.entrada.split(':').map(Number);
          const saida = dia.saida.split(':').map(Number);
          const inicioRefeicao = dia.inicio_refeicao ? dia.inicio_refeicao.split(':').map(Number) : null;
          const terminoRefeicao = dia.termino_refeicao ? dia.termino_refeicao.split(':').map(Number) : null;
          
          let minE = entrada[0] * 60 + entrada[1];
          let minS = saida[0] * 60 + saida[1];
          if (minS < minE) minS += 24 * 60;
          
          let minR = 0;
          if (inicioRefeicao && terminoRefeicao) {
            const minIR = inicioRefeicao[0] * 60 + inicioRefeicao[1];
            const minTR = terminoRefeicao[0] * 60 + terminoRefeicao[1];
            if (minTR > minIR) minR = minTR - minIR;
          }
          horasTrabalhadasEfetivas = (minS - minE - minR) / 60;
        }

        // Se trabalhou entre 0.00h e 4h, desconta o VA do dia
        // Nota: 0h trabalhadas em dia com entrada/saída (como Saída Antecipada total) deve descontar
        if (horasTrabalhadasEfetivas >= 0 && horasTrabalhadasEfetivas <= 4) {
          faltasComVA++;
        }
      }
    });
  }
  
  // Calcular descontos
  // VT: R$ 6,20 × 2 (ida e volta) por falta - APENAS se funcionário recebe VT
  const desconto_vt_faltas = funcionario.recebe_vt 
    ? faltasComVT * parametros.vale_transporte * 2
    : 0;
  
  // VA: R$ 24,50 por falta em dia com >6h (inclui jornada efetiva <= 4h por atrasos/saídas)
  const desconto_va_faltas = faltasComVA * parametros.vale_alimentacao;
  
  
  // ========================================
  // TOTAIS
  // ========================================
  
  // Total de proventos (salários e adicionais que compõem a base de cálculo)
  // VT, VA, Cesta Básica, Prêmio Permanência e PLR são benefícios pagos separadamente
  // IMPORTANTE: Soma valores já truncados para garantir que total = soma dos valores exibidos
  const total_proventos = 
    truncar(salarioProporcional) +
    truncar(horas_extras_50) +
    truncar(horas_extras_100) +
    truncar(adicional_noturno) +
    truncar(intrajornada_50) +
    truncar(intrajornada_100) +
    truncar(dsr_horas_extras) +
    truncar(dsr_adicional_noturno) +
    truncar(adicional_insalubridade) +
    truncar(adicional_acumulo_funcao) +
    truncar(salario_familia) +
    // ⚠️ PLR NÃO É MAIS PROVENTO - Foi movido para BENEFÍCIOS
    truncar(eventosExcepcionaisProventos); // ⭐ INCLUIR EVENTOS EXCEPCIONAIS DE PROVENTOS
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RECALCULAR BASE DO INSS (CORRIGIDO)
  // ═══════════════════════════════════════════════════════════════════════════
  // A base do INSS deve DESCONTAR itens que reduzem a remuneração efetiva:
  // - Salário Família: NÃO integra salário de contribuição (pago pelo INSS)
  // - PLR: JÁ NÃO ESTÁ em total_proventos (foi movido para benefícios)
  // - Faltas injustificadas: Reduzem a remuneração do mês
  // - DSR s/ Faltas: Reduz a remuneração (reflexo das faltas)
  // - Atrasos: Reduzem a remuneração do mês
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deducoesBaseINSS = 
    truncar(salario_familia) +      // Não integra salário de contribuição
    // PLR não precisa mais ser deduzido pois já não está em total_proventos
    truncar(desconto_faltas) +      // Reduz remuneração efetiva
    truncar(desconto_dsr_faltas) +  // Reflexo das faltas (CLT)
    truncar(desconto_atrasos);      // Reduz remuneração efetiva
  
  const base_calculo_inss_corrigida = Math.max(0, total_proventos - deducoesBaseINSS);
  
  
  // ⭐ RECALCULAR INSS E IRRF SOBRE A BASE CORRIGIDA
  desconto_inss = funcionarioRegistrado ? calcularINSS(base_calculo_inss_corrigida, parametros) : 0;
  
  // IRRF - usar base corrigida e INSS recalculado
  desconto_irrf = funcionarioRegistrado 
    ? calcularIRRF(base_calculo_inss_corrigida, desconto_inss, parametros, funcionario.quantidade_filhos, base_calculo_inss_corrigida) 
    : 0;
  
  
  // ⭐ CORREÇÃO: Incluir desconto_rondas_nao_realizadas e desc_avaria_utilitario no total de descontos
  // Esses valores são descontados do salário bruto E também devem aparecer no total de descontos
  const total_descontos = 
    truncar(desconto_inss) +
    truncar(desconto_irrf) +
    truncar(desconto_vt) +
    truncar(desconto_vt_faltas) +
    truncar(desconto_va_faltas) +
    truncar(desconto_seguro_vida) +
    truncar(desconto_convenio_odonto) +
    truncar(desconto_contribuicao_assistencial) +
    truncar(desconto_atrasos) +
    truncar(desconto_faltas) +
    truncar(desconto_dsr_faltas) + // DSR s/ Faltas (Limpeza/Zeladoria)
    truncar(desconto_plr) +
    truncar(desconto_pensao_alimenticia) +
    truncar(desconto_adiantamento_quinzenal) +
    truncar(desconto_complemento_anterior) +
    truncar(desconto_adiantamento_salario) +
    truncar(descontoRondasNaoRealizadas) + // ⭐ ADICIONADO
    truncar(descontoAvariaUtilitario); // ⭐ ADICIONADO
  
  // ========================================
  // FOLGA TRABALHADA (FT) - BENEFÍCIO MANUAL
  // ========================================
  // ⭐ Calcular o valor monetário das FTs marcadas MANUALMENTE na folha de ponto
  // do mês corrente. Cada FT vale uma diária fixa por função (Vigia, Aux. Limpeza, Zelador),
  // configurada na Tabela de Apoio. Resultado vai para BENEFÍCIOS.
  let qtd_folgas_trabalhadas_manual = 0;
  if (folhaPonto.dados_dias) {
    const dadosDiasFT = typeof folhaPonto.dados_dias === 'string'
      ? JSON.parse(folhaPonto.dados_dias)
      : folhaPonto.dados_dias;
    Object.entries(dadosDiasFT).forEach(([dataKey, d]: [string, any]) => {
      if (d?.ft_manual !== true) return;

      let isSabado = false;
      try {
        const matchDia = /^dia_(\d{1,2})$/.exec(dataKey);
        if (matchDia && folhaPonto.mes && folhaPonto.ano) {
          const numeroDia = parseInt(matchDia[1], 10);
          const dataFT = new Date(folhaPonto.ano, folhaPonto.mes - 1, numeroDia);
          isSabado = dataFT.getDay() === 6;
        } else {
          const dataFT = new Date(`${dataKey}T12:00:00`);
          if (!isNaN(dataFT.getTime())) {
            isSabado = dataFT.getDay() === 6;
          }
        }
      } catch {
        isSabado = false;
      }

      const ftPeso = isLimpezaZeladoria && isSabado ? 0.5 : 1;
      qtd_folgas_trabalhadas_manual += ftPeso;
    });
  }

  // Determinar valor diário da FT pela função do funcionário
  const cargoUpperFT = (funcionario.nome_cargo || funcionario.cargo?.nome_cargo || '').toUpperCase();
  let valor_diario_ft = 0;
  if (cargoUpperFT.includes('VIGIA') || cargoUpperFT.includes('VIGILANTE')) {
    valor_diario_ft = Number((parametros as any).ft_diaria_vigia || 0);
  } else if (cargoUpperFT.includes('LIMPEZA') || cargoUpperFT.includes('AUXILIAR')) {
    valor_diario_ft = Number((parametros as any).ft_diaria_aux_limpeza || 0);
  } else if (cargoUpperFT.includes('ZELADOR')) {
    valor_diario_ft = Number((parametros as any).ft_diaria_zelador || 0);
  }
  const valor_folga_trabalhada_beneficio = truncar(qtd_folgas_trabalhadas_manual * valor_diario_ft);

  // Total de benefícios (pagos separadamente)
  const total_beneficios = truncar(vale_transporte_mes_anterior) + truncar(vale_alimentacao_mes_anterior) + truncar(vale_transporte) + truncar(vale_alimentacao) + truncar(cesta_basica) + truncar(premio_permanencia) + valor_folga_trabalhada_beneficio;
  
  // ========================================
  // COMPLEMENTO DE SALÁRIO (quando líquido SEM BENEFÍCIOS é negativo)
  // ========================================
  // IMPORTANTE: O complemento é aplicado quando o salário líquido SEM benefícios é negativo
  // Benefícios são pagos separadamente e não devem influenciar o complemento
  let complemento_salario = 0;
  const salario_liquido_sem_beneficios = total_proventos - total_descontos;
  
  
  if (salario_liquido_sem_beneficios < 0) {
    // Complemento é o valor absoluto do salário negativo (sem benefícios)
    complemento_salario = Math.abs(salario_liquido_sem_beneficios);
    
  }
  
  // Recalcular total de proventos incluindo o complemento
  const total_proventos_final = total_proventos + complemento_salario;
  
  
  // Salário líquido = proventos (com complemento) - descontos + benefícios
  let salario_liquido = total_proventos_final - total_descontos + total_beneficios;
  
  // ========================================
  // RESUMO PARA FUNCIONÁRIO INATIVO
  // ========================================
  if (funcionarioInativo) {
  }
  
  // ========================================
  // ENCARGOS (informativo)
  // ========================================
  
  const fgts = salario_bruto * ((parametros.percentual_fgts || 8) / 100);
  
  // INSS Patronal: 20% do salário bruto - Salário Família
  // O empregador paga o salário família ao funcionário e abate do INSS devido ao governo
  const inss_patronal_bruto = salario_bruto * ((parametros.percentual_inss_patronal || 20) / 100);
  const inss_patronal = inss_patronal_bruto - salario_familia;
  
  
  // ========================================
  // FUNCIONÁRIO INATIVO: ZERAR TUDO EXCETO SALÁRIO E FALTAS
  // ========================================
  if (funcionarioInativo) {
    
    // Calcular desconto de faltas para igualar ao salário (saldo zerado)
    const desconto_faltas_inativo = salarioProporcional;
    
    return {
      // PROVENTOS: Apenas salário base
      salario_base: Number(salarioProporcional.toFixed(2)),
      horas_extras_50: 0,
      horas_extras_100: 0,
      adicional_noturno: 0,
      intrajornada_50: 0,
      intrajornada_100: 0,
      dsr_horas_extras: 0,
      dsr_adicional_noturno: 0,
      adicional_insalubridade: 0,
      adicional_acumulo_funcao: 0,
      salario_familia: 0,
      complemento_salario: 0,
      vale_transporte: 0,
      vale_transporte_mes_anterior: 0,
      vale_transporte_mes_atual: 0,
      vale_alimentacao: 0,
      vale_alimentacao_mes_anterior: 0,
      vale_alimentacao_mes_atual: 0,
      cesta_basica: 0,
      plr: 0,
      premio_permanencia: 0,
      folgas_trabalhadas_vt: 0,
      folgas_trabalhadas_va: 0,
      // DESCONTOS: Apenas faltas (igual ao salário para zerar)
      desconto_inss: 0,
      desconto_irrf: 0,
      desconto_vt: 0,
      desconto_vt_faltas: 0,
      desconto_va_faltas: 0,
      desconto_seguro_vida: 0,
      desconto_convenio_odonto: 0,
      desconto_contribuicao_assistencial: 0,
      desconto_atrasos: 0,
      desconto_faltas: Number(desconto_faltas_inativo.toFixed(2)),
      desconto_dsr_faltas: 0, // Inativo não tem DSR s/ Faltas
      dias_dsr_faltas: 0,
      desconto_plr: 0,
      desconto_pensao_alimenticia: 0,
      desconto_rondas_nao_realizadas: 0,
      desc_rondas_nao_realizadas_benef: 0,
      desconto_adiantamento_quinzenal: 0,
      desconto_complemento_anterior: 0,
      desconto_adiantamento_salario: 0,
      desc_avaria_utilitario: 0,
      // TOTAIS: Saldo zerado
      total_proventos: Number(salarioProporcional.toFixed(2)),
      total_descontos: Number(desconto_faltas_inativo.toFixed(2)),
      total_beneficios: 0,
      salario_liquido: 0,
      // BASES DE CÁLCULO: Zeradas
      base_inss: 0,
      base_irrf: 0,
      base_fgts: 0,
      // ENCARGOS: Zerados
      fgts: 0,
      inss_patronal: 0,
    };
  }
  
  // ========================================
  // FUNCIONÁRIO ATIVO: RETORNO NORMAL
  // ========================================
  return {
    salario_base: truncar(salarioProporcional),
    horas_extras_50: truncar(horas_extras_50),
    horas_extras_100: truncar(horas_extras_100),
    adicional_noturno: truncar(adicional_noturno),
    intrajornada_50: truncar(intrajornada_50),
    intrajornada_100: truncar(intrajornada_100),
    dsr_horas_extras: truncar(dsr_horas_extras),
    dsr_adicional_noturno: truncar(dsr_adicional_noturno),
    adicional_insalubridade: truncar(adicional_insalubridade),
    adicional_acumulo_funcao: truncar(adicional_acumulo_funcao),
    salario_familia: truncar(salario_familia),
    complemento_salario: truncar(complemento_salario),
    vale_transporte: truncar(vale_transporte),
    vale_transporte_mes_anterior: truncar(vale_transporte_mes_anterior), // VT do mês corrente (admissão)
    vale_transporte_mes_atual: truncar(vale_transporte), // VT do mês seguinte
    vale_alimentacao: truncar(vale_alimentacao),
    vale_alimentacao_mes_anterior: truncar(vale_alimentacao_mes_anterior), // VA do mês corrente (admissão)
    vale_alimentacao_mes_atual: truncar(vale_alimentacao), // VA do mês seguinte
    cesta_basica: truncar(cesta_basica),
    plr: truncar(plr),
    premio_permanencia: truncar(premio_permanencia),
    folgas_trabalhadas_vt: folgasTrabalhadasVT_referencia,
    folgas_trabalhadas_va: folgasTrabalhadasVA_referencia,
    folga_trabalhada: valor_folga_trabalhada_beneficio, // ⭐ NOVO: Valor da FT em Benefícios
    desconto_inss: truncar(desconto_inss),
    desconto_irrf: truncar(desconto_irrf),
    desconto_vt: truncar(desconto_vt),
    desconto_vt_faltas: truncar(desconto_vt_faltas),
    desconto_va_faltas: truncar(desconto_va_faltas),
    desconto_seguro_vida: truncar(desconto_seguro_vida),
    desconto_convenio_odonto: truncar(desconto_convenio_odonto),
    desconto_contribuicao_assistencial: truncar(desconto_contribuicao_assistencial),
    desconto_atrasos: truncar(desconto_atrasos),
    desconto_faltas: truncar(desconto_faltas),
    desconto_dsr_faltas: truncar(desconto_dsr_faltas), // DSR s/ Faltas (Limpeza/Zeladoria)
    dias_dsr_faltas: dias_dsr_faltas,
    desconto_plr: truncar(desconto_plr),
    desconto_pensao_alimenticia: truncar(desconto_pensao_alimenticia),
    desconto_rondas_nao_realizadas: truncar(desconto_rondas_nao_realizadas),
    desc_rondas_nao_realizadas_benef: 0, // Será preenchido via eventos excepcionais
    desconto_adiantamento_quinzenal: truncar(desconto_adiantamento_quinzenal),
    desconto_complemento_anterior: truncar(desconto_complemento_anterior),
    desconto_adiantamento_salario: truncar(desconto_adiantamento_salario), // Será preenchido manualmente via modal
    desc_avaria_utilitario: 0, // Será preenchido manualmente via modal
    total_proventos: total_proventos_final,
    total_descontos: total_descontos,
    total_beneficios: total_beneficios, // ⭐ NOVO: Total de benefícios
    salario_liquido: salario_liquido,
    // Bases de cálculo ATUALIZADAS:
    // Base INSS = Total Proventos - Salário Família (PLR já não está em total_proventos)
    // Base IRRF = Base INSS - INSS
    // Base FGTS = Base INSS (mesma base)
    base_inss: base_calculo_inss_corrigida,
    base_irrf: truncar(base_calculo_inss_corrigida - truncar(desconto_inss)),
    base_fgts: base_calculo_inss_corrigida,
    fgts: truncar(fgts),
    inss_patronal: truncar(inss_patronal),

  };
}

/**
 * Formata valor monetário
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}
