// Cálculo de PLR conforme CCT 2025/2026 — Cláusula 18ª

import { supabase } from '../lib/supabase';

// Datas limite de pagamento por semestre (fixas na CCT 2025)
// Para anos futuros, usa o mesmo padrão de datas (31/ago e 30/mar do ano seguinte)
export const PLR_PRAZOS: Record<number, Record<number, { apuracao_inicio: string; apuracao_fim: string; limite_pagamento: string; limite_taxa: string }>> = {
    2025: {
        1: {
            apuracao_inicio: '2025-01-01',
            apuracao_fim: '2025-06-30',
            limite_pagamento: '2025-08-31',
            limite_taxa: '2025-09-15',
        },
        2: {
            apuracao_inicio: '2025-07-01',
            apuracao_fim: '2025-12-31',
            limite_pagamento: '2026-03-30',
            limite_taxa: '2026-04-15',
        },
    },
};

export interface PLRParametros {
    plr_base: number;
    plr_desconto_falta_justificada: number;
    plr_desconto_falta_injustificada: number;
    plr_desconto_advertencia: number;
    plr_desconto_suspensao: number;
    plr_dias_minimos_mes: number;
    plr_taxa_negociacao: number;
}

// Valores padrão da CCT — usados apenas se o banco não tiver os campos preenchidos
const PLR_DEFAULTS: Omit<PLRParametros, 'plr_base'> = {
    plr_desconto_falta_justificada: 0.20,
    plr_desconto_falta_injustificada: 0.25,
    plr_desconto_advertencia: 0.20,
    plr_desconto_suspensao: 0.25,
    plr_dias_minimos_mes: 15,
    plr_taxa_negociacao: 12.00,
};

/**
 * Busca os parâmetros PLR do banco para o ano informado.
 */
export async function buscarParametrosPLR(ano: number): Promise<PLRParametros | null> {
    const { data } = await supabase
        .from('parametros_calculo')
        .select('plr_base, plr_desconto_falta_justificada, plr_desconto_falta_injustificada, plr_desconto_advertencia, plr_desconto_suspensao, plr_dias_minimos_mes, plr_taxa_negociacao')
        .eq('ano_vigencia', ano)
        .maybeSingle();

    if (!data?.plr_base) return null;

    return {
        plr_base: Number(data.plr_base),
        plr_desconto_falta_justificada: data.plr_desconto_falta_justificada != null ? Number(data.plr_desconto_falta_justificada) : PLR_DEFAULTS.plr_desconto_falta_justificada,
        plr_desconto_falta_injustificada: data.plr_desconto_falta_injustificada != null ? Number(data.plr_desconto_falta_injustificada) : PLR_DEFAULTS.plr_desconto_falta_injustificada,
        plr_desconto_advertencia: data.plr_desconto_advertencia != null ? Number(data.plr_desconto_advertencia) : PLR_DEFAULTS.plr_desconto_advertencia,
        plr_desconto_suspensao: data.plr_desconto_suspensao != null ? Number(data.plr_desconto_suspensao) : PLR_DEFAULTS.plr_desconto_suspensao,
        plr_dias_minimos_mes: data.plr_dias_minimos_mes != null ? Number(data.plr_dias_minimos_mes) : PLR_DEFAULTS.plr_dias_minimos_mes,
        plr_taxa_negociacao: data.plr_taxa_negociacao != null ? Number(data.plr_taxa_negociacao) : PLR_DEFAULTS.plr_taxa_negociacao,
    };
}

/**
 * Retorna os prazos do período, gerando dinamicamente para anos não mapeados.
 */
export function getPrazos(ano: number, semestre: number) {
    if (PLR_PRAZOS[ano]?.[semestre]) return PLR_PRAZOS[ano][semestre];

    // Gera prazos padrão para anos futuros (mesmo padrão da CCT)
    if (semestre === 1) {
        return {
            apuracao_inicio: `${ano}-01-01`,
            apuracao_fim: `${ano}-06-30`,
            limite_pagamento: `${ano}-08-31`,
            limite_taxa: `${ano}-09-15`,
        };
    }
    return {
        apuracao_inicio: `${ano}-07-01`,
        apuracao_fim: `${ano}-12-31`,
        limite_pagamento: `${ano + 1}-03-30`,
        limite_taxa: `${ano + 1}-04-15`,
    };
}

