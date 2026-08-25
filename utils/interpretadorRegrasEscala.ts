// Interpretador de Regras de Escala Configuráveis - SISTEMA UNIFICADO
// Todas as escalas usam a mesma estrutura JSON padronizada

export interface HorarioTrabalho {
    entrada: string;
    saida: string;
    refeicao: {
        inicio: string;
        fim: string;
    } | null;
}

export interface ConfigAlternancia {
    vigencia: string; // Data no formato 'YYYY-MM-DD'
    turma: 'T1' | 'T2';
    trabalha_primeiro_dia: boolean;
}

export interface ConfigAlternanciaSabados {
    vigencia: string;
    turma: 'T1' | 'T2';
    trabalha_primeiro_sabado: boolean;
}

export interface RegraEscalaJSON {
    tipo: 'PADRAO' | 'SEM_DOMINGO_FERIADO' | 'ALTERNANCIA_12X36' | 'SABADOS_ALTERNADOS';
    trabalha_domingo: boolean;
    trabalha_feriado: boolean;
    alternancia?: ConfigAlternancia | ConfigAlternanciaSabados; // Para ALTERNANCIA_12X36 ou SABADOS_ALTERNADOS
    horarios: {
        util: HorarioTrabalho;
        sabado: HorarioTrabalho;
        domingo: HorarioTrabalho;
        feriado: HorarioTrabalho;
    };
    // Horários específicos por dia da semana (opcional)
    horarios_especificos?: {
        segunda?: HorarioTrabalho;
        terca?: HorarioTrabalho;
        quarta?: HorarioTrabalho;
        quinta?: HorarioTrabalho;
        sexta?: HorarioTrabalho;
    };
    // Controle de trabalho por dia da semana (opcional)
    dias_semana?: {
        segunda: boolean;
        terca: boolean;
        quarta: boolean;
        quinta: boolean;
        sexta: boolean;
        sabado: boolean;
    };
}

export type RegraEscala = RegraEscalaJSON;

/**
 * Interpreta a regra da escala (SISTEMA UNIFICADO)
 * Todas as escalas usam a mesma estrutura JSON
 */
