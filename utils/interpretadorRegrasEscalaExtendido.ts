// Extensão do interpretador para suportar regras visuais

import { interpretarRegraEscala as interpretarRegraEscalaBase } from './interpretadorRegrasEscala';

/**
 * Calcula se trabalha em sábados alternados
 */
function calcularSabadosAlternados(
    dia: number,
    mes: number,
    ano: number,
    diaSemana: string,
    vigencia: string,
    trabalhaPrimeiroSabado: boolean
): boolean {
    // Se não é sábado, não se aplica
    if (diaSemana !== 'Sáb') {
        return true; // Não afeta outros dias
    }

    // Data de vigência (primeiro sábado de referência)
    const dataVigencia = new Date(vigencia + 'T00:00:00');
    
    // Encontrar o primeiro sábado a partir da vigência
    let primeiroSabado = new Date(dataVigencia);
    while (primeiroSabado.getDay() !== 6) { // 6 = Sábado
        primeiroSabado.setDate(primeiroSabado.getDate() + 1);
    }

    // Data atual
    const dataAtual = new Date(ano, mes - 1, dia);

    // Calcular quantos sábados se passaram desde o primeiro
    const diffTime = dataAtual.getTime() - primeiroSabado.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const numSabados = Math.floor(diffDays / 7);

    // Se trabalha no primeiro sábado (T1), trabalha nos sábados pares
    // Se folga no primeiro sábado (T2), trabalha nos sábados ímpares
    const sabadoPar = numSabados % 2 === 0;
    return trabalhaPrimeiroSabado ? sabadoPar : !sabadoPar;
}

/**
 * Verifica se trabalha em um dia específico da semana
 */
function verificarDiaSemana(regra: any, diaSemana: string): boolean {
    if (!regra.dias_semana) {
        return true; // Se não tem configuração específica, trabalha
    }

    const mapa: { [key: string]: string } = {
        'Seg': 'segunda',
        'Ter': 'terca',
        'Qua': 'quarta',
        'Qui': 'quinta',
        'Sex': 'sexta',
        'Sáb': 'sabado',
        'Dom': 'domingo'
    };

    const campo = mapa[diaSemana];
    if (!campo) return true;

    return regra.dias_semana[campo] !== false;
}

/**
 * Busca horários específicos por dia da semana
 */
function buscarHorariosEspecificos(regra: any, diaSemana: string) {
    if (!regra.horarios_especificos) {
        return null;
    }

    const mapa: { [key: string]: string } = {
        'Seg': 'segunda',
        'Ter': 'terca',
        'Qua': 'quarta',
        'Qui': 'quinta',
        'Sex': 'sexta'
    };

    const campo = mapa[diaSemana];
    if (!campo) return null;

    return regra.horarios_especificos[campo];
}

/**
 * Interpretador estendido que suporta regras visuais
 */
export function interpretarRegraEscalaExtendido(
    regraEscala: any,
    dia: number,
    mes: number,
    ano: number,
    diaSemana: string,
    ehFeriado: boolean
): {
    trabalha: boolean;
    folga: boolean;
    horarios: {
        entrada: string;
        saida: string;
        inicio_refeicao: string;
        termino_refeicao: string;
    };
} | null {
    // Se não tem regra, retornar null
    if (!regraEscala || typeof regraEscala !== 'object') {
        return null;
    }

    const regra = regraEscala;

    // 1. Verificar se trabalha neste dia da semana
    if (!verificarDiaSemana(regra, diaSemana)) {
        return {
            trabalha: false,
            folga: true,
            horarios: {
                entrada: '',
                saida: '',
                inicio_refeicao: '',
                termino_refeicao: ''
            }
        };
    }

    // 2. Verificar sábados alternados
    if (regra.tipo === 'SABADOS_ALTERNADOS' && regra.alternancia) {
        const trabalhaHoje = calcularSabadosAlternados(
            dia,
            mes,
            ano,
            diaSemana,
            regra.alternancia.vigencia,
            regra.alternancia.trabalha_primeiro_sabado
        );

        if (!trabalhaHoje) {
            return {
                trabalha: false,
                folga: true,
                horarios: {
                    entrada: '',
                    saida: '',
                    inicio_refeicao: '',
                    termino_refeicao: ''
                }
            };
        }
    }

    // 3. Usar interpretador base para o resto
    const resultado = interpretarRegraEscalaBase(regraEscala, dia, mes, ano, diaSemana, ehFeriado);

    if (!resultado) {
        return null;
    }

    // 4. Verificar se há horários específicos para este dia da semana
    const horariosEspecificos = buscarHorariosEspecificos(regra, diaSemana);
    if (horariosEspecificos && resultado.trabalha) {
        const temRefeicao = horariosEspecificos.refeicao !== null && horariosEspecificos.refeicao !== undefined;
        
        return {
            trabalha: true,
            folga: false,
            horarios: {
                entrada: horariosEspecificos.entrada,
                saida: horariosEspecificos.saida,
                inicio_refeicao: temRefeicao ? horariosEspecificos.refeicao.inicio : horariosEspecificos.entrada,
                termino_refeicao: temRefeicao ? horariosEspecificos.refeicao.fim : horariosEspecificos.entrada
            }
        };
    }

    return resultado;
}
