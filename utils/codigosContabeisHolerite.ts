// Códigos contábeis para lançamentos no holerite
import { normalizarDescricao } from './eventosExcepcionaisValidator';
import { normalizarFolhaCalculada } from './normalizarFolhaCalculada';

// Helper para obter nome do mês anterior
export const obterNomeMesAnterior = (mes: number): string => {
  const meses = [
    'Dezembro', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio',
    'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro'
  ];
  return meses[mes - 1] || 'Mês Anterior';
};

export interface CodigoContabil {
  codigo: string;
  descricao: string;
  tipo: 'provento' | 'desconto' | 'informativo';
  categoria: string;
}

export const CODIGOS_CONTABEIS: Record<string, CodigoContabil> = {
  // ========================================
  // PROVENTOS (0001-1999)
  // ========================================
  '0001': { codigo: '0001', descricao: 'Salário', tipo: 'provento', categoria: 'Vencimentos' },
  '0002': { codigo: '0002', descricao: 'Vale Avulso', tipo: 'provento', categoria: 'Vencimentos' },
  '0101': { codigo: '0101', descricao: 'Hora Extra 50%', tipo: 'provento', categoria: 'Horas Extras' },
  '0102': { codigo: '0102', descricao: 'Intrajornada 50%', tipo: 'provento', categoria: 'Intrajornadas' },
  '0103': { codigo: '0103', descricao: 'Hora Extra 100%', tipo: 'provento', categoria: 'Horas Extras' },
  '0104': { codigo: '0104', descricao: 'Intrajornada 100%', tipo: 'provento', categoria: 'Intrajornadas' },
  '0201': { codigo: '0201', descricao: 'DSR s/ H. Extras', tipo: 'provento', categoria: 'DSR' },
  '0202': { codigo: '0202', descricao: 'DSR s/ Adicional Noturno', tipo: 'provento', categoria: 'DSR' },
  '0301': { codigo: '0301', descricao: 'Adicional Noturno', tipo: 'provento', categoria: 'Adicionais' },
  '0302': { codigo: '0302', descricao: 'Complem. de Salário', tipo: 'provento', categoria: 'Complementos' },
  '0303': { codigo: '0303', descricao: 'Adicional Insalubridade', tipo: 'provento', categoria: 'Adicionais' },
  '0304': { codigo: '0304', descricao: 'Adicional Acúmulo Função', tipo: 'provento', categoria: 'Adicionais' },
  '0305': { codigo: '0305', descricao: 'Folhas de Pagamento', tipo: 'provento', categoria: 'Adicionais' },
  '0306': { codigo: '0306', descricao: 'Controle de Rondas Palmeiras', tipo: 'provento', categoria: 'Adicionais' },
  '0307': { codigo: '0307', descricao: 'Supervisão Palmeiras', tipo: 'provento', categoria: 'Adicionais' },
  '0308': { codigo: '0308', descricao: 'Outros Serviços', tipo: 'provento', categoria: 'Adicionais' },
  '0401': { codigo: '0401', descricao: 'Salário-Família', tipo: 'provento', categoria: 'Benefícios' },
  '0501': { codigo: '0501', descricao: '1ª Parcela PLR', tipo: 'provento', categoria: 'PLR' },
  '0502': { codigo: '0502', descricao: '2ª Parcela PLR', tipo: 'provento', categoria: 'PLR' },
  '0503': { codigo: '0503', descricao: 'PLR Proporc. Rescisão', tipo: 'provento', categoria: 'PLR' },
  
  // ========================================
  // RESCISÃO (0510-0519)
  // ========================================
  '0510': { codigo: '0510', descricao: '13º Proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  '0511': { codigo: '0511', descricao: '13º Proporc. Vantagens Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  '0512': { codigo: '0512', descricao: 'Férias Proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  '0513': { codigo: '0513', descricao: '1/3 Férias proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  '0514': { codigo: '0514', descricao: 'PLR Proporc. Rescisão', tipo: 'provento', categoria: 'Rescisão' },
  
  // ========================================
  // 13º SALÁRIO (0520-0539)
  // ========================================
  '0520': { codigo: '0520', descricao: '13º Salário', tipo: 'provento', categoria: '13º Salário' },
  '0521': { codigo: '0521', descricao: 'Vantagens 13º', tipo: 'provento', categoria: '13º Salário' },
  '0522': { codigo: '0522', descricao: '13º Salário 1ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  '0523': { codigo: '0523', descricao: '13º Salário 2ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  '0524': { codigo: '0524', descricao: '13º Salário Vantagens 1ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  '0525': { codigo: '0525', descricao: '13º Salário Vantagens 2ª Parcela', tipo: 'provento', categoria: '13º Salário' },
  '0526': { codigo: '0526', descricao: 'Diferença Media Hora 13º Salário', tipo: 'provento', categoria: '13º Salário' },
  '0527': { codigo: '0527', descricao: 'Saldo de Salário', tipo: 'provento', categoria: 'Vencimentos' },
  
  // ========================================
  // BENEFÍCIOS (0601-0699)
  // ========================================
  '0601': { codigo: '0601', descricao: 'Vale Transporte', tipo: 'provento', categoria: 'Benefícios' },
  '0602': { codigo: '0602', descricao: 'Vale Alimentação', tipo: 'provento', categoria: 'Benefícios' },
  '0603': { codigo: '0603', descricao: 'Cesta Básica', tipo: 'provento', categoria: 'Benefícios' },
  '0604': { codigo: '0604', descricao: 'Prêmio Permanência', tipo: 'provento', categoria: 'Benefícios' },
  'B001': { codigo: 'B001', descricao: 'Desc. Rondas Não Realizadas', tipo: 'desconto', categoria: 'Benefícios' },
  'B002': { codigo: 'B002', descricao: 'Desc. Ajuste dos Benefícios', tipo: 'desconto', categoria: 'Benefícios' },
  'B003': { codigo: 'B003', descricao: 'Desc. Outros Benefícios', tipo: 'desconto', categoria: 'Benefícios' },
  'B010': { codigo: 'B010', descricao: 'Reembolsos', tipo: 'provento', categoria: 'Benefícios' },
  'B011': { codigo: 'B011', descricao: 'Outros Reembolsos', tipo: 'provento', categoria: 'Benefícios' },
  '5003': { codigo: '5003', descricao: 'Desc. VA por Faltas', tipo: 'desconto', categoria: 'Vales' },
  '5004': { codigo: '5004', descricao: 'Desc. VT por Faltas', tipo: 'desconto', categoria: 'Vales' },
  
  // ========================================
  // DESCONTOS (1019, 5000-9999)
  // ========================================
  '1019': { codigo: '1019', descricao: 'Seguro de Vida em Grupo', tipo: 'desconto', categoria: 'Seguros' },
  '5001': { codigo: '5001', descricao: 'Convênio Odontológico', tipo: 'desconto', categoria: 'Convênios' },
  '5002': { codigo: '5002', descricao: 'Contrib. Assistencial', tipo: 'desconto', categoria: 'Sindicais' },
  '5005': { codigo: '5005', descricao: 'Vales Avulsos', tipo: 'desconto', categoria: 'Adiantamentos' },
  '5006': { codigo: '5006', descricao: 'Faltas Injustificadas', tipo: 'desconto', categoria: 'Faltas' },
  '5007': { codigo: '5007', descricao: 'Taxa Sindical PLR', tipo: 'desconto', categoria: 'Sindicais' },
  '5008': { codigo: '5008', descricao: 'Pensão Alimenticia', tipo: 'desconto', categoria: 'Judiciais' },
  '5009': { codigo: '5009', descricao: 'Atrasos / Saídas Antecipadas', tipo: 'desconto', categoria: 'Faltas' },
  '5010': { codigo: '5010', descricao: 'Desc. Complem. Sal. Anterior', tipo: 'desconto', categoria: 'Diversos' },
  '5011': { codigo: '5011', descricao: 'Desc. Rondas Não Realizadas', tipo: 'desconto', categoria: 'Diversos' },
  '5012': { codigo: '5012', descricao: 'Desc. Avaria Utilitário (Parcela)', tipo: 'desconto', categoria: 'Diversos' },
  '5013': { codigo: '5013', descricao: 'Outros Descontos', tipo: 'desconto', categoria: 'Diversos' },
  '5018': { codigo: '5018', descricao: 'INSS 13º', tipo: 'desconto', categoria: 'Legais' },
  '5019': { codigo: '5019', descricao: 'INSS Férias', tipo: 'desconto', categoria: 'Legais' },
  '5020': { codigo: '5020', descricao: 'Desc. DSR s/ Faltas', tipo: 'desconto', categoria: 'Faltas' }, // DSR Limpeza/Zeladoria
  '5021': { codigo: '5021', descricao: 'INSS Diferença 13º Salário', tipo: 'desconto', categoria: 'Legais' },
  '5014': { codigo: '5014', descricao: 'Adiantam. de Salário', tipo: 'desconto', categoria: 'Adiantamentos' },
  '5015': { codigo: '5015', descricao: 'Adiantam. 13º Salário', tipo: 'desconto', categoria: 'Adiantamentos' },
  '5016': { codigo: '5016', descricao: 'Adiantam. Vantagens 13º', tipo: 'desconto', categoria: 'Adiantamentos' },
  '5017': { codigo: '5017', descricao: 'Outros Adiantamentos', tipo: 'desconto', categoria: 'Adiantamentos' },
  '5780': { codigo: '5780', descricao: 'Desc. Vale Transporte', tipo: 'desconto', categoria: 'Vales' },
  '5851': { codigo: '5851', descricao: 'Adiantam. Quinzenal', tipo: 'desconto', categoria: 'Adiantamentos' },
  '9860': { codigo: '9860', descricao: 'INSS', tipo: 'desconto', categoria: 'Legais' },
  '9861': { codigo: '9861', descricao: 'IRRF', tipo: 'desconto', categoria: 'Legais' },
};

export interface LancamentoHolerite {
  codigo: string;
  descricao: string;
  referencia?: string;
  unidade?: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}

/**
 * Mapeia os dados calculados da folha para lançamentos do holerite
 * IMPORTANTE: NÃO inclui benefícios (VT, VA, Cesta Básica, Prêmio)
 */
export function mapearFolhaParaHolerite(
  resultado: any,
  eventosExcepcionais?: any[],
  folhaPonto?: any,
  parametros?: any
): LancamentoHolerite[] {
  resultado = normalizarFolhaCalculada(resultado || {});
  const lancamentos: LancamentoHolerite[] = [];

  // ========================================
  // PROVENTOS
  // ========================================
  
  // Salário Base
  if (resultado.salario_base > 0) {
    let diasTrabalhados = 30;
    if (folhaPonto?.data_inicio || folhaPonto?.data_fim) {
      const dataInicio = folhaPonto.data_inicio 
        ? new Date(folhaPonto.data_inicio + 'T00:00:00')
        : new Date(folhaPonto.ano, folhaPonto.mes - 1, 1);
      const dataFim = folhaPonto.data_fim 
        ? new Date(folhaPonto.data_fim + 'T00:00:00')
        : new Date(folhaPonto.ano, folhaPonto.mes, 0);
      diasTrabalhados = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else if (folhaPonto?.dados_dias) {
      const dados = typeof folhaPonto.dados_dias === 'string' 
        ? JSON.parse(folhaPonto.dados_dias) 
        : folhaPonto.dados_dias;
      const totalDias = Object.keys(dados).length;
      if (totalDias < 30) diasTrabalhados = totalDias;
    }
    
    lancamentos.push({
      codigo: '0001',
      descricao: 'Salário',
      referencia: diasTrabalhados.toString().padStart(3, '0'),
      unidade: 'dia(s)',
      valor: resultado.salario_base,
      tipo: 'provento'
    });
  }

// Helper para converter valor para número (trata vírgulas como separador decimal)
  const converterParaNumero = (valor: any): number => {
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
      // Substitui vírgula por ponto e converte para número
      return parseFloat(valor.replace(',', '.')) || 0;
    }
    return 0;
  };

  // Helper para formatar horas em HH:MM (sem casos "..:60")
  const formatarHorasHHMM = (horasDecimal: any): string => {
    const horas = converterParaNumero(horasDecimal);
    if (!horas || horas <= 0) return '';
    const totalMinutos = Math.round(Math.abs(horas) * 60);
    const horasInteiras = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horasInteiras.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  // Helper para calcular horas a partir do valor monetário (fallback)
  const calcularHorasDeValor = (valor: number, salarioBase: number, multiplicador: number): number => {
    if (!valor || valor <= 0 || !salarioBase || salarioBase <= 0) return 0;
    const salarioHora = salarioBase / 220; // Jornada padrão 220h/mês
    const valorHora = salarioHora * multiplicador;
    return valor / valorHora;
  };

  // Hora Extra 50%
  if (resultado.horas_extras_50 > 0) {
    let horas = converterParaNumero(folhaPonto?.total_horas_extras_50);
    // Fallback: calcular horas a partir do valor
    if (horas <= 0 && resultado.salario_base > 0) {
      horas = calcularHorasDeValor(resultado.horas_extras_50, resultado.salario_base, 1.5);
    }
    lancamentos.push({
      codigo: '0101',
      descricao: 'Hora Extra 50%',
      referencia: formatarHorasHHMM(horas),
      unidade: 'hora(s)',
      valor: resultado.horas_extras_50,
      tipo: 'provento'
    });
  }

  // Intrajornada 50%
  if (resultado.intrajornada_50 > 0) {
    let horas = converterParaNumero(folhaPonto?.total_intrajornada_50);
    if (horas <= 0 && resultado.salario_base > 0) {
      horas = calcularHorasDeValor(resultado.intrajornada_50, resultado.salario_base, 1.5);
    }
    lancamentos.push({
      codigo: '0102',
      descricao: 'Intrajornada 50%',
      referencia: formatarHorasHHMM(horas),
      unidade: 'hora(s)',
      valor: resultado.intrajornada_50,
      tipo: 'provento'
    });
  }

  // Hora Extra 100%
  if (resultado.horas_extras_100 > 0) {
    let horas = converterParaNumero(folhaPonto?.total_horas_extras_100);
    if (horas <= 0 && resultado.salario_base > 0) {
      horas = calcularHorasDeValor(resultado.horas_extras_100, resultado.salario_base, 2.0);
    }
    lancamentos.push({
      codigo: '0103',
      descricao: 'Hora Extra 100%',
      referencia: formatarHorasHHMM(horas),
      unidade: 'hora(s)',
      valor: resultado.horas_extras_100,
      tipo: 'provento'
    });
  }

  // Intrajornada 100%
  if (resultado.intrajornada_100 > 0) {
    let horas = converterParaNumero(folhaPonto?.total_intrajornada_100);
    if (horas <= 0 && resultado.salario_base > 0) {
      horas = calcularHorasDeValor(resultado.intrajornada_100, resultado.salario_base, 2.0);
    }
    lancamentos.push({
      codigo: '0104',
      descricao: 'Intrajornada 100%',
      referencia: formatarHorasHHMM(horas),
      unidade: 'hora(s)',
      valor: resultado.intrajornada_100,
      tipo: 'provento'
    });
  }

  // DSR s/ H. Extras
  if (resultado.dsr_horas_extras > 0) {
    lancamentos.push({
      codigo: '0201',
      descricao: 'D.S.R. s/ H. Extras',
      referencia: '',
      unidade: 'R$',
      valor: resultado.dsr_horas_extras,
      tipo: 'provento'
    });
  }

  // DSR s/ Adicional Noturno
  if (resultado.dsr_adicional_noturno > 0) {
    lancamentos.push({
      codigo: '0202',
      descricao: 'D.S.R. s/ Adicional Noturno',
      referencia: '',
      unidade: 'R$',
      valor: resultado.dsr_adicional_noturno,
      tipo: 'provento'
    });
  }

  // Adicional Noturno
  if (resultado.adicional_noturno > 0) {
    let horas = converterParaNumero(folhaPonto?.total_horas_noturnas);
    // Fallback: calcular horas - adicional noturno é 20% sobre a hora normal
    if (horas <= 0 && resultado.salario_base > 0) {
      horas = calcularHorasDeValor(resultado.adicional_noturno, resultado.salario_base, 0.2);
    }
    lancamentos.push({
      codigo: '0301',
      descricao: 'Adicional Noturno',
      referencia: formatarHorasHHMM(horas),
      unidade: 'hora(s)',
      valor: resultado.adicional_noturno,
      tipo: 'provento'
    });
  }

  // Complemento de Salário
  if (resultado.complemento_salario > 0) {
    lancamentos.push({
      codigo: '0302',
      descricao: 'Complem. de Salário',
      referencia: '',
      unidade: 'R$',
      valor: resultado.complemento_salario,
      tipo: 'provento'
    });
  }

  // Adicional Insalubridade
  if (resultado.adicional_insalubridade > 0) {
    // Insalubridade é sempre 40% do salário mínimo nacional
    lancamentos.push({
      codigo: '0303',
      descricao: 'Adicional Insalubridade',
      referencia: '040',
      unidade: '%',
      valor: resultado.adicional_insalubridade,
      tipo: 'provento'
    });
  }

  // Adicional Acúmulo de Função
  if (resultado.adicional_acumulo_funcao > 0) {
    // Usar o percentual dos parâmetros se disponível, senão calcular
    let percentualFormatado = '020'; // Default 20%
    
    if (parametros?.percentual_acumulo_funcao) {
      percentualFormatado = parametros.percentual_acumulo_funcao.toString().padStart(3, '0');
    } else {
      // Calcular baseado no valor e salário base
      const salarioBase = resultado.salario_base || 1;
      const percentualCalculado = ((resultado.adicional_acumulo_funcao / salarioBase) * 100);
      percentualFormatado = percentualCalculado.toFixed(0).padStart(3, '0');
    }
    
    lancamentos.push({
      codigo: '0304',
      descricao: 'Adicional Acúmulo Função',
      referencia: percentualFormatado,
      unidade: '%',
      valor: resultado.adicional_acumulo_funcao,
      tipo: 'provento'
    });
  }

  // Salário-Família
  if (resultado.salario_familia > 0) {
    lancamentos.push({
      codigo: '0401',
      descricao: 'Salário-Família',
      referencia: '',
      unidade: 'R$',
      valor: resultado.salario_familia,
      tipo: 'provento'
    });
  }

  // 1ª Parcela PLR
  if (resultado.plr > 0) {
    lancamentos.push({
      codigo: '0501',
      descricao: '1ª Parcela PLR',
      referencia: '',
      unidade: 'R$',
      valor: resultado.plr,
      tipo: 'provento'
    });
  }

  // 2ª Parcela PLR
  if (resultado.plr_segunda_parcela > 0) {
    lancamentos.push({
      codigo: '0502',
      descricao: '2ª Parcela PLR',
      referencia: '',
      unidade: 'R$',
      valor: resultado.plr_segunda_parcela,
      tipo: 'provento'
    });
  }

  // ========================================
  // SERVIÇOS EXTERNOS (CAMPOS ESPECÍFICOS)
  // ========================================
  
  // NOTA: Serviços Externos agora são processados apenas como eventos excepcionais
  // para evitar duplicação. Os campos servicos_externos_* são salvos na tabela
  // mas exibidos apenas via eventos excepcionais no holerite.
  
  // Serviços Externos (Folhas de Pagamento) - REMOVIDO para evitar duplicação
  // if (resultado.servicos_externos_folhas_pagamento > 0) {
  //   lancamentos.push({
  //     codigo: '0306',
  //     descricao: 'Serviços Externos (Folhas)',
  //     referencia: '',
  //     unidade: 'R$',
  //     valor: resultado.servicos_externos_folhas_pagamento,
  //     tipo: 'provento'
  //   });
  // }

  // Serviços Externos (Controle de Rondas) - REMOVIDO para evitar duplicação
  // if (resultado.servicos_externos_controle_rondas > 0) {
  //   lancamentos.push({
  //     codigo: '0307',
  //     descricao: 'Serviços Externos (Rondas)',
  //     referencia: '',
  //     unidade: 'R$',
  //     valor: resultado.servicos_externos_controle_rondas,
  //     tipo: 'provento'
  //   });
  // }

  // ========================================
  // DESCONTOS
  // ========================================

  // Seguro de Vida em Grupo
  if (resultado.desconto_seguro_vida > 0) {
    lancamentos.push({
      codigo: '1019',
      descricao: 'Seguro de Vida em Grupo',
      referencia: '1',
      unidade: 'unid',
      valor: resultado.desconto_seguro_vida,
      tipo: 'desconto'
    });
  }

  // Convênio Odontológico
  if (resultado.desconto_convenio_odonto > 0) {
    lancamentos.push({
      codigo: '5001',
      descricao: 'Convênio Odontológico',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_convenio_odonto,
      tipo: 'desconto'
    });
  }

  // Contribuição Assistencial
  if (resultado.desconto_contribuicao_assistencial > 0) {
    lancamentos.push({
      codigo: '5002',
      descricao: 'Contrib. Assistencial',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_contribuicao_assistencial,
      tipo: 'desconto'
    });
  }

  // Faltas Injustificadas
  if (resultado.desconto_faltas > 0) {
    let faltas = folhaPonto?.total_faltas_injustificadas
      ?? (folhaPonto as any)?.faltas_injustificadas
      ?? 0;
    // Fallback: derivar da divisão desconto / valor-dia se a folha de ponto não trouxer a contagem
    if (!faltas && resultado.salario_base > 0) {
      const valorDia = resultado.salario_base / 30;
      if (valorDia > 0) faltas = Math.round(resultado.desconto_faltas / valorDia);
    }
    lancamentos.push({
      codigo: '5006',
      descricao: 'Faltas Injustificadas',
      referencia: faltas > 0 ? faltas.toString() : '',
      unidade: 'dia(s)',
      valor: resultado.desconto_faltas,
      tipo: 'desconto'
    });
  }

  // DSR s/ Faltas (Limpeza/Zeladoria) - CLT
  if (resultado.desconto_dsr_faltas > 0) {
    const diasDSR = resultado.dias_dsr_faltas || 0;
    lancamentos.push({
      codigo: '5013',
      descricao: 'Desc. DSR s/ Faltas',
      referencia: diasDSR > 0 ? diasDSR.toString() : '',
      unidade: 'unid',
      valor: resultado.desconto_dsr_faltas,
      tipo: 'desconto'
    });
  }

  // Taxa Sindical PLR
  if (resultado.desconto_plr > 0) {
    lancamentos.push({
      codigo: '5007',
      descricao: 'Taxa Sindical PLR',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_plr,
      tipo: 'desconto'
    });
  }

  // Pensão Alimentícia
  if (resultado.desconto_pensao_alimenticia > 0) {
    lancamentos.push({
      codigo: '5008',
      descricao: 'Pensão Alimenticia',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_pensao_alimenticia,
      tipo: 'desconto'
    });
  }

  // Atrasos e Saídas Antecipadas
  if (resultado.desconto_atrasos > 0) {
    let atrasos = converterParaNumero(folhaPonto?.total_atrasos);
    // Fallback: calcular horas a partir do valor do desconto (hora normal)
    if (atrasos <= 0 && resultado.salario_base > 0) {
      atrasos = calcularHorasDeValor(resultado.desconto_atrasos, resultado.salario_base, 1.0);
    }
    lancamentos.push({
      codigo: '5009',
      descricao: 'Atrasos / Saídas Antecipadas',
      referencia: formatarHorasHHMM(atrasos),
      unidade: 'hora(s)',
      valor: resultado.desconto_atrasos,
      tipo: 'desconto'
    });
  }

  // Desconto Complemento Anterior
  if (resultado.desconto_complemento_anterior > 0) {
    lancamentos.push({
      codigo: '5010',
      descricao: 'Estouro do Mês Anterior',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_complemento_anterior,
      tipo: 'desconto'
    });
  }

  // Desconto Rondas Não Realizadas
  // ⭐ CORREÇÃO: Verificar se já existe nos eventos excepcionais para evitar duplicação
  const jaExisteRondasNoArray = (eventosExcepcionais || []).some(
    (e) => e?.tipo === 'desconto' && normalizarDescricao(e?.descricao) === 'Desc. Rondas Não Realizadas'
  );
  
  if (resultado.desconto_rondas_nao_realizadas > 0 && !jaExisteRondasNoArray) {
    lancamentos.push({
      codigo: '5011',
      descricao: 'Desc. Rondas Não Realizadas',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_rondas_nao_realizadas,
      tipo: 'desconto'
    });
  }

  // Desconto Avaria Utilitário
  // ⭐ CORREÇÃO: Verificar se já existe nos eventos excepcionais para evitar duplicação
  const jaExisteAvariaNoArray = (eventosExcepcionais || []).some(
    (e) => e?.tipo === 'desconto' && normalizarDescricao(e?.descricao) === 'Desc. Avaria Utilitário (Parcela)'
  );
  
  if (resultado.desc_avaria_utilitario > 0 && !jaExisteAvariaNoArray) {
    lancamentos.push({
      codigo: '5012',
      descricao: 'Desc. Avaria Utilitário (Parcela)',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desc_avaria_utilitario,
      tipo: 'desconto'
    });
  }

  // Desconto Vale Transporte (6%)
  if (resultado.desconto_vt > 0) {
    lancamentos.push({
      codigo: '5780',
      descricao: 'Desc. Vale Transporte',
      referencia: '006',
      unidade: '%',
      valor: resultado.desconto_vt,
      tipo: 'desconto'
    });
  }

  // Desconto Adiantamento Quinzenal (40%)
  if (resultado.desconto_adiantamento_quinzenal > 0) {
    lancamentos.push({
      codigo: '5851',
      descricao: 'Desconto Adiantam. Quinzenal',
      referencia: '040',
      unidade: '%',
      valor: resultado.desconto_adiantamento_quinzenal,
      tipo: 'desconto'
    });
  }

  // Desconto Adiantamento de Salário
  // Regra: exibir no holerite quando houver valor salvo no campo específico.
  // Evita duplicação caso o mesmo lançamento já venha dentro de eventosExcepcionais.
  const jaExisteAdiantamentoSalarioNoArray = (eventosExcepcionais || []).some(
    (e) => e?.tipo === 'desconto' && e?.descricao === 'Adiantam. de Salário'
  );

  if ((resultado.desconto_adiantamento_salario || 0) > 0 && !jaExisteAdiantamentoSalarioNoArray) {
    lancamentos.push({
      codigo: '5016',
      descricao: 'Adiantam. de Salário',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_adiantamento_salario,
      tipo: 'desconto'
    });
  }

  // INSS
  if (resultado.desconto_inss > 0) {
    const baseINSS = resultado.base_inss || resultado.salario_base || 1;
    const aliquotaEfetiva = ((resultado.desconto_inss / baseINSS) * 100).toFixed(2).replace('.', ',');
    lancamentos.push({
      codigo: '9860',
      descricao: 'INSS',
      referencia: aliquotaEfetiva,
      unidade: '%',
      valor: resultado.desconto_inss,
      tipo: 'desconto'
    });
  }

  // IRRF
  if (resultado.desconto_irrf > 0) {
    const baseIRRF = resultado.base_irrf || ((resultado.base_inss || resultado.salario_base || 1) - (resultado.desconto_inss || 0));
    const aliquotaEfetiva = ((resultado.desconto_irrf / baseIRRF) * 100).toFixed(2).replace('.', ',');
    lancamentos.push({
      codigo: '9861',
      descricao: 'IRRF',
      referencia: aliquotaEfetiva,
      unidade: '%',
      valor: resultado.desconto_irrf,
      tipo: 'desconto'
    });
  }

  // ========================================
  // EVENTOS EXCEPCIONAIS
  // ========================================
  if (eventosExcepcionais && eventosExcepcionais.length > 0) {
    eventosExcepcionais.forEach(evento => {
      // Ignorar benefícios (vão para o Recibo de Benefícios)
      if (evento.tipo === 'beneficio') return;
      
      // ⭐ Normalizar descrição antes de mapear código contábil
      const descricaoNormalizada = normalizarDescricao(evento.descricao);
      
      let codigo = evento.tipo === 'provento' ? '0002' : '5005';
      
      // Mapear descrição para código contábil específico
      if (evento.tipo === 'provento') {
        if (descricaoNormalizada === '13º Proporc. Rescisão') codigo = '0510';
        else if (descricaoNormalizada === '13º Proporc. Vantagens Rescisão') codigo = '0511';
        else if (descricaoNormalizada === 'Férias Proporc. Rescisão') codigo = '0512';
        else if (descricaoNormalizada === '1/3 Férias proporc. Rescisão') codigo = '0513';
        else if (descricaoNormalizada === 'PLR Proporc. Rescisão') codigo = '0514';
        else if (descricaoNormalizada === '2ª Parcela PLR') codigo = '0502';
        else if (descricaoNormalizada === '13º Salário') codigo = '0520';
        else if (descricaoNormalizada === 'Vantagens 13º') codigo = '0521';
        else if (descricaoNormalizada === '13º Salário 1ª Parcela') codigo = '0522';
        else if (descricaoNormalizada === '13º Salário 2ª Parcela') codigo = '0523';
        else if (descricaoNormalizada === '13º Salário Vantagens 1ª Parcela') codigo = '0524';
        else if (descricaoNormalizada === '13º Salário Vantagens 2ª Parcela') codigo = '0525';
        else if (descricaoNormalizada === 'Diferença Media Hora 13º Salário') codigo = '0526';
        else if (descricaoNormalizada.startsWith('Saldo de Salário')) codigo = '0527';
        else if (descricaoNormalizada === 'Folhas de Pagamento') codigo = '0305';
        else if (descricaoNormalizada === 'Controle de Rondas Palmeiras') codigo = '0306';
        else if (descricaoNormalizada === 'Supervisão Palmeiras') codigo = '0307';
        else if (descricaoNormalizada === 'Outros Serviços') codigo = '0308';
      } else if (evento.tipo === 'desconto') {
        if (descricaoNormalizada === 'INSS 13º') codigo = '5018';
        else if (descricaoNormalizada === 'INSS Férias') codigo = '5019';
        else if (descricaoNormalizada === 'INSS Diferença 13º Salário') codigo = '5021';
        else if (descricaoNormalizada === 'Adiantam. de Salário') codigo = '5014';
        else if (descricaoNormalizada === 'Adiantam. 13º Salário') codigo = '5015';
        else if (descricaoNormalizada === 'Adiantam. Vantagens 13º') codigo = '5016';
        else if (descricaoNormalizada === 'Outros Adiantamentos') codigo = '5017';
        else if (descricaoNormalizada === 'Desc. Avaria Utilitário (Parcela)') codigo = '5012';
        else if (descricaoNormalizada === 'Desc. Rondas Não Realizadas') codigo = '5011';
        else if (descricaoNormalizada === 'Outros Descontos') codigo = '5013';
      } else if (evento.tipo === 'beneficio') {
        if (descricaoNormalizada === 'Desc. Rondas Não Realizadas') codigo = 'B001';
        else if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') codigo = 'B002';
        else if (descricaoNormalizada === 'Desc. Outros Benefícios') codigo = 'B003';
        else if (descricaoNormalizada === 'Reembolsos') codigo = 'B010';
        else if (descricaoNormalizada === 'Outros Reembolsos') codigo = 'B011';
      }
      
      lancamentos.push({
        codigo,
        descricao: descricaoNormalizada,
        referencia: '',
        unidade: 'R$',
        valor: Math.abs(evento.valor),
        tipo: evento.tipo
      });
    });
  }

  // ========================================
  // ORDENAÇÃO: PROVENTOS PRIMEIRO, DESCONTOS DEPOIS
  // ========================================
  
  // Separar proventos e descontos
  const proventos = lancamentos.filter(l => l.tipo === 'provento');
  const descontos = lancamentos.filter(l => l.tipo === 'desconto');
  
  // Ordenar proventos por código (ordem crescente) - Salário sempre primeiro
  proventos.sort((a, b) => {
    // Salário (0001) sempre primeiro
    if (a.codigo === '0001') return -1;
    if (b.codigo === '0001') return 1;
    
    // Depois ordenar por código
    return a.codigo.localeCompare(b.codigo);
  });
  
  // Ordenar descontos por código (ordem crescente) - INSS e IRRF por último
  descontos.sort((a, b) => {
    // INSS (9860) e IRRF (9861) sempre por último
    if (a.codigo === '9860' || a.codigo === '9861') return 1;
    if (b.codigo === '9860' || b.codigo === '9861') return -1;
    
    // Depois ordenar por código
    return a.codigo.localeCompare(b.codigo);
  });
  
  // Retornar proventos primeiro, depois descontos
  return [...proventos, ...descontos];
}

/**
 * Formata valor monetário
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}