export function interpretarRegraEscala(
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
    // Se não tem regra ou não é objeto JSON, retornar null (usar lógica padrão)
    if (!regraEscala || typeof regraEscala !== 'object') {
        return null;
    }
    
    const regra = regraEscala as RegraEscalaJSON;
    
    // 1. Verificar se trabalha baseado no tipo de escala
    let trabalhaHoje = true;
    
    const isDomingo = diaSemana === 'Dom';
    
    // Se é domingo e não trabalha domingo, é folga
    if (isDomingo && !regra.trabalha_domingo) {
        trabalhaHoje = false;
    }
    
    // Se é feriado e não trabalha feriado, é folga
    if (ehFeriado && !regra.trabalha_feriado) {
        trabalhaHoje = false;
    }
    
    // Verificar se trabalha no dia específico da semana (se configurado)
    if (trabalhaHoje && regra.dias_semana) {
        const mapeamentoDias: { [key: string]: keyof typeof regra.dias_semana } = {
            'Seg': 'segunda',
            'Ter': 'terca',
            'Qua': 'quarta',
            'Qui': 'quinta',
            'Sex': 'sexta',
            'Sáb': 'sabado'
        };
        
        const diaEspecifico = mapeamentoDias[diaSemana];
        if (diaEspecifico && regra.dias_semana[diaEspecifico] === false) {
            trabalhaHoje = false;
        }
    }
    
    // 2. Para escalas com alternância, verificar o padrão 12x36
    if (regra.tipo === 'ALTERNANCIA_12X36' && regra.alternancia && trabalhaHoje) {
        const alt = regra.alternancia as ConfigAlternancia;
        trabalhaHoje = calcularAlternancia12x36(
            dia,
            mes,
            ano,
            alt.vigencia,
            alt.trabalha_primeiro_dia
        );
    }
    
    // 3. Para escalas com sábados alternados, verificar apenas nos sábados
    if (regra.tipo === 'SABADOS_ALTERNADOS' && regra.alternancia && trabalhaHoje && diaSemana === 'Sáb') {
        const alt = regra.alternancia as ConfigAlternanciaSabados;
        trabalhaHoje = calcularSabadosAlternados(
            dia,
            mes,
            ano,
            alt.vigencia,
            alt.trabalha_primeiro_sabado
        );
    }
    
    // 4. Se não trabalha, retornar folga
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
    
    // 5. Determinar tipo de dia para buscar horários
    let tipoDia: 'util' | 'sabado' | 'domingo' | 'feriado' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta';
    if (ehFeriado) {
        tipoDia = 'feriado';
    } else if (isDomingo) {
        tipoDia = 'domingo';
    } else if (diaSemana === 'Sáb') {
        tipoDia = 'sabado';
    } else {
        // Para dias úteis, verificar se há horários específicos por dia da semana
        const mapeamentoDias: { [key: string]: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' } = {
            'Seg': 'segunda',
            'Ter': 'terca',
            'Qua': 'quarta',
            'Qui': 'quinta',
            'Sex': 'sexta'
        };
        
        const diaEspecifico = mapeamentoDias[diaSemana];
        
        // Se tem horários específicos e o dia específico existe, usar ele
        if (regra.horarios_especificos && diaEspecifico && regra.horarios_especificos[diaEspecifico]) {
            tipoDia = diaEspecifico;
        } else {
            tipoDia = 'util';
        }
    }
    
    // 6. Buscar horários configurados
    let horarioConfig;
    
    // Se é um dia específico da semana, buscar nos horários específicos
    if (['segunda', 'terca', 'quarta', 'quinta', 'sexta'].includes(tipoDia) && regra.horarios_especificos) {
        horarioConfig = regra.horarios_especificos[tipoDia as 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta'];
    } else {
        // Usar horários padrão
        const tipoHorarioPadrao = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'].includes(tipoDia) ? 'util' : tipoDia;
        horarioConfig = regra.horarios[tipoHorarioPadrao as 'util' | 'sabado' | 'domingo' | 'feriado'];
    }
    
    // Se não tem horários configurados para este tipo de dia, é folga
    if (!horarioConfig || !horarioConfig.entrada || !horarioConfig.saida) {
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
    
    // 7. Retornar com horários
    // Se refeicao é null, significa sem intrajornada (horários iguais)
    const temRefeicao = horarioConfig.refeicao !== null && horarioConfig.refeicao !== undefined;
    
    // Determinar horário de almoço padrão quando não há intrajornada
    let horarioAlmocoPadrao = '12:00';
    
    // Para escalas noturnas, usar 22:00 como padrão
    if (horarioConfig.entrada >= '18:00' || horarioConfig.saida <= '08:00') {
        horarioAlmocoPadrao = '22:00';
    }
    
    return {
        trabalha: true,
        folga: false,
        horarios: {
            entrada: horarioConfig.entrada,
            saida: horarioConfig.saida,
            inicio_refeicao: temRefeicao && horarioConfig.refeicao ? horarioConfig.refeicao.inicio : horarioAlmocoPadrao,
            termino_refeicao: temRefeicao && horarioConfig.refeicao ? horarioConfig.refeicao.fim : horarioAlmocoPadrao
        }
    };
}

/**
 * Calcula se o funcionário trabalha no dia baseado na alternância 12x36
 */
function calcularAlternancia12x36(
    dia: number,
    mes: number,
    ano: number,
    dataVigencia: string,
    trabalhaPrimeiroDia: boolean
): boolean {
    // Converter data de vigência para Date (usando UTC para evitar problemas de timezone)
    const vigencia = new Date(dataVigencia + 'T12:00:00');
    
    // Data do dia atual (usando meio-dia para evitar problemas de timezone)
    const dataAtual = new Date(ano, mes - 1, dia, 12, 0, 0);
    
    // Calcular diferença em dias desde a vigência
    const diffTime = dataAtual.getTime() - vigencia.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Usar round para evitar erros de arredondamento
    
    // Se antes da vigência, não trabalha
    if (diffDays < 0) {
        return false;
    }
    
    // Alternância: dia par trabalha, dia ímpar folga (ou vice-versa)
    const diaEhPar = diffDays % 2 === 0;
    
    // Debug para diagnóstico
    
    // Se trabalha no primeiro dia (T1), trabalha nos dias pares (0, 2, 4...)
    // Se não trabalha no primeiro dia (T2), trabalha nos dias ímpares (1, 3, 5...)
    return trabalhaPrimeiroDia ? diaEhPar : !diaEhPar;
}

/**
 * Calcula se o funcionário trabalha no sábado baseado na alternância de sábados
 */
function calcularSabadosAlternados(
    dia: number,
    mes: number,
    ano: number,
    dataVigencia: string,
    trabalhaPrimeiroSabado: boolean
): boolean {
    // Converter data de vigência para Date (usando meio-dia para evitar problemas de timezone)
    const vigencia = new Date(dataVigencia + 'T12:00:00');
    
    // Data do dia atual (usando meio-dia para evitar problemas de timezone)
    const dataAtual = new Date(ano, mes - 1, dia, 12, 0, 0);
    
    // Se antes da vigência, não trabalha
    if (dataAtual < vigencia) {
        return false;
    }
    
    // Encontrar o primeiro sábado a partir da vigência
    const primeiroSabado = new Date(vigencia);
    while (primeiroSabado.getDay() !== 6) {
        primeiroSabado.setDate(primeiroSabado.getDate() + 1);
    }
    
    // Calcular quantas semanas se passaram desde o primeiro sábado
    const diffTime = dataAtual.getTime() - primeiroSabado.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const numSemanas = Math.floor(diffDays / 7);
    
    // Verificar se é exatamente um sábado (deve ser múltiplo de 7 dias)
    if (diffDays % 7 !== 0) {
        // Não é sábado relativo ao primeiro sábado - isso não deveria acontecer
        // pois esta função só é chamada para sábados
        return true; // Retornar true para não afetar outros dias
    }
    
    const sabadoEhPar = numSemanas % 2 === 0;
    
    // Debug para diagnóstico
    
    // T1 trabalha nos sábados pares (1º, 3º, 5º... = índices 0, 2, 4...)
    // T2 trabalha nos sábados ímpares (2º, 4º, 6º... = índices 1, 3, 5...)
    return trabalhaPrimeiroSabado ? sabadoEhPar : !sabadoEhPar;
}

/**
 * Valida se a regra JSON está no formato correto (SISTEMA UNIFICADO)
 */
export function validarRegraJSON(regra: any): { valido: boolean; erro?: string } {
    if (!regra || typeof regra !== 'object') {
        return { valido: false, erro: 'Regra deve ser um objeto JSON' };
    }
    
    // Validar campos obrigatórios
    if (!regra.tipo || !['PADRAO', 'SEM_DOMINGO_FERIADO', 'ALTERNANCIA_12X36', 'SABADOS_ALTERNADOS'].includes(regra.tipo)) {
        return { valido: false, erro: 'Campo "tipo" inválido ou ausente' };
    }
    
    if (typeof regra.trabalha_domingo !== 'boolean' || typeof regra.trabalha_feriado !== 'boolean') {
        return { valido: false, erro: 'Campos "trabalha_domingo" e "trabalha_feriado" são obrigatórios' };
    }
    
    // Validar alternância (se for 12x36)
    if (regra.tipo === 'ALTERNANCIA_12X36') {
        if (!regra.alternancia || !regra.alternancia.vigencia || !regra.alternancia.turma || 
            typeof regra.alternancia.trabalha_primeiro_dia !== 'boolean') {
            return { valido: false, erro: 'Configuração de alternância incompleta' };
        }
    }
    
    // Validar horários
    if (!regra.horarios || !regra.horarios.util || !regra.horarios.sabado || 
        !regra.horarios.domingo || !regra.horarios.feriado) {
        return { valido: false, erro: 'Horários incompletos (faltam: util, sabado, domingo ou feriado)' };
    }
    
    return { valido: true };
}

/**
 * Interpreta as regras JSON da escala e retorna configurações simplificadas
 * Usado para verificar comportamentos sem calcular horários específicos
 */
export function interpretarRegrasEscala(regrasJSON: any): {
    naoTrabalhaFeriado: boolean;
    trabalhaDomingo: boolean;
    tipo: string;
} {
    // Se não tem regras ou não é objeto JSON, usar padrão
    if (!regrasJSON || typeof regrasJSON !== 'object') {
        return {
            naoTrabalhaFeriado: false,
            trabalhaDomingo: true,
            tipo: 'PADRAO'
        };
    }
    
    const regra = regrasJSON as RegraEscalaJSON;
    
    return {
        naoTrabalhaFeriado: !regra.trabalha_feriado || !regra.trabalha_domingo,
        trabalhaDomingo: regra.trabalha_domingo,
        tipo: regra.tipo
    };
}
