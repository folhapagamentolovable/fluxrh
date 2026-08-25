/**
 * MÓDULO ISOLADO - CÁLCULOS DE PROVENTOS
 * 
 * ⚠️ ATENÇÃO: Este arquivo contém lógica crítica de cálculo de proventos.
 * NÃO MODIFICAR sem revisar todos os testes e validações.
 * 
 * Responsabilidades:
 * - Calcular total de proventos sem duplicação
 * - Gerenciar eventos excepcionais de proventos
 * - Manter consistência entre campos base e eventos
 */

import { ResultadoCalculoFolha } from './calcularFolhaPagamento';

export interface EventoExcepcional {
  id?: string;
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto' | 'beneficio';
}

/**
 * Calcula o total de proventos incluindo campos específicos de eventos excepcionais
 * 
 * REGRA CRÍTICA: Eventos excepcionais são processados e salvos em campos específicos
 * do resultado. NÃO somar eventos novamente para evitar duplicação.
 * 
 * @param resultado - Resultado do cálculo da folha (já inclui eventos processados)
 * @returns Total de proventos sem duplicação
 */
export function calcularTotalProventos(resultado: ResultadoCalculoFolha): number {
    const proventosBase = [
        { nome: 'Salário Base', valor: resultado.salario_base || 0 },
        { nome: 'HE 50%', valor: resultado.horas_extras_50 || 0 },
        { nome: 'HE 100%', valor: resultado.horas_extras_100 || 0 },
        { nome: 'Adicional Noturno', valor: resultado.adicional_noturno || 0 },
        { nome: 'Intrajornada 50%', valor: resultado.intrajornada_50 || 0 },
        { nome: 'Intrajornada 100%', valor: resultado.intrajornada_100 || 0 },
        { nome: 'DSR H.Extras', valor: resultado.dsr_horas_extras || 0 },
        { nome: 'DSR Adic.Noturno', valor: resultado.dsr_adicional_noturno || 0 },
        { nome: 'Insalubridade', valor: resultado.adicional_insalubridade || 0 },
        { nome: 'Acúmulo Função', valor: resultado.adicional_acumulo_funcao || 0 },
        { nome: 'Salário Família', valor: resultado.salario_familia || 0 }
        // ⚠️ REMOVIDO: PLR é BENEFÍCIO, não provento (movido para calculosBeneficios.ts)
        // { nome: 'PLR', valor: resultado.plr || 0 }
        // ⚠️ CORREÇÃO: NÃO incluir complemento_salario nos proventos para evitar duplicação
        // { nome: 'Complemento', valor: resultado.complemento_salario || 0 }
    ];

    // Eventos excepcionais já processados e salvos em campos específicos
    const eventosEspecificos = [
        { nome: '13º Salário 1ª Parcela', valor: resultado.decimo_terceiro_primeira_parcela || 0 },
        { nome: '13º Salário 2ª Parcela', valor: resultado.decimo_terceiro_segunda_parcela || 0 },
        { nome: '13º Salário Vantagens 1ª Parcela', valor: resultado.decimo_terceiro_vantagens_primeira_parcela || 0 },
        { nome: '13º Salário Vantagens 2ª Parcela', valor: resultado.decimo_terceiro_vantagens_segunda_parcela || 0 },
        { nome: '13º Salário Integral', valor: resultado.decimo_terceiro_integral || 0 },
        { nome: 'Vantagens 13º', valor: resultado.vantagens_13 || 0 },
        { nome: 'Serviços Externos (Folhas)', valor: resultado.servicos_externos_folhas_pagamento || 0 },
        { nome: 'Serviços Externos (Rondas)', valor: resultado.servicos_externos_controle_rondas || 0 },
        // ⚠️ REMOVIDO: Folga Trabalhada (FT) é BENEFÍCIO, não provento (movido para calculosBeneficios.ts)
        // { nome: 'Folga Trabalhada', valor: resultado.folga_trabalhada || 0 },
        // ⚠️ REMOVIDO: Reembolsos é BENEFÍCIO, não provento
        // { nome: 'Reembolsos', valor: resultado.reembolsos_uber || 0 },
        { nome: 'Supervisão (Palmeiras)', valor: resultado.supervisao_palmeiras || 0 }
    ];

    const totalBase = proventosBase.reduce((sum, item) => sum + item.valor, 0);
    const totalEventos = eventosEspecificos.reduce((sum, item) => sum + item.valor, 0);

    return totalBase + totalEventos;
}