export interface ResultadoPLR {
    funcionario_id: string;
    nome_completo: string;
    empresa?: string;
    posto?: string;
    ano: number;
    semestre: number;
    meses_trabalhados: number;
    faltas_justificadas: number;
    faltas_injustificadas: number;
    suspensoes: number;
    advertencias: number;
    valor_bruto: number;
    desconto_faltas_j: number;
    desconto_faltas_i: number;
    desconto_advertencias: number;
    desconto_suspensoes: number;
    desconto_total: number;
    valor_final: number;
}

/**
 * Calcula quantos meses do semestre o funcionário tem direito a PLR.
 *
 * Regras:
 * 1. Meses anteriores à admissão não contam.
 * 2. No mês de admissão: conta os dias corridos da admissão até o último dia
 *    do mês. Se < 15, o mês não conta.
 * Faltas (justificadas ou injustificadas) NÃO afetam a contagem de meses.
 */
function calcularMesesTrabalhados(
    _folhas: Array<{ mes: number; ano: number; dados_dias?: any }>,
    mesesSemestre: number[],
    diasMinimos: number,
    anoCalc: number,
    dataAdmissao?: string // formato 'YYYY-MM-DD'
): number {
    let meses = 0;

    // Data de admissão normalizada
    const admissao = dataAdmissao ? new Date(dataAdmissao + 'T12:00:00') : null;
    const anoAdmissao  = admissao ? admissao.getFullYear() : null;
    const mesAdmissao  = admissao ? admissao.getMonth() + 1 : null;
    const diaAdmissao  = admissao ? admissao.getDate() : null;

    for (const mes of mesesSemestre) {
        if (admissao && anoAdmissao !== null && mesAdmissao !== null && diaAdmissao !== null) {
            // Mês pertence a um ano anterior à admissão → não conta
            if (anoCalc < anoAdmissao) continue;

            // Mesmo ano: mês anterior à admissão → não conta
            if (anoCalc === anoAdmissao && mes < mesAdmissao) continue;

            // Mesmo ano e mesmo mês da admissão: verifica dias corridos
            if (anoCalc === anoAdmissao && mes === mesAdmissao) {
                const dm = new Date(anoCalc, mes, 0).getDate();
                const diasDesdeAdmissao = dm - diaAdmissao + 1;
                if (diasDesdeAdmissao < diasMinimos) continue;
            }
        }

        meses++;
    }

    return meses;
}

/**
 * Calcula o PLR de um funcionário para um semestre.
 */
export function calcularValorPLR(params: {
    valorParcela: number;
    mesesTrabalhados: number;
    faltasJustificadas: number;
    faltasInjustificadas: number;
    advertencias: number;
    suspensoes: number;
    descontoFaltaJust: number;
    descontoFaltaInj: number;
    descontoAdvert: number;
    descontoSuspensao: number;
}): {
    valor_bruto: number;
    desconto_faltas_j: number;
    desconto_faltas_i: number;
    desconto_advertencias: number;
    desconto_suspensoes: number;
    desconto_total: number;
    valor_final: number;
} {
    const { valorParcela, mesesTrabalhados, faltasJustificadas, faltasInjustificadas,
        advertencias, suspensoes, descontoFaltaJust, descontoFaltaInj, descontoAdvert, descontoSuspensao } = params;

    const valor_bruto = Number(((valorParcela * mesesTrabalhados) / 6).toFixed(2));

    // Descontos incidem sobre a parcela CHEIA (valorParcela), não sobre o proporcional
    const desconto_faltas_j = Number((valorParcela * descontoFaltaJust * faltasJustificadas).toFixed(2));
    const desconto_faltas_i = Number((valorParcela * descontoFaltaInj * faltasInjustificadas).toFixed(2));
    const desconto_advertencias = Number((valorParcela * descontoAdvert * advertencias).toFixed(2));
    const desconto_suspensoes = Number((valorParcela * descontoSuspensao * suspensoes).toFixed(2));

    const desconto_total = desconto_faltas_j + desconto_faltas_i + desconto_advertencias + desconto_suspensoes;
    const valor_final = Math.max(0, Number((valor_bruto - desconto_total).toFixed(2)));

    return { valor_bruto, desconto_faltas_j, desconto_faltas_i, desconto_advertencias, desconto_suspensoes, desconto_total, valor_final };
}

