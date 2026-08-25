// Códigos contábeis para HOLERITE DE SALÁRIO (sem itens de 13°)
import { normalizarDescricao } from '../../utils/eventosExcepcionaisValidator';

export interface LancamentoHolerite {
  codigo: string;
  descricao: string;
  referencia?: string;
  unidade?: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}

// Lista de descrições que devem ser EXCLUÍDAS do holerite de salário (itens de 13°, serviços externos)
const ITENS_EXCLUIDOS_HOLERITE_SALARIO = [
  'Folhas de Pagamento',
  'Controle de Rondas Palmeiras',
  'Supervisão Palmeiras',
  'Outros Serviços',
  '13º Salário',
  'Vantagens 13º',
  '13º Salário 1ª Parcela',
  '13º Salário 2ª Parcela',
  '13º Salário Vantagens 1ª Parcela',
  '13º Salário Vantagens 2ª Parcela',
  'Diferença Media Hora 13º Salário',
  'INSS 13º',
  'INSS Férias',
  'INSS Diferença 13º Salário',
  'Adiantam. 13º Salário',
  'Adiantam. Vantagens 13º',
];

/**
 * Verifica se um item deve ser excluído do holerite de salário
 */
export function deveExcluirDoHoleriteSalario(descricao: string): boolean {
  const descNormalizada = normalizarDescricao(descricao);
  return ITENS_EXCLUIDOS_HOLERITE_SALARIO.some(
    item => normalizarDescricao(item) === descNormalizada
  );
}

/**
 * Mapeia os dados calculados da folha para lançamentos do holerite de SALÁRIO
 * EXCLUI: Serviços Externos, 13° Salário e itens relacionados
 */
