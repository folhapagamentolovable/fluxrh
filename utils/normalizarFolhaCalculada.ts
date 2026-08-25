const toNumber = (valor: any): number => {
  const numero = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const arredondarCentavos = (valor: number): number => Math.round((valor + Number.EPSILON) * 100) / 100;

const somaCampos = (fonte: any, campos: string[]): number =>
  arredondarCentavos(campos.reduce((total, campo) => total + toNumber(fonte?.[campo]), 0));

const CAMPOS_PROVENTOS_SEM_COMPLEMENTO = [
  'salario_base',
  'horas_extras_50',
  'horas_extras_100',
  'adicional_noturno',
  'intrajornada_50',
  'intrajornada_100',
  'dsr_horas_extras',
  'dsr_adicional_noturno',
  'adicional_insalubridade',
  'adicional_acumulo_funcao',
  'salario_familia',
  'decimo_terceiro_primeira_parcela',
  'decimo_terceiro_segunda_parcela',
  'decimo_terceiro_vantagens_primeira_parcela',
  'decimo_terceiro_vantagens_segunda_parcela',
  'decimo_terceiro_integral',
  'vantagens_13',
  'servicos_externos_folhas_pagamento',
  'servicos_externos_controle_rondas',
  'supervisao_palmeiras',
  'decimo_terceiro_proporcional_rescisao',
  'decimo_terceiro_vantagens_rescisao',
  'ferias_proporcionais_rescisao',
  'um_terco_ferias_proporcional_rescisao',
  'plr_proporcional_rescisao',
];

const CAMPOS_DESCONTOS = [
  'desconto_inss',
  'desconto_irrf',
  'desconto_vt',
  'desconto_vt_faltas',
  'desconto_va_faltas',
  'desconto_seguro_vida',
  'desconto_convenio_odonto',
  'desconto_contribuicao_assistencial',
  'desconto_atrasos',
  'desconto_faltas',
  'desconto_dsr_faltas',
  'desconto_plr',
  'desconto_pensao_alimenticia',
  'desconto_rondas_nao_realizadas',
  'desconto_adiantamento_quinzenal',
  'desconto_complemento_anterior',
  'desc_avaria_utilitario',
  'desconto_adiantamento_salario',
  'inss_13',
  'inss_ferias',
  'adiantamento_13_salario',
  'adiantamento_vantagens_13',
];

// ⚠️ NÃO incluir aqui os campos totais `vale_transporte` / `vale_alimentacao`:
// eles são legados e representam a SOMA de `_mes_anterior` + `_mes_atual`.
// Somá-los junto com os campos separados duplica VT/VA. Ver calcularBeneficiosVTVA().
const CAMPOS_BENEFICIOS = [
  'cesta_basica',
  'premio_permanencia',
  'plr',
  'folga_trabalhada',
  'valor_vt_folgas_trabalhadas',
  'valor_va_folgas_trabalhadas',
  'reembolsos_uber',
];

/**
 * VT/VA sem duplicação: usa os campos separados por mês quando existirem,
 * senão cai para o campo total legado.
 */
const calcularBeneficiosVTVA = (folha: any): number => {
  const vtAnterior = toNumber(folha?.vale_transporte_mes_anterior);
  const vtAtual = toNumber(folha?.vale_transporte_mes_atual);
  const vaAnterior = toNumber(folha?.vale_alimentacao_mes_anterior);
  const vaAtual = toNumber(folha?.vale_alimentacao_mes_atual);

  const vt = vtAnterior || vtAtual ? vtAnterior + vtAtual : toNumber(folha?.vale_transporte);
  const va = vaAnterior || vaAtual ? vaAnterior + vaAtual : toNumber(folha?.vale_alimentacao);

  return arredondarCentavos(vt + va);
};


// Campos armazenados como POSITIVOS mas que representam descontos sobre os benefícios (subtraem)
const CAMPOS_BENEFICIOS_NEGATIVOS = [
  'desc_ajuste_beneficios',
  'desc_rondas_nao_realizadas_benef',
];

const normalizarDescricaoEvento = (descricao: any): string =>
  String(descricao || '').trim().toLowerCase();

const descricoesComCampoEspecifico = new Set([
  'adiantam. de salário',
  'adiantam. 13º salário',
  'adiantam. vantagens 13º',
  'inss 13º',
  'inss férias',
  'desc. avaria utilitário',
  'desc. avaria utilitário (parcela)',
  'desc. rondas não realizadas',
  'pensão alimentícia',
  'desconto plr',
  'folhas de pagamento',
  'serviços externos (folhas de pagamento)',
  'controle de rondas palmeiras',
  'serviços externos (controle de rondas)',
  'supervisão palmeiras',
  'supervisão (palmeiras)',
  '13º salário',
  'vantagens 13º',
  '13º salário 1ª parcela',
  '13º salário 2ª parcela',
  '13º salário vantagens 1ª parcela',
  '13º salário vantagens 2ª parcela',
  '13º proporc. rescisão',
  '13º proporc. vantagens rescisão',
  'férias proporc. rescisão',
  '1/3 férias proporc. rescisão',
  'plr proporc. rescisão',
  'ft (folga trabalhada)',
  'folga trabalhada',
  'reembolsos',
  'reembolsos uber',
  'reembolsos (uber)',
  'desc. ajuste dos benefícios',
]);

const eventosLivresPorTipo = (folha: any, tipo: 'provento' | 'desconto' | 'beneficio'): number => {
  const eventos = Array.isArray(folha?.eventos_excepcionais) ? folha.eventos_excepcionais : [];
  return arredondarCentavos(eventos.reduce((total: number, evento: any) => {
    if (evento?.tipo !== tipo) return total;
    const descricao = normalizarDescricaoEvento(evento.descricao);
    if (descricoesComCampoEspecifico.has(descricao)) return total;
    return total + Math.abs(toNumber(evento.valor));
  }, 0));
};

export function calcularTotaisItensFolhaCalculada(folha: any) {
  const proventosSemComplemento = somaCampos(folha, CAMPOS_PROVENTOS_SEM_COMPLEMENTO) + eventosLivresPorTipo(folha, 'provento');
  const descontos = somaCampos(folha, CAMPOS_DESCONTOS) + eventosLivresPorTipo(folha, 'desconto');
  const beneficiosPositivos = calcularBeneficiosVTVA(folha) + somaCampos(folha, CAMPOS_BENEFICIOS) + eventosLivresPorTipo(folha, 'beneficio');
  const beneficiosNegativos = somaCampos(folha, CAMPOS_BENEFICIOS_NEGATIVOS);
  const beneficios = arredondarCentavos(beneficiosPositivos - beneficiosNegativos);
  const complemento = Math.max(0, arredondarCentavos(descontos - proventosSemComplemento));

  return {
    totalProventosSemComplemento: arredondarCentavos(proventosSemComplemento),
    complementoSalario: complemento,
    totalProventos: arredondarCentavos(proventosSemComplemento + complemento),
    totalDescontos: arredondarCentavos(descontos),
    totalBeneficios: arredondarCentavos(beneficios),
    salarioLiquido: arredondarCentavos(proventosSemComplemento + complemento - descontos + beneficios),
  };
}

export function normalizarFolhaCalculada<T extends Record<string, any>>(folha: T): T {
  const totais = calcularTotaisItensFolhaCalculada(folha);

  return {
    ...folha,
    complemento_salario: totais.complementoSalario,
    total_proventos: totais.totalProventos,
    total_descontos: totais.totalDescontos,
    total_beneficios: totais.totalBeneficios,
    salario_liquido: totais.salarioLiquido,
  };
}