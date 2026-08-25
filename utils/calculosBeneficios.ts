/**
 * MÓDULO ISOLADO - CÁLCULOS DE BENEFÍCIOS
 * 
 * ⚠️ ATENÇÃO: Este arquivo contém lógica crítica de cálculo de benefícios.
 * NÃO MODIFICAR sem revisar todos os testes e validações.
 * 
 * Responsabilidades:
 * - Calcular total de benefícios sem duplicação
 * - Gerenciar eventos excepcionais de benefícios
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
 * Calcula o total de benefícios incluindo campos específicos de eventos excepcionais
 * 
 * REGRA CRÍTICA: Eventos excepcionais são processados e salvos em campos específicos
 * do resultado. NÃO somar eventos novamente para evitar duplicação.
 * 
 * @param resultado - Resultado do cálculo da folha
 * @param parametros - Parâmetros para cálculo de VT/VA por folgas trabalhadas
 * @returns Total de benefícios sem duplicação
 */
export function calcularTotalBeneficios(resultado: ResultadoCalculoFolha, parametros?: any[], funcionario?: any): number {
    // Valores de VT/VA por dia (considerar faixa do funcionário)
    const vtDia = funcionario?.faixa_vt === 2 
        ? (parametros?.[0]?.vale_transporte_faixa2 || parametros?.[0]?.vale_transporte || 0)
        : (parametros?.[0]?.vale_transporte || 0);
    const vaDia = parametros?.[0]?.vale_alimentacao || 0;
    
    // Valores de VA/VT por folgas trabalhadas (VT = ida e volta, por isso * 2)
    const vtFolgasTrabalhadas = (resultado.folgas_trabalhadas_vt || 0) * vtDia * 2;
    const vaFolgasTrabalhadas = (resultado.folgas_trabalhadas_va || 0) * vaDia;

    // CORREÇÃO: Usar campos específicos por mês com fallback para campos totais
    // Prioridade: vale_*_mes_anterior + vale_*_mes_atual, senão vale_* total
    const temSeparacaoVT = resultado.vale_transporte_mes_anterior || resultado.vale_transporte_mes_atual;
    const temSeparacaoVA = resultado.vale_alimentacao_mes_anterior || resultado.vale_alimentacao_mes_atual;
    const descAjusteBeneficios = Math.abs((resultado as any).desc_ajuste_beneficios || 0);

    const beneficiosBase = [
        { nome: 'VT Mês Anterior', valor: resultado.vale_transporte_mes_anterior || 0 },
        { nome: 'VA Mês Anterior', valor: resultado.vale_alimentacao_mes_anterior || 0 },
        { nome: 'VT Mês Atual', valor: temSeparacaoVT ? (resultado.vale_transporte_mes_atual || 0) : (resultado.vale_transporte || 0) },
        { nome: 'VA Mês Atual', valor: temSeparacaoVA ? (resultado.vale_alimentacao_mes_atual || 0) : (resultado.vale_alimentacao || 0) },
        { nome: 'VT Folgas Trabalhadas', valor: vtFolgasTrabalhadas },
        { nome: 'VA Folgas Trabalhadas', valor: vaFolgasTrabalhadas },
        { nome: 'Cesta Básica', valor: resultado.cesta_basica || 0 },
        { nome: 'PLR', valor: resultado.plr || 0 },
        { nome: 'Prêmio Permanência', valor: resultado.premio_permanencia || 0 },
        { nome: 'Reembolsos', valor: resultado.reembolsos_uber || 0 },
        { nome: 'Folga(s) Trabalhada(s)', valor: resultado.folga_trabalhada || 0 }, // ⭐ NOVO: FT como benefício
        { nome: 'Desconto VT Faltas', valor: -(resultado.desconto_vt_faltas || 0) },
        { nome: 'Desconto VA Faltas', valor: -(resultado.desconto_va_faltas || 0) },
        { nome: 'Desc. Ajuste dos Benefícios', valor: -descAjusteBeneficios }
    ];

    // Eventos excepcionais de benefícios são raros e geralmente processados separadamente
    // Por enquanto, não há campos específicos para eventos de benefícios no resultado

    const totalBase = beneficiosBase.reduce((sum, item) => sum + item.valor, 0);

    return totalBase;
}

