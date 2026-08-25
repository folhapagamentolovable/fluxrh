/**
 * MÓDULO ISOLADO - CÁLCULOS DE DESCONTOS
 * 
 * ⚠️ ATENÇÃO: Este arquivo contém lógica crítica de cálculo de descontos.
 * NÃO MODIFICAR sem revisar todos os testes e validações.
 * 
 * Responsabilidades:
 * - Calcular total de descontos sem duplicação
 * - Gerenciar eventos excepcionais de descontos
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
 * Calcula o total de descontos incluindo campos específicos de eventos excepcionais
 * 
 * REGRA CRÍTICA: Eventos excepcionais são processados e salvos em campos específicos
 * do resultado. NÃO somar eventos novamente para evitar duplicação.
 * 
 * @param resultado - Resultado do cálculo da folha (já inclui eventos processados)
 * @returns Total de descontos sem duplicação
 */
export function calcularTotalDescontos(resultado: ResultadoCalculoFolha): number {
    const descontosBase = [
        { nome: 'INSS', valor: resultado.desconto_inss || 0 },
        { nome: 'IRRF', valor: resultado.desconto_irrf || 0 },
        { nome: 'VT', valor: resultado.desconto_vt || 0 },
        { nome: 'Seguro Vida', valor: resultado.desconto_seguro_vida || 0 },
        { nome: 'Convênio Odonto', valor: resultado.desconto_convenio_odonto || 0 },
        { nome: 'Contrib. Assistencial', valor: resultado.desconto_contribuicao_assistencial || 0 },
        { nome: 'Atrasos', valor: resultado.desconto_atrasos || 0 },
        { nome: 'Faltas', valor: resultado.desconto_faltas || 0 },
        { nome: 'DSR s/ Faltas', valor: resultado.desconto_dsr_faltas || 0 }, // NOVO: DSR Limpeza/Zeladoria
        { nome: 'PLR', valor: resultado.desconto_plr || 0 },
        { nome: 'Pensão Alimentícia', valor: resultado.desconto_pensao_alimenticia || 0 },
        { nome: 'Rondas Não Realizadas', valor: resultado.desconto_rondas_nao_realizadas || 0 },
        { nome: 'Adiantamento Quinzenal', valor: resultado.desconto_adiantamento_quinzenal || 0 },
        { nome: 'Complemento Anterior', valor: resultado.desconto_complemento_anterior || 0 },
        { nome: 'Avaria Utilitário', valor: resultado.desc_avaria_utilitario || 0 }
    ];

    // Eventos excepcionais já processados e salvos em campos específicos
    const eventosEspecificos = [
        { nome: 'INSS 13º', valor: resultado.inss_13 || 0 },
        { nome: 'Adiantam. 13º Salário', valor: resultado.adiantamento_13_salario || 0 },
        { nome: 'Adiantam. Vantagens 13º', valor: resultado.adiantamento_vantagens_13 || 0 },
        { nome: 'Adiantam. de Salário', valor: resultado.desconto_adiantamento_salario || 0 }
    ];

    const totalBase = descontosBase.reduce((sum, item) => sum + item.valor, 0);
    const totalEventos = eventosEspecificos.reduce((sum, item) => sum + item.valor, 0);

    return totalBase + totalEventos;
}

/**
 * Lista todos os descontos para exibição na interface
 * 
 * @param resultado - Resultado do cálculo da folha
 * @returns Array com todos os descontos para exibição
 */
export function listarDescontosParaExibicao(resultado: ResultadoCalculoFolha) {
    const itens = [];

    // Descontos base
    if (resultado.desconto_inss > 0) itens.push({ nome: 'INSS', valor: resultado.desconto_inss });
    if (resultado.desconto_irrf > 0) itens.push({ nome: 'IRRF', valor: resultado.desconto_irrf });
    if (resultado.desconto_vt > 0) itens.push({ nome: 'Vale Transporte', valor: resultado.desconto_vt });
    if (resultado.desconto_seguro_vida > 0) itens.push({ nome: 'Seguro de Vida em Grupo', valor: resultado.desconto_seguro_vida });
    if (resultado.desconto_convenio_odonto > 0) itens.push({ nome: 'Convênio Odontológico', valor: resultado.desconto_convenio_odonto });
    if (resultado.desconto_contribuicao_assistencial > 0) itens.push({ nome: 'Contribuição Assistencial', valor: resultado.desconto_contribuicao_assistencial });
    if (resultado.desconto_atrasos > 0) itens.push({ nome: 'Atrasos', valor: resultado.desconto_atrasos });
    if (resultado.desconto_faltas > 0) itens.push({ nome: 'Faltas', valor: resultado.desconto_faltas });
    if (resultado.desconto_dsr_faltas > 0) itens.push({ nome: 'DSR s/ Faltas', valor: resultado.desconto_dsr_faltas }); // NOVO
    if (resultado.desconto_plr > 0) itens.push({ nome: 'PLR', valor: resultado.desconto_plr });
    if (resultado.desconto_pensao_alimenticia > 0) itens.push({ nome: 'Pensão Alimentícia', valor: resultado.desconto_pensao_alimenticia });
    if (resultado.desconto_rondas_nao_realizadas > 0) itens.push({ nome: 'Rondas Não Realizadas', valor: resultado.desconto_rondas_nao_realizadas });
    if (resultado.desconto_adiantamento_quinzenal > 0) itens.push({ nome: 'Adiantamento Quinzenal', valor: resultado.desconto_adiantamento_quinzenal });
    if (resultado.desconto_complemento_anterior > 0) itens.push({ nome: 'Complemento Anterior', valor: resultado.desconto_complemento_anterior });
    if (resultado.desc_avaria_utilitario > 0) itens.push({ nome: 'Desc. Avaria Utilitário', valor: resultado.desc_avaria_utilitario });

    // Eventos excepcionais de descontos (campos específicos)
    if ((resultado.inss_13 || 0) > 0) itens.push({ nome: 'INSS 13º', valor: resultado.inss_13 || 0 });
    if ((resultado.adiantamento_13_salario || 0) > 0) itens.push({ nome: 'Adiantam. 13º Salário', valor: resultado.adiantamento_13_salario || 0 });
    if ((resultado.adiantamento_vantagens_13 || 0) > 0) itens.push({ nome: 'Adiantam. Vantagens 13º', valor: resultado.adiantamento_vantagens_13 || 0 });
    if ((resultado.desconto_adiantamento_salario || 0) > 0) itens.push({ nome: 'Adiantam. de Salário', valor: resultado.desconto_adiantamento_salario || 0 });

    return itens;
}