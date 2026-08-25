/**
 * Cálculo de valores de férias baseado na média salarial dos últimos 12 meses
 * Inclui: salário base, horas extras, adicional noturno, insalubridade,
 * acúmulo de função, DSRs, intrajornada, folga trabalhada
 */

import { supabase } from '../src/integrations/supabase/client';

interface FolhaCalcResumo {
  mes: number;
  ano: number;
  salario_base: number;
  horas_extras_50: number;
  horas_extras_100: number;
  adicional_noturno: number;
  adicional_insalubridade: number;
  adicional_acumulo_funcao: number;
  dsr_horas_extras: number;
  dsr_adicional_noturno: number;
  intrajornada_50: number;
  intrajornada_100: number;
  folga_trabalhada: number;
  complemento_salario: number;
}

export interface ResultadoCalculoFerias {
  salario_base_calculo: number; // Média mensal total
  valor_ferias: number;
  valor_terco: number;
  valor_abono: number;
  valor_total: number;
  detalhamento: {
    media_salario_base: number;
    media_horas_extras: number;
    media_adicional_noturno: number;
    media_insalubridade: number;
    media_acumulo_funcao: number;
    media_dsr: number;
    media_intrajornada: number;
    media_folga_trabalhada: number;
    media_complemento: number;
    media_fixos_total: number;
    media_variaveis_total: number;
    meses_encontrados: number;
  };
}

/**
 * Busca as folhas calculadas dos 12 meses anteriores à data de início do gozo
 */
async function buscarFolhasDosPeriodo(
  funcionarioId: string,
  dataInicioGozo: string
): Promise<FolhaCalcResumo[]> {
  const dataGozo = new Date(dataInicioGozo + 'T00:00:00');
  
  // 12 meses anteriores ao mês de início do gozo
  const dataLimite = new Date(dataGozo);
  dataLimite.setMonth(dataLimite.getMonth() - 12);

  const mesInicio = dataLimite.getMonth() + 1;
  const anoInicio = dataLimite.getFullYear();
  const mesFim = dataGozo.getMonth() + 1;
  const anoFim = dataGozo.getFullYear();


  const { data, error } = await supabase
    .from('folha_calculada')
    .select(`
      mes, ano, salario_base,
      horas_extras_50, horas_extras_100,
      adicional_noturno,
      adicional_insalubridade,
      adicional_acumulo_funcao,
      dsr_horas_extras, dsr_adicional_noturno,
      intrajornada_50, intrajornada_100,
      folga_trabalhada,
      complemento_salario
    `)
    .eq('funcionario_id', funcionarioId)
    .order('ano', { ascending: true })
    .order('mes', { ascending: true });

  if (error) {
    return [];
  }

  // Filtrar folhas dentro do período de 12 meses anteriores ao gozo
  const folhasFiltradas = (data || []).filter(f => {
    const dataFolha = new Date(f.ano, f.mes - 1, 1);
    return dataFolha >= dataLimite && dataFolha < dataGozo;
  });

  return folhasFiltradas.map(f => ({
    mes: f.mes,
    ano: f.ano,
    salario_base: Number(f.salario_base) || 0,
    horas_extras_50: Number(f.horas_extras_50) || 0,
    horas_extras_100: Number(f.horas_extras_100) || 0,
    adicional_noturno: Number(f.adicional_noturno) || 0,
    adicional_insalubridade: Number(f.adicional_insalubridade) || 0,
    adicional_acumulo_funcao: Number(f.adicional_acumulo_funcao) || 0,
    dsr_horas_extras: Number(f.dsr_horas_extras) || 0,
    dsr_adicional_noturno: Number(f.dsr_adicional_noturno) || 0,
    intrajornada_50: Number(f.intrajornada_50) || 0,
    intrajornada_100: Number(f.intrajornada_100) || 0,
    folga_trabalhada: Number(f.folga_trabalhada) || 0,
    complemento_salario: Number(f.complemento_salario) || 0,
  }));
}

/**
 * Calcula a média de um campo ao longo das folhas
 * Para variáveis (HE, AN, etc.), só calcula média sobre meses que tiveram valor > 0
 * Para salário base, usa todos os meses
 */
function calcularMedia(folhas: FolhaCalcResumo[], campo: keyof FolhaCalcResumo, apenasComValor: boolean = false): number {
  if (folhas.length === 0) return 0;
  
  const soma = folhas.reduce((acc, f) => acc + (Number(f[campo]) || 0), 0);
  
  if (apenasComValor) {
    // Para variáveis: média = soma / 12 (sempre dividir por 12 conforme CLT)
    return soma / 12;
  }
  
  return soma / folhas.length;
}

/**
 * Calcula os valores de férias para um funcionário
 */
