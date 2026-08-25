/**
 * MÓDULO ISOLADO - PROCESSAMENTO DE EVENTOS EXCEPCIONAIS
 * 
 * ⚠️ ATENÇÃO: Este arquivo contém lógica crítica de processamento de eventos excepcionais.
 * NÃO MODIFICAR sem revisar todos os testes e validações.
 * 
 * Responsabilidades:
 * - Processar eventos excepcionais e mapear para campos específicos
 * - Garantir que eventos não sejam duplicados
 * - Manter consistência entre interface e cálculos
 */

import { ResultadoCalculoFolha } from './calcularFolhaPagamento';

export interface EventoExcepcional {
  id?: string;
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto' | 'beneficio';
}

export interface EventosProcessados {
  // Proventos - 13º Salário
  evento13Primeira: number;
  evento13VantagensPrimeira: number;
  evento13Segunda: number;
  evento13VantagensSegunda: number;
  evento13Integral: number;
  eventoVantagens13: number;
  
  // Proventos - Serviços Externos
  eventoServicosExternosFolhas: number;
  eventoServicosExternosRondas: number;
  
  // Proventos - Outros
  eventoFolgaTrabalhada: number;
  eventoReembolsosUber: number;
  eventoSupervisaoPalmeiras: number;
  
  // Proventos - Rescisão
  eventoRescisao13: number;
  eventoRescisaoFerias: number;
  eventoRescisao13Ferias: number;
  eventoRescisaoPLR: number;
  eventoRescisao13Vantagens: number;
  
  // Descontos - 13º Salário
  eventoInss13: number;
  eventoAdiantamento13Salario: number;
  eventoAdiantamentoVantagens13: number;
  
  // Eventos normais (não mapeados para campos específicos)
  eventosNormais: EventoExcepcional[];
}

/**
 * Processa eventos excepcionais e os mapeia para campos específicos
 * 
 * Esta função centraliza todo o processamento de eventos excepcionais,
 * garantindo que cada evento seja mapeado corretamente para seu campo específico.
 * 
 * @param eventos - Array de eventos excepcionais
 * @returns Objeto com eventos processados e mapeados
 */
export function processarEventosExcepcionais(eventos: EventoExcepcional[]): EventosProcessados {
    // Inicializar todos os valores
    const processados: EventosProcessados = {
        // Proventos - 13º Salário
        evento13Primeira: 0,
        evento13VantagensPrimeira: 0,
        evento13Segunda: 0,
        evento13VantagensSegunda: 0,
        evento13Integral: 0,
        eventoVantagens13: 0,
        
        // Proventos - Serviços Externos
        eventoServicosExternosFolhas: 0,
        eventoServicosExternosRondas: 0,
        
        // Proventos - Outros
        eventoFolgaTrabalhada: 0,
        eventoReembolsosUber: 0,
        eventoSupervisaoPalmeiras: 0,
        
        // Proventos - Rescisão
        eventoRescisao13: 0,
        eventoRescisaoFerias: 0,
        eventoRescisao13Ferias: 0,
        eventoRescisaoPLR: 0,
        eventoRescisao13Vantagens: 0,
        
        // Descontos - 13º Salário
        eventoInss13: 0,
        eventoAdiantamento13Salario: 0,
        eventoAdiantamentoVantagens13: 0,
        
        // Eventos normais
        eventosNormais: []
    };

    // Processar cada evento
    eventos.forEach(evento => {
        if (evento.tipo === 'provento') {
            // PROVENTOS - 13º Salário
            if (evento.descricao === '13º Proporc. Rescisão') {
                processados.eventoRescisao13 += evento.valor;
            } else if (evento.descricao === '13º Proporc. Vantagens Rescisão') {
                processados.eventoRescisao13Vantagens += evento.valor;
            } else if (evento.descricao === '13º Salário 1ª Parcela') {
                processados.evento13Primeira += evento.valor;
            } else if (evento.descricao === '13º Salário Vantagens 1ª Parcela') {
                processados.evento13VantagensPrimeira += evento.valor;
            } else if (evento.descricao === '13º Salário 2ª Parcela') {
                processados.evento13Segunda += evento.valor;
            } else if (evento.descricao === '13º Salário Vantagens 2ª Parcela') {
                processados.evento13VantagensSegunda += evento.valor;
            } else if (evento.descricao === '13º Salário Integral') {
                processados.evento13Integral += evento.valor;
            } else if (evento.descricao === 'Vantagens 13º') {
                processados.eventoVantagens13 += evento.valor;
            }
            // PROVENTOS - Serviços Externos
            else if (evento.descricao === 'Serviços Externos (Folhas de Pagamento)') {
                processados.eventoServicosExternosFolhas += evento.valor;
            } else if (evento.descricao === 'Serviços Externos (Controle de Rondas)') {
                processados.eventoServicosExternosRondas += evento.valor;
            }
            // PROVENTOS - Outros
            else if (evento.descricao === 'FT (Folga Trabalhada)') {
                processados.eventoFolgaTrabalhada += evento.valor;
            } else if (evento.descricao === 'Reembolsos' || evento.descricao === 'Reembolsos Uber' || evento.descricao === 'Reembolsos (Uber)') {
                processados.eventoReembolsosUber += evento.valor;
            } else if (evento.descricao === 'Supervisão (Palmeiras)') {
                processados.eventoSupervisaoPalmeiras += evento.valor;
            }
            // PROVENTOS - Rescisão
            else if (evento.descricao === 'Férias Proporc. Rescisão') {
                processados.eventoRescisaoFerias += evento.valor;
            } else if (evento.descricao === '1/3 Férias proporc. Rescisão') {
                processados.eventoRescisao13Ferias += evento.valor;
            } else if (evento.descricao === 'PLR Proporc. Rescisão') {
                processados.eventoRescisaoPLR += evento.valor;
            }
            // Outros proventos (não mapeados)
            else {
                processados.eventosNormais.push(evento);
            }
        } else if (evento.tipo === 'desconto') {
            // DESCONTOS - 13º Salário
            if (evento.descricao === 'INSS 13º') {
                processados.eventoInss13 += evento.valor;
            } else if (evento.descricao === 'Adiantam. 13º Salário') {
                processados.eventoAdiantamento13Salario += evento.valor;
            } else if (evento.descricao === 'Adiantam. Vantagens 13º') {
                processados.eventoAdiantamentoVantagens13 += evento.valor;
            }
            // Outros descontos (não mapeados)
            else {
                processados.eventosNormais.push(evento);
            }
        } else {
            // Benefícios e outros tipos
            processados.eventosNormais.push(evento);
        }
    });

    return processados;
}