/**
 * Busca e calcula o PLR de todos os funcionários ativos para um semestre.
 */
export async function calcularPLRSemestre(ano: number, semestre: number, parametros: PLRParametros): Promise<ResultadoPLR[]> {
    const prazos = getPrazos(ano, semestre);
    void prazos; // usado na página, não aqui

    const mesInicio = semestre === 1 ? 1 : 7;
    const mesFim = semestre === 1 ? 6 : 12;
    const mesesSemestre = Array.from({ length: 6 }, (_, i) => mesInicio + i);
    const valorParcela = parametros.plr_base / 2;

    // 1. Buscar funcionários ativos
    const { data: funcionarios, error: errFunc } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, data_admissao, empresa:empresas(nome_empresa), posto_trabalho:postos_trabalho(nome_posto)')
        .eq('ativo', true)
        .eq('demitido', false)
        .order('nome_completo');

    if (errFunc) throw errFunc;
    if (!funcionarios?.length) return [];

    // 2. Buscar folhas de ponto do semestre
    const ids = funcionarios.map(f => f.id as string);
    const { data: folhas, error: errFolhas } = await supabase
        .from('folhas_ponto')
        .select('funcionario_id, mes, ano, dados_dias, total_faltas_justificadas, total_faltas_injustificadas, total_suspensoes')
        .in('funcionario_id', ids)
        .eq('ano', ano)
        .gte('mes', mesInicio)
        .lte('mes', mesFim);

    if (errFolhas) throw errFolhas;

    // 3. Buscar advertências e suspensões já salvas manualmente
    const { data: apuracoesExistentes } = await supabase
        .from('plr_apuracao')
        .select('funcionario_id, advertencias, suspensoes')
        .eq('ano', ano)
        .eq('semestre', semestre)
        .in('funcionario_id', ids);

    const advertenciasMap = new Map(
        (apuracoesExistentes || []).map(a => [a.funcionario_id, a.advertencias])
    );
    const suspensoesMap = new Map(
        (apuracoesExistentes || []).map(a => [a.funcionario_id, a.suspensoes])
    );

    // 4. Calcular por funcionário
    return (funcionarios as any[]).map(func => {
        const folhasFunc = (folhas || []).filter(f => f.funcionario_id === func.id);

        const mesesTrabalhados = calcularMesesTrabalhados(
            folhasFunc,
            mesesSemestre,
            parametros.plr_dias_minimos_mes,
            ano,
            func.data_admissao || undefined
        );

        const faltasJustificadas = folhasFunc.reduce((s, f) => s + (f.total_faltas_justificadas || 0), 0);
        const faltasInjustificadas = folhasFunc.reduce((s, f) => s + (f.total_faltas_injustificadas || 0), 0);
        const suspensoes = suspensoesMap.get(func.id) ?? folhasFunc.reduce((s, f) => s + (f.total_suspensoes || 0), 0);
        const advertencias = advertenciasMap.get(func.id) ?? 0;

        const calculo = calcularValorPLR({
            valorParcela,
            mesesTrabalhados,
            faltasJustificadas,
            faltasInjustificadas,
            advertencias,
            suspensoes,
            descontoFaltaJust: parametros.plr_desconto_falta_justificada,
            descontoFaltaInj: parametros.plr_desconto_falta_injustificada,
            descontoAdvert: parametros.plr_desconto_advertencia,
            descontoSuspensao: parametros.plr_desconto_suspensao,
        });

        return {
            funcionario_id: func.id,
            nome_completo: func.nome_completo,
            empresa: func.empresa?.nome_empresa,
            posto: func.posto_trabalho?.nome_posto,
            ano,
            semestre,
            meses_trabalhados: mesesTrabalhados,
            faltas_justificadas: faltasJustificadas,
            faltas_injustificadas: faltasInjustificadas,
            suspensoes,
            advertencias,
            ...calculo,
        };
    });
}