export async function calcularValoresFerias(
  funcionarioId: string,
  dataInicioGozo: string,
  diasGozados: number = 30,
  diasAbono: number = 0
): Promise<ResultadoCalculoFerias> {
  const folhas = await buscarFolhasDosPeriodo(funcionarioId, dataInicioGozo);

  // Buscar dados de apoio: funcionário, cargo e parâmetros vigentes
  const { data: func } = await supabase
    .from('funcionarios')
    .select('cargo_id, adicional_insalubridade, acumulo_funcao')
    .eq('id', funcionarioId)
    .single();

  let salarioBaseAtual = 0;
  if (func?.cargo_id) {
    const { data: cargo } = await supabase
      .from('cargos')
      .select('salario_base')
      .eq('id', func.cargo_id)
      .single();
    salarioBaseAtual = Number(cargo?.salario_base) || 0;
  }

  const anoRef = new Date(dataInicioGozo + 'T00:00:00').getFullYear();
  const { data: parametros } = await supabase
    .from('parametros_calculo')
    .select('salario_minimo, percentual_insalubridade, percentual_acumulo_funcao')
    .eq('ano_vigencia', anoRef)
    .eq('ativo', true)
    .maybeSingle();

  const salarioMinimo = Number(parametros?.salario_minimo) || 0;
  const percInsalubridade = Number(parametros?.percentual_insalubridade) || 0;
  const percAcumulo = Number(parametros?.percentual_acumulo_funcao) || 0;

  // Insalubridade calculada sobre o salário mínimo nacional (parâmetros)
  const insalubridadeAtual = func?.adicional_insalubridade
    ? salarioMinimo * (percInsalubridade / 100)
    : 0;
  // Acúmulo de função calculado sobre o salário base atual (cargo)
  const acumuloAtual = func?.acumulo_funcao
    ? salarioBaseAtual * (percAcumulo / 100)
    : 0;

  // Se não há histórico de folhas, calcula férias somente com fixos atuais
  if (folhas.length === 0) {
    const remunFixa = salarioBaseAtual + insalubridadeAtual + acumuloAtual;
    const valorDiarioBase = remunFixa / 30;
    const valorFerias = valorDiarioBase * diasGozados;
    const valorTerco = valorFerias / 3;
    const valorAbono = diasAbono > 0
      ? (valorDiarioBase * diasAbono) + ((valorDiarioBase * diasAbono) / 3)
      : 0;

    return {
      salario_base_calculo: remunFixa,
      valor_ferias: Math.round(valorFerias * 100) / 100,
      valor_terco: Math.round(valorTerco * 100) / 100,
      valor_abono: Math.round(valorAbono * 100) / 100,
      valor_total: Math.round((valorFerias + valorTerco + valorAbono) * 100) / 100,
      detalhamento: {
        media_salario_base: salarioBaseAtual,
        media_horas_extras: 0,
        media_adicional_noturno: 0,
        media_insalubridade: insalubridadeAtual,
        media_acumulo_funcao: acumuloAtual,
        media_dsr: 0,
        media_intrajornada: 0,
        media_folga_trabalhada: 0,
        media_complemento: 0,
        media_fixos_total: remunFixa,
        media_variaveis_total: 0,
        meses_encontrados: 0,
      }
    };
  }

  // Médias dos últimos 12 meses (variáveis)
  const mediaHE50 = calcularMedia(folhas, 'horas_extras_50', true);
  const mediaHE100 = calcularMedia(folhas, 'horas_extras_100', true);
  const mediaAN = calcularMedia(folhas, 'adicional_noturno', true);
  const mediaDSR_HE = calcularMedia(folhas, 'dsr_horas_extras', true);
  const mediaDSR_AN = calcularMedia(folhas, 'dsr_adicional_noturno', true);
  const mediaIntra50 = calcularMedia(folhas, 'intrajornada_50', true);
  const mediaIntra100 = calcularMedia(folhas, 'intrajornada_100', true);
  const mediaFolga = calcularMedia(folhas, 'folga_trabalhada', true);
  const mediaComplemento = calcularMedia(folhas, 'complemento_salario', true);

  const mediaHorasExtras = mediaHE50 + mediaHE100;
  const mediaDSR = mediaDSR_HE + mediaDSR_AN;
  const mediaIntrajornada = mediaIntra50 + mediaIntra100;

  // Mantém variáveis legadas para o detalhamento
  const mediaSalarioBase = salarioBaseAtual;
  const mediaInsalubridade = insalubridadeAtual;
  const mediaAcumulo = acumuloAtual;

  // Remuneração mensal (base de cálculo das férias)
  // Fixos vêm das tabelas de apoio (cargo + parâmetros), variáveis das médias 12m
  const remunFixa = salarioBaseAtual + insalubridadeAtual + acumuloAtual;
  const remunVariavel = 
    mediaHorasExtras +
    mediaAN +
    mediaDSR +
    mediaIntrajornada +
    mediaFolga +
    mediaComplemento;

  const remuneracaoMedia = remunFixa + remunVariavel;


  // Cálculo das férias
  const valorDiario = remuneracaoMedia / 30;
  const valorFerias = valorDiario * diasGozados;
  const valorTerco = valorFerias / 3;
  
  // Abono pecuniário = valor dos dias de abono + 1/3 sobre eles
  let valorAbono = 0;
  if (diasAbono > 0) {
    const feriasAbono = valorDiario * diasAbono;
    const tercoAbono = feriasAbono / 3;
    valorAbono = feriasAbono + tercoAbono;
  }

  const valorTotal = valorFerias + valorTerco + valorAbono;
  
  // LOGICA PARA IRRF 2026: Isenção se o bruto for até R$ 5.000,00
  // Note: O cálculo do IRRF final será feito no front-end ou no momento de salvar,
  // mas aqui garantimos que a base bruta está disponível.
  
  return {
    salario_base_calculo: remuneracaoMedia,
    valor_ferias: Math.round(valorFerias * 100) / 100,
    valor_terco: Math.round(valorTerco * 100) / 100,
    valor_abono: Math.round(valorAbono * 100) / 100,
    valor_total: Math.round(valorTotal * 100) / 100,
    detalhamento: {
      media_salario_base: mediaSalarioBase,
      media_horas_extras: mediaHorasExtras,
      media_adicional_noturno: mediaAN,
      media_insalubridade: mediaInsalubridade,
      media_acumulo_funcao: mediaAcumulo,
      media_dsr: mediaDSR,
      media_intrajornada: mediaIntrajornada,
      media_folga_trabalhada: mediaFolga,
      media_complemento: mediaComplemento,
      media_fixos_total: remunFixa,
      media_variaveis_total: remunVariavel,
      meses_encontrados: folhas.length,
    }
  };
}