/**
 * Lista todos os benefícios para exibição na interface
 * 
 * @param resultado - Resultado do cálculo da folha
 * @param parametros - Parâmetros para cálculo de VT/VA
 * @returns Array com todos os benefícios para exibição
 */
export function listarBeneficiosParaExibicao(resultado: ResultadoCalculoFolha, parametros?: any[], funcionario?: any) {
    const itens = [];

    // Valores de VT/VA por dia (considerar faixa do funcionário)
    const vtDia = funcionario?.faixa_vt === 2 
        ? (parametros?.[0]?.vale_transporte_faixa2 || parametros?.[0]?.vale_transporte || 0)
        : (parametros?.[0]?.vale_transporte || 0);
    const vaDia = parametros?.[0]?.vale_alimentacao || 0;
    
    // Valores de VA/VT por folgas trabalhadas
    const vtFolgasTrabalhadas = (resultado.folgas_trabalhadas_vt || 0) * vtDia * 2;
    const vaFolgasTrabalhadas = (resultado.folgas_trabalhadas_va || 0) * vaDia;

    // CORREÇÃO: Usar campos específicos por mês com fallback para campos totais
    const temSeparacaoVT = resultado.vale_transporte_mes_anterior || resultado.vale_transporte_mes_atual;
    const temSeparacaoVA = resultado.vale_alimentacao_mes_anterior || resultado.vale_alimentacao_mes_atual;
    const descAjusteBeneficios = Math.abs((resultado as any).desc_ajuste_beneficios || 0);

    // Benefícios base - sem duplicação
    if (resultado.vale_transporte_mes_anterior > 0) itens.push({ nome: 'VT Mês Anterior', valor: resultado.vale_transporte_mes_anterior });
    if (resultado.vale_alimentacao_mes_anterior > 0) itens.push({ nome: 'VA Mês Anterior', valor: resultado.vale_alimentacao_mes_anterior });
    // Usar campos específicos ou fallback para totais (mas não ambos)
    if (temSeparacaoVT) {
        if (resultado.vale_transporte_mes_atual > 0) itens.push({ nome: 'VT Mês Atual', valor: resultado.vale_transporte_mes_atual });
    } else if (resultado.vale_transporte > 0) {
        itens.push({ nome: 'Vale Transporte', valor: resultado.vale_transporte });
    }
    if (temSeparacaoVA) {
        if (resultado.vale_alimentacao_mes_atual > 0) itens.push({ nome: 'VA Mês Atual', valor: resultado.vale_alimentacao_mes_atual });
    } else if (resultado.vale_alimentacao > 0) {
        itens.push({ nome: 'Vale Alimentação', valor: resultado.vale_alimentacao });
    }
    if (vtFolgasTrabalhadas > 0) itens.push({ nome: 'VT Folgas Trabalhadas', valor: vtFolgasTrabalhadas });
    if (vaFolgasTrabalhadas > 0) itens.push({ nome: 'VA Folgas Trabalhadas', valor: vaFolgasTrabalhadas });
    if (resultado.cesta_basica > 0) itens.push({ nome: 'Cesta Básica', valor: resultado.cesta_basica });
    if (resultado.plr > 0) itens.push({ nome: 'PLR', valor: resultado.plr });
    if (resultado.premio_permanencia > 0) itens.push({ nome: 'Prêmio Permanência', valor: resultado.premio_permanencia });
    if ((resultado.reembolsos_uber || 0) > 0) itens.push({ nome: 'Reembolsos', valor: resultado.reembolsos_uber || 0 });
    if ((resultado.folga_trabalhada || 0) > 0) itens.push({ nome: 'Folga(s) Trabalhada(s)', valor: resultado.folga_trabalhada || 0 }); // ⭐ NOVO: FT como benefício
    if (resultado.desconto_vt_faltas > 0) itens.push({ nome: 'Desconto VT Faltas', valor: -resultado.desconto_vt_faltas });
    if (resultado.desconto_va_faltas > 0) itens.push({ nome: 'Desconto VA Faltas', valor: -resultado.desconto_va_faltas });
    if (descAjusteBeneficios > 0) itens.push({ nome: 'Desc. Ajuste dos Benefícios', valor: -descAjusteBeneficios });

    return itens;
}