/**
 * MÓDULO ISOLADO - CÁLCULOS DE TOTAIS
 * 
 * ⚠️ ATENÇÃO: Este arquivo contém lógica crítica de totalização.
 * NÃO MODIFICAR sem revisar todos os testes e validações.
 * 
 * Este módulo centraliza todos os cálculos de totais e garante consistência
 * entre os diferentes containers (Proventos, Descontos, Benefícios).
 */

import { ResultadoCalculoFolha } from './calcularFolhaPagamento';
import { calcularTotalProventos } from './calculosProventos';
import { calcularTotalDescontos } from './calculosDescontos';
import { calcularTotalBeneficios } from './calculosBeneficios';

export interface TotaisCalculados {
    totalProventos: number;
    totalDescontos: number;
    totalBeneficios: number;
    salarioLiquido: number;
    complementoSalario: number;
}

/**
 * Calcula todos os totais da folha de pagamento
 * 
 * REGRA CRÍTICA: Esta função usa os módulos isolados para evitar duplicação
 * e garante consistência entre todos os cálculos.
 * 
 * @param resultado - Resultado do cálculo da folha
 * @param parametros - Parâmetros para cálculo de benefícios
 * @returns Objeto com todos os totais calculados
 */
export function calcularTodosTotais(
    resultado: ResultadoCalculoFolha, 
    parametros?: any[],
    funcionario?: any
): TotaisCalculados {
    // Usar módulos isolados para cada tipo de cálculo
    const totalProventos = calcularTotalProventos(resultado);
    const totalDescontos = calcularTotalDescontos(resultado);
    const totalBeneficios = calcularTotalBeneficios(resultado, parametros, funcionario);
    
    // Salário líquido = proventos - descontos + benefícios
    const salarioLiquido = totalProventos - totalDescontos + totalBeneficios;
    
    // ⭐ CORREÇÃO: Calcular complemento apenas se salário líquido sem benefícios for negativo
    const salarioLiquidoSemBeneficios = totalProventos - totalDescontos;
    const complementoSalario = salarioLiquidoSemBeneficios < 0 ? Math.abs(salarioLiquidoSemBeneficios) : 0;
    
    return {
        totalProventos,
        totalDescontos,
        totalBeneficios,
        salarioLiquido,
        complementoSalario
    };
}

/**
 * Função de compatibilidade com o código existente
 * 
 * Esta função mantém a mesma assinatura da função original para evitar
 * quebrar o código existente, mas agora usa TANTO os campos específicos
 * quanto os eventos excepcionais do estado.
 */
export function calcularTotaisComEventos(
    funcionarioId: string,
    resultado: ResultadoCalculoFolha,
    eventos?: any[],
    parametros?: any[],
    funcionario?: any
): TotaisCalculados {
    // Se há eventos excepcionais, precisamos incluí-los no cálculo
    if (eventos && eventos.length > 0) {
        // Separar eventos por tipo
        const eventosProventos = eventos.filter(e => e.tipo === 'provento' && !e.descricao.includes('PLR')); // PLR agora é benefício
        const eventosDescontos = eventos.filter(e => e.tipo === 'desconto');
        const eventosBeneficios = eventos.filter(e => e.tipo === 'beneficio' || (e.tipo === 'provento' && e.descricao.includes('PLR'))); // Incluir PLR nos benefícios
        
        // Calcular totais base dos campos específicos (sem eventos excepcionais)
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
            // ⚠️ CORREÇÃO: NÃO incluir complemento_salario nos proventos base para evitar loop infinito
            // { nome: 'Complemento', valor: resultado.complemento_salario || 0 }
        ];
        
        const descontosBase = [
            { nome: 'INSS', valor: resultado.desconto_inss || 0 },
            { nome: 'IRRF', valor: resultado.desconto_irrf || 0 },
            { nome: 'VT', valor: resultado.desconto_vt || 0 },
            { nome: 'Seguro Vida', valor: resultado.desconto_seguro_vida || 0 },
            { nome: 'Convênio Odonto', valor: resultado.desconto_convenio_odonto || 0 },
            { nome: 'Contrib. Assistencial', valor: resultado.desconto_contribuicao_assistencial || 0 },
            { nome: 'Atrasos', valor: resultado.desconto_atrasos || 0 },
            { nome: 'Faltas', valor: resultado.desconto_faltas || 0 },
            { nome: 'DSR s/ Faltas', valor: (resultado as any).desconto_dsr_faltas || 0 },
            { nome: 'PLR', valor: resultado.desconto_plr || 0 },
            { nome: 'Pensão Alimentícia', valor: resultado.desconto_pensao_alimenticia || 0 },
            { nome: 'Rondas Não Realizadas', valor: resultado.desconto_rondas_nao_realizadas || 0 },
            { nome: 'Adiantamento Quinzenal', valor: resultado.desconto_adiantamento_quinzenal || 0 },
            { nome: 'Complemento Anterior', valor: resultado.desconto_complemento_anterior || 0 },
            { nome: 'Avaria Utilitário', valor: resultado.desc_avaria_utilitario || 0 },
            { nome: 'Adiantamento de Salário', valor: resultado.desconto_adiantamento_salario || 0 }
        ];
        
        // Calcular benefícios usando o módulo (com faixa de VT do funcionário)
        const totalBeneficios = calcularTotalBeneficios(resultado, parametros, funcionario);
        
        // Somar valores base
        const totalProventosBase = proventosBase.reduce((sum, item) => sum + item.valor, 0);
        const totalDescontosBase = descontosBase.reduce((sum, item) => sum + item.valor, 0);
        
        // Adicionar eventos excepcionais aos totais (filtrando duplicações)
        const totalEventosProventos = eventosProventos.reduce((sum, e) => sum + e.valor, 0);
        const totalEventosDescontos = eventosDescontos
            .filter(e => {
                // Filtrar "Adiantam. de Salário" se já existe no campo específico para evitar duplicação
                if (e.descricao === 'Adiantam. de Salário' && resultado.desconto_adiantamento_salario > 0) {
                    return false;
                }
                return true;
            })
            .reduce((sum, e) => sum + e.valor, 0);
        const totalEventosBeneficios = eventosBeneficios
            .filter(e => {
                // Filtrar "Desc. Ajuste dos Benefícios" se já existe no campo específico para evitar duplicação
                if (e.descricao === 'Desc. Ajuste dos Benefícios' && Math.abs((resultado as any).desc_ajuste_beneficios || 0) > 0) {
                    return false;
                }
                // Filtrar "Reembolsos" se já existe no campo específico para evitar duplicação
                if (e.descricao === 'Reembolsos' && Math.abs(resultado.reembolsos_uber || 0) > 0) {
                    return false;
                }
                return true;
            })
            .reduce((sum, e) => sum + e.valor, 0);
        
        // Totais finais
        const totalProventos = totalProventosBase + totalEventosProventos;
        const totalDescontos = totalDescontosBase + totalEventosDescontos;
        const totalBeneficiosFinal = totalBeneficios + totalEventosBeneficios;
        

        
        // Salário líquido = proventos - descontos + benefícios
        const salarioLiquido = totalProventos - totalDescontos + totalBeneficiosFinal;
        
        // ⭐ CORREÇÃO: Calcular complemento apenas se salário líquido sem benefícios for negativo
        const salarioLiquidoSemBeneficios = totalProventos - totalDescontos;
        const complementoSalario = salarioLiquidoSemBeneficios < 0 ? Math.abs(salarioLiquidoSemBeneficios) : 0;
        
        return {
            totalProventos,
            totalDescontos,
            totalBeneficios: totalBeneficiosFinal,
            salarioLiquido,
            complementoSalario
        };
    }
    
    // Se não há eventos, usar apenas os módulos isolados
    return calcularTodosTotais(resultado, parametros, funcionario);
}