/**
 * Calcula e salva os valores de férias no banco
 */
export async function calcularESalvarFerias(
  feriasId: string,
  funcionarioId: string,
  dataInicioGozo: string,
  diasGozados: number = 30,
  diasAbono: number = 0
): Promise<{ success: boolean; resultado?: ResultadoCalculoFerias; error?: string }> {
  try {
    const resultado = await calcularValoresFerias(
      funcionarioId,
      dataInicioGozo,
      diasGozados,
      diasAbono
    );

    // Calcular INSS e IRRF sobre o bruto para salvar o LÍQUIDO no valor_total
    // Precisamos buscar os parâmetros de cálculo
    const anoRef = new Date(dataInicioGozo + 'T00:00:00').getFullYear();
    const { data: parametros } = await supabase
      .from('parametros_calculo')
      .select('*')
      .eq('ano_vigencia', anoRef)
      .eq('ativo', true)
      .maybeSingle();

    let valorLiquido = resultado.valor_total;
    if (parametros) {
      // Importação dinâmica para evitar dependência circular se houver
      const { calcularINSS, calcularIRRF } = await import('./calcularFolhaPagamento');
      const inss = calcularINSS(resultado.valor_total, parametros as any);
      const irrf = calcularIRRF(resultado.valor_total, inss, parametros as any);
      valorLiquido = Number((resultado.valor_total - inss - irrf).toFixed(2));
    }

    const { error } = await supabase
      .from('ferias')
      .update({
        salario_base_calculo: resultado.salario_base_calculo,
        valor_ferias: resultado.valor_total, // Salva o BRUTO no valor_ferias
        valor_terco: resultado.valor_terco,
        valor_abono: resultado.valor_abono,
        valor_total: valorLiquido, // Salva o LÍQUIDO no valor_total
        // Adicionando itens_calculados para o portal do funcionário
        itens_calculados: {
          proventos: [
            { id: 'ferias', label: 'Férias (30d) + 1/3', valor: Math.round((resultado.detalhamento.media_fixos_total / 30 * (diasGozados || 30)) * 1.33333333 * 100) / 100 },
            ...(resultado.detalhamento.media_variaveis_total > 0 ? [
              { id: 'vantagens', label: 'Vantagens + 1/3', valor: Math.round((resultado.detalhamento.media_variaveis_total / 30 * (diasGozados || 30)) * 1.33333333 * 100) / 100 }
            ] : []),
            ...(resultado.valor_abono > 0 ? [
              { id: 'abono', label: 'Abono Pecuniário', valor: resultado.valor_abono }
            ] : [])
          ],
          descontos: [
            { id: 'inss', label: 'INSS', valor: parametros ? (await import('./calcularFolhaPagamento')).calcularINSS(resultado.valor_total, parametros as any) : 0 },
            { id: 'irrf', label: 'IRRF', valor: parametros ? (await import('./calcularFolhaPagamento')).calcularIRRF(resultado.valor_total, (parametros as any).inss_faixa1_limite ? (await import('./calcularFolhaPagamento')).calcularINSS(resultado.valor_total, parametros as any) : 0, parametros as any) : 0 }
          ]
        }
      })
      .eq('id', feriasId);

    if (error) throw error;

    return { success: true, resultado };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