/**
 * Aplica eventos processados ao resultado da folha
 * 
 * Esta função pega os eventos processados e os aplica aos campos específicos
 * do resultado da folha de pagamento.
 * 
 * @param resultado - Resultado base da folha
 * @param eventosProcessados - Eventos já processados e mapeados
 * @returns Resultado atualizado com eventos aplicados
 */
export function aplicarEventosAoResultado(
    resultado: ResultadoCalculoFolha, 
    eventosProcessados: EventosProcessados
): ResultadoCalculoFolha {
    return {
        ...resultado,
        
        // Aplicar proventos - 13º Salário
        decimo_terceiro_primeira_parcela: eventosProcessados.evento13Primeira,
        decimo_terceiro_vantagens_primeira_parcela: eventosProcessados.evento13VantagensPrimeira,
        decimo_terceiro_segunda_parcela: eventosProcessados.evento13Segunda,
        decimo_terceiro_vantagens_segunda_parcela: eventosProcessados.evento13VantagensSegunda,
        decimo_terceiro_integral: eventosProcessados.evento13Integral,
        vantagens_13: eventosProcessados.eventoVantagens13,
        
        // Aplicar proventos - Serviços Externos
        servicos_externos_folhas_pagamento: eventosProcessados.eventoServicosExternosFolhas,
        servicos_externos_controle_rondas: eventosProcessados.eventoServicosExternosRondas,
        
        // Aplicar proventos - Outros
        folga_trabalhada: eventosProcessados.eventoFolgaTrabalhada,
        reembolsos_uber: eventosProcessados.eventoReembolsosUber,
        supervisao_palmeiras: eventosProcessados.eventoSupervisaoPalmeiras,
        
        // Aplicar proventos - Rescisão
        decimo_terceiro_proporcional_rescisao: eventosProcessados.eventoRescisao13,
        ferias_proporcionais_rescisao: eventosProcessados.eventoRescisaoFerias,
        um_terco_ferias_proporcional_rescisao: eventosProcessados.eventoRescisao13Ferias,
        plr_proporcional_rescisao: eventosProcessados.eventoRescisaoPLR,
        decimo_terceiro_vantagens_rescisao: eventosProcessados.eventoRescisao13Vantagens,
        
        // Aplicar descontos - 13º Salário
        inss_13: eventosProcessados.eventoInss13,
        adiantamento_13_salario: eventosProcessados.eventoAdiantamento13Salario,
        adiantamento_vantagens_13: eventosProcessados.eventoAdiantamentoVantagens13
    };
}

/**
 * Função principal que processa eventos e aplica ao resultado
 * 
 * Esta é a função principal que deve ser usada para processar eventos excepcionais.
 * Ela combina o processamento e a aplicação em uma única chamada.
 * 
 * @param resultado - Resultado base da folha
 * @param eventos - Array de eventos excepcionais
 * @returns Resultado atualizado com eventos processados e aplicados
 */
export function processarEAplicarEventos(
    resultado: ResultadoCalculoFolha, 
    eventos: EventoExcepcional[]
): { resultado: ResultadoCalculoFolha; eventosNormais: EventoExcepcional[] } {
    const eventosProcessados = processarEventosExcepcionais(eventos);
    const resultadoAtualizado = aplicarEventosAoResultado(resultado, eventosProcessados);
    
    return {
        resultado: resultadoAtualizado,
        eventosNormais: eventosProcessados.eventosNormais
    };
}