export function mapearFolhaParaHoleriteSalario(
  resultado: any,
  eventosExcepcionais?: any[],
  folhaPonto?: any,
  parametros?: any
): LancamentoHolerite[] {
  const lancamentos: LancamentoHolerite[] = [];

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

  // Hora Extra 50%
  if (resultado.horas_extras_50 > 0) {
    let horas = converterParaNumero(folhaPonto?.total_horas_extras_50);
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
    let percentualFormatado = '020';
    if (parametros?.percentual_acumulo_funcao) {
      percentualFormatado = parametros.percentual_acumulo_funcao.toString().padStart(3, '0');
    } else {
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

  // Folga Trabalhada (FT) — É benefício (diária), exibido apenas no Recibo de Benefícios, não no holerite de salário

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

  // Supervisão (Palmeiras)
  if (resultado.supervisao_palmeiras > 0) {
    lancamentos.push({
      codigo: '0308',
      descricao: 'Supervisão (Palmeiras)',
      referencia: '',
      unidade: 'R$',
      valor: resultado.supervisao_palmeiras,
      tipo: 'provento'
    });
  }

  // 2ª Parcela PLR (campo específico se existir)
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
    const faltas = folhaPonto?.total_faltas_injustificadas || 0;
    lancamentos.push({
      codigo: '5006',
      descricao: 'Faltas Injustificadas',
      referencia: faltas > 0 ? faltas.toString() : '',
      unidade: 'dia(s)',
      valor: resultado.desconto_faltas,
      tipo: 'desconto'
    });
  }

  // Desconto DSR s/ Faltas (Limpeza/Zeladoria) - CLT
  if (resultado.desconto_dsr_faltas > 0) {
    const diasDsr = resultado.dias_dsr_faltas || 0;
    lancamentos.push({
      codigo: '5020',
      descricao: 'Desc. DSR s/ Faltas',
      referencia: diasDsr > 0 ? diasDsr.toString() : '',
      unidade: 'dia(s)',
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

  // Desconto Adiantamento de Salário
  const jaExisteAdiantamentoSalarioNoArray = (eventosExcepcionais || []).some(
    (e) => e?.tipo === 'desconto' && e?.descricao === 'Adiantam. de Salário'
  );

  if ((resultado.desconto_adiantamento_salario || 0) > 0 && !jaExisteAdiantamentoSalarioNoArray) {
    lancamentos.push({
      codigo: '5014',
      descricao: 'Adiantam. de Salário',
      referencia: '',
      unidade: 'R$',
      valor: resultado.desconto_adiantamento_salario,
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

  // INSS
  if (resultado.desconto_inss > 0) {
    const baseINSS = resultado.salario_base || 1;
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
    const baseIRRF = (resultado.salario_base || 1) - (resultado.desconto_inss || 0);
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
  // EVENTOS EXCEPCIONAIS (EXCLUINDO ITENS DE 13°)
  // ========================================
  if (eventosExcepcionais && eventosExcepcionais.length > 0) {
    eventosExcepcionais.forEach(evento => {
      const descricaoNormalizada = normalizarDescricao(evento.descricao);
      const descLower = (descricaoNormalizada || '').toLowerCase();

      // Eventos tipo 'beneficio' normalmente não entram no recibo de salário,
      // EXCETO quando são descontos anotados no container de Benefícios
      // (identificados pela descrição iniciando com "Desc" ou valor negativo).
      let tipoEfetivo: 'provento' | 'desconto';
      if (evento.tipo === 'beneficio') {
        if (descLower.startsWith('desc') || Number(evento.valor) < 0) {
          tipoEfetivo = 'desconto';
        } else {
          return; // Benefício puro — ignorar no holerite de salário
        }
      } else {
        tipoEfetivo = evento.tipo;
      }

      // Ignorar itens que devem ser excluídos do holerite de salário
      if (deveExcluirDoHoleriteSalario(evento.descricao)) return;

      let codigo = tipoEfetivo === 'provento' ? '0002' : '5005';

      // Mapear descrição para código contábil específico
      if (tipoEfetivo === 'provento') {
        if (descricaoNormalizada === '13º Proporc. Rescisão') codigo = '0510';
        else if (descricaoNormalizada === '13º Proporc. Vantagens Rescisão') codigo = '0511';
        else if (descricaoNormalizada === 'Férias Proporc. Rescisão') codigo = '0512';
        else if (descricaoNormalizada === '1/3 Férias proporc. Rescisão') codigo = '0513';
        else if (descricaoNormalizada === 'PLR Proporc. Rescisão') codigo = '0514';
        else if (descricaoNormalizada === '2ª Parcela PLR') codigo = '0502';
        else if (descricaoNormalizada.startsWith('Saldo de Salário')) codigo = '0527';
        else if (descricaoNormalizada === 'Folhas de Pagamento') codigo = '0305';
        else if (descricaoNormalizada === 'Controle de Rondas Palmeiras') codigo = '0306';
        else if (descricaoNormalizada === 'Supervisão Palmeiras') codigo = '0307';
        else if (descricaoNormalizada === 'Outros Serviços') codigo = '0308';
      } else if (tipoEfetivo === 'desconto') {
        if (descricaoNormalizada === 'Adiantam. de Salário') codigo = '5014';
        else if (descricaoNormalizada === 'Desc. Avaria Utilitário (Parcela)') codigo = '5012';
        else if (descricaoNormalizada === 'Desc. Rondas Não Realizadas') codigo = '5011';
        else if (descricaoNormalizada === 'Outros Descontos') codigo = '5013';
        else if (descricaoNormalizada === 'Outros Adiantamentos') codigo = '5017';
        else if (descricaoNormalizada === 'Desc. Ajuste dos Benefícios') codigo = '5015';
        else if (descricaoNormalizada === 'Desc. VT por Faltas') codigo = '5004';
        else if (descricaoNormalizada === 'Desc. VA por Faltas') codigo = '5003';
      }

      lancamentos.push({
        codigo,
        descricao: descricaoNormalizada,
        referencia: '',
        unidade: 'R$',
        valor: Math.abs(Number(evento.valor)),
        tipo: tipoEfetivo
      });
    });
  }

  // ========================================
  // ORDENAÇÃO
  // ========================================
  const proventos = lancamentos.filter(l => l.tipo === 'provento');
  const descontos = lancamentos.filter(l => l.tipo === 'desconto');
  
  proventos.sort((a, b) => {
    if (a.codigo === '0001') return -1;
    if (b.codigo === '0001') return 1;
    return a.codigo.localeCompare(b.codigo);
  });
  
  descontos.sort((a, b) => {
    if (a.codigo === '9860' || a.codigo === '9861') return 1;
    if (b.codigo === '9860' || b.codigo === '9861') return -1;
    return a.codigo.localeCompare(b.codigo);
  });
  
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