/**
 * Lista todos os proventos para exibição na interface
 * 
 * @param resultado - Resultado do cálculo da folha
 * @returns Array com todos os proventos para exibição
 */
export function listarProventosParaExibicao(resultado: ResultadoCalculoFolha) {
    const itens = [];

    // Proventos base
    if (resultado.salario_base > 0) itens.push({ nome: 'Salário', valor: resultado.salario_base });
    if (resultado.horas_extras_50 > 0) itens.push({ nome: 'Hora Extra 50%', valor: resultado.horas_extras_50 });
    if (resultado.horas_extras_100 > 0) itens.push({ nome: 'Hora Extra 100%', valor: resultado.horas_extras_100 });
    if (resultado.adicional_noturno > 0) itens.push({ nome: 'Adicional Noturno', valor: resultado.adicional_noturno });
    if (resultado.intrajornada_50 > 0) itens.push({ nome: 'Intrajornada 50%', valor: resultado.intrajornada_50 });
    if (resultado.intrajornada_100 > 0) itens.push({ nome: 'Intrajornada 100%', valor: resultado.intrajornada_100 });
    if (resultado.dsr_horas_extras > 0) itens.push({ nome: 'D.S.R. s/ H. Extras', valor: resultado.dsr_horas_extras });
    if (resultado.dsr_adicional_noturno > 0) itens.push({ nome: 'D.S.R. s/ Adicional Noturno', valor: resultado.dsr_adicional_noturno });
    if (resultado.adicional_insalubridade > 0) itens.push({ nome: 'Adicional Insalubridade', valor: resultado.adicional_insalubridade });
    if (resultado.adicional_acumulo_funcao > 0) itens.push({ nome: 'Acúmulo de Função', valor: resultado.adicional_acumulo_funcao });
    if (resultado.salario_familia > 0) itens.push({ nome: 'Salário-Família', valor: resultado.salario_familia });
    // ⚠️ REMOVIDO: PLR é BENEFÍCIO, não provento
    // if (resultado.plr > 0) itens.push({ nome: 'Parcela PLR', valor: resultado.plr });

    // Eventos excepcionais (campos específicos)
    if ((resultado.decimo_terceiro_primeira_parcela || 0) > 0) itens.push({ nome: '13º Salário 1ª Parcela', valor: resultado.decimo_terceiro_primeira_parcela || 0 });
    if ((resultado.decimo_terceiro_segunda_parcela || 0) > 0) itens.push({ nome: '13º Salário 2ª Parcela', valor: resultado.decimo_terceiro_segunda_parcela || 0 });
    if ((resultado.decimo_terceiro_vantagens_primeira_parcela || 0) > 0) itens.push({ nome: '13º Salário Vantagens 1ª Parcela', valor: resultado.decimo_terceiro_vantagens_primeira_parcela || 0 });
    if ((resultado.decimo_terceiro_vantagens_segunda_parcela || 0) > 0) itens.push({ nome: '13º Salário Vantagens 2ª Parcela', valor: resultado.decimo_terceiro_vantagens_segunda_parcela || 0 });
    if ((resultado.decimo_terceiro_integral || 0) > 0) itens.push({ nome: '13º Salário Integral', valor: resultado.decimo_terceiro_integral || 0 });
    if ((resultado.vantagens_13 || 0) > 0) itens.push({ nome: 'Vantagens 13º', valor: resultado.vantagens_13 || 0 });
    if ((resultado.servicos_externos_folhas_pagamento || 0) > 0) itens.push({ nome: 'Serviços Externos (Folhas de Pagamento)', valor: resultado.servicos_externos_folhas_pagamento || 0 });
    if ((resultado.servicos_externos_controle_rondas || 0) > 0) itens.push({ nome: 'Serviços Externos (Controle de Rondas)', valor: resultado.servicos_externos_controle_rondas || 0 });
    // ⚠️ REMOVIDO: Folga Trabalhada (FT) é BENEFÍCIO, não provento (exibido em calculosBeneficios.ts)
    // if ((resultado.folga_trabalhada || 0) > 0) itens.push({ nome: 'FT (Folga Trabalhada)', valor: resultado.folga_trabalhada || 0 });
    // ⚠️ REMOVIDO: Reembolsos é BENEFÍCIO, não provento
    // if ((resultado.reembolsos_uber || 0) > 0) itens.push({ nome: 'Reembolsos', valor: resultado.reembolsos_uber || 0 });
    if ((resultado.supervisao_palmeiras || 0) > 0) itens.push({ nome: 'Supervisão (Palmeiras)', valor: resultado.supervisao_palmeiras || 0 });

    return itens;
}