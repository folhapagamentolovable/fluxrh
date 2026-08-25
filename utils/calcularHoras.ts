// Utilitário para cálculo de horas trabalhadas, extras e noturnas

export interface HorariosDia {
  entrada: string;
  inicio_refeicao: string;
  termino_refeicao: string;
  saida: string;
}

export interface CalculoHoras {
  horas_normais: number;
  horas_extras_50: number;
  horas_extras_100: number;
  horas_noturnas: number;
  intrajornada_50: number;
  intrajornada_100: number;
  atrasos: number; // em horas decimais
  total_horas: number;
  
  // === EVENTOS EXCEPCIONAIS (PROVENTOS) ===
  decimo_terceiro_proporcional_rescisao: number; // 13º Proporc. Rescisão
  ferias_proporcionais_rescisao: number;          // Férias Proporc. Rescisão
  um_terco_ferias_proporcional_rescisao: number;  // 1/3 Férias proporc. Rescisão
  plr_proporcional_rescisao: number;              // PLR Proporc. Rescisão
  decimo_terceiro_vantagens_rescisao: number;     // 13º Proporc. Vantagens Rescisão
  
  // === NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
  decimo_terceiro_primeira_parcela: number;       // 13º Salário 1ª Parcela
  decimo_terceiro_vantagens_primeira_parcela: number; // 13º Salário Vantagens 1ª Parcela
  decimo_terceiro_segunda_parcela: number;        // 13º Salário 2ª Parcela
  decimo_terceiro_vantagens_segunda_parcela: number;  // 13º Salário Vantagens 2ª Parcela
  folga_trabalhada: number;                       // FT (Folga Trabalhada)
  
  // === SERVIÇOS EXTERNOS E REEMBOLSOS ===
  servicos_externos_folhas_pagamento: number;     // Serviços Externos (Folhas de Pagamento)
  servicos_externos_controle_rondas: number;      // Serviços Externos (Controle de Rondas)
  reembolsos_uber: number;                        // Reembolsos - benefício
}

/**
 * Converte horário "HH:MM" para minutos desde meia-noite
 */
export function horarioParaMinutos(horario: string): number {
  if (!horario || horario === '') return 0;
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Converte minutos para formato "HH:MM"
 */
export function minutosParaHorario(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converte minutos para horas decimais
 */
export function minutosParaHorasDecimais(minutos: number): number {
  return Number((minutos / 60).toFixed(2));
}

/**
 * Verifica se é um sábado de folga programada para FIGLIMPT1/FIGLIMPT2
 */
export function ehSabadoFolgaProgramada(
  codigoEscala: string, 
  data: Date
): boolean {
  if (!['FIGLIMPT1', 'FIGLIMPT2'].includes(codigoEscala)) {
    return false;
  }
  
  if (data.getDay() !== 6) { // Não é sábado
    return false;
  }
  
  // Calcular número da semana baseado no primeiro sábado de 2025
  const primeiroSabado = new Date('2025-01-04');
  const numSemana = Math.floor((data.getTime() - primeiroSabado.getTime()) / (1000 * 60 * 60 * 24 * 7));
  
  // FIGLIMPT1 trabalha em semanas pares (0, 2, 4...) = folga em ímpares
  // FIGLIMPT2 trabalha em semanas ímpares (1, 3, 5...) = folga em pares
  if (codigoEscala === 'FIGLIMPT1') {
    return numSemana % 2 !== 0; // Folga em semanas ímpares
  } else {
    return numSemana % 2 === 0; // Folga em semanas pares
  }
}

/**
 * Gera horários padrão para uma escala baseado no código e dia da semana
 */
export function gerarHorariosPadraoEscala(
  codigoEscala: string, 
  diaSemana: number // 0=Dom, 1=Seg, ..., 6=Sáb
): HorariosDia | null {
  // Horários padrão por tipo de escala
  switch (codigoEscala) {
    // === ESCALAS DE FIGUEIRAS ===
    case 'FIGLIMPT1':
    case 'FIGLIMPT2':
      if (diaSemana >= 1 && diaSemana <= 4) { // Seg-Qui: 08:00–17:00
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '13:00',
          saida: '17:00'
        };
      } else if (diaSemana === 5) { // Sexta: 08:00–17:00
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '13:00',
          saida: '17:00'
        };
      } else if (diaSemana === 6) { // Sábado alternado: 08:00–12:00
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '12:00',
          saida: '12:00'
        };
      }
      break;
    
    // === ESCALAS DE LIMPEZA PADRÃO ===
    case 'GALLIMPT1':
    case 'PALMLIMPT1':
    case 'PALMLIMPT2':
      if (diaSemana >= 1 && diaSemana <= 5) { // Seg-Sex
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '13:00',
          saida: '17:00'
        };
      } else if (diaSemana === 6) { // Sábado meio período
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '12:00', // Sem almoço
          saida: '12:00'
        };
      }
      break;
    
    // === ESCALAS DE ZELADOR ===
    case 'FIGZELADT1':
    case 'GALZELADT1':
    case 'GALZELADORT1':
      if (diaSemana >= 1 && diaSemana <= 5) { // Seg-Sex
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '13:00',
          saida: '17:00'
        };
      } else if (diaSemana === 6) { // Sábado meio período
        return {
          entrada: '08:00',
          inicio_refeicao: '12:00',
          termino_refeicao: '12:00', // Sem almoço
          saida: '12:00'
        };
      }
      break;
    
    // === ESCALAS DE VIGILÂNCIA ===
    case 'GALVIGDIURNOT1':
    case 'GALVIGDIURNOT2':
    case 'GALVIGNOTURNOT1':
    case 'GALVIGNOTURNOT2':
    case 'PALMVIGDIURNOT1':
    case 'PALMVIGDIURNOT2':
    case 'PALMVIGNOTURNOT1':
    case 'PALMVIGNOTURNOT2':
      // Vigilantes 12x36 - horário exemplo (pode variar)
      return {
        entrada: '18:00',
        inicio_refeicao: '23:00',
        termino_refeicao: '23:00', // Intrajornada suprimida
        saida: '06:00'
      };
  }
  
  return null; // Escala não mapeada
}

/**
 * Calcula a jornada padrão baseada no código exato da escala
 */
export function calcularJornadaPadraoEscala(
  codigoEscala: string, 
  diaSemana: number, // 0=Dom, 1=Seg, ..., 6=Sáb
  ehFeriado: boolean = false
): number {
  // Mapeamento completo de todas das escalas da empresa
  let jornadaPadrao: number;
  
  switch (codigoEscala) {
    // === ESCALAS DE FIGUEIRAS COM COMPENSAÇÃO ===
    case 'FIGLIMPT1':      // Auxiliar de Limpeza Figueiras T1
    case 'FIGLIMPT2':      // Auxiliar de Limpeza Figueiras T2
      // Seg-Qui: 08:00–17:00 = 9h brutas – 1h almoço = 8h líquidas
      // Sex:     08:00–17:00 = 9h brutas – 1h almoço = 8h líquidas
      // Sáb:     08:00–12:00 = 4h (quando trabalha, alternado)
      if (diaSemana >= 1 && diaSemana <= 4) { // Seg-Qui
        jornadaPadrao = 8;
      } else if (diaSemana === 5) { // Sexta
        jornadaPadrao = 8;
      } else if (diaSemana === 6) { // Sábado
        jornadaPadrao = 4;
      } else {
        jornadaPadrao = 8;
      }
      break;
    
    case 'FIGZELADT1':     // Zelador Figueiras T1
      if (diaSemana === 6) { // Sábado
        jornadaPadrao = 4; // Meio período
      } else {
        jornadaPadrao = 8; // Jornada padrão 8h
      }
      break;
    
    // === ESCALAS DE GALLERIA ===
    case 'GALLIMPT1':      // Auxiliar de Limpeza Galleria T1
      if (diaSemana === 6) { // Sábado
        jornadaPadrao = 4; // Meio período (se trabalhar)
      } else {
        jornadaPadrao = 8; // Jornada padrão 8h
      }
      break;
      
    case 'GALZELADT1':     // Zelador Galleria T1
    case 'GALZELADORT1':   // Zelador Galleria T1 (variação)
      if (diaSemana === 6) { // Sábado
        jornadaPadrao = 4; // Meio período
      } else {
        jornadaPadrao = 8; // Jornada padrão 8h
      }
      break;
    
    // === ESCALAS DE VIGILÂNCIA GALLERIA ===
    case 'GALVIGDIURNOT1': // Vigia Diurno Galleria T1
    case 'GALVIGDIURNOT2': // Vigia Diurno Galleria T2
    case 'GALVIGNOTURNOT1': // Vigia Noturno Galleria T1
    case 'GALVIGNOTURNOT2': // Vigia Noturno Galleria T2
      jornadaPadrao = 11; // TODOS os vigilantes 12x36: 11h + 1h intrajornada
      break;
    
    // === ESCALAS DE PALMEIRAS ===
    case 'PALMLIMPT1':     // Auxiliar de Limpeza Palmeiras T1
    case 'PALMLIMPT2':     // Auxiliar de Limpeza Palmeiras T2
      if (diaSemana === 6) { // Sábado
        jornadaPadrao = 4; // Meio período (se trabalhar)
      } else {
        jornadaPadrao = 8; // Jornada padrão 8h
      }
      break;
    
    // === ESCALAS DE VIGILÂNCIA PALMEIRAS ===
    case 'PALMVIGDIURNOT1': // Vigia Diurno Palmeiras T1
    case 'PALMVIGDIURNOT2': // Vigia Diurno Palmeiras T2
    case 'PALMVIGNOTURNOT1': // Vigia Noturno Palmeiras T1
    case 'PALMVIGNOTURNOT2': // Vigia Noturno Palmeiras T2
      jornadaPadrao = 11; // TODOS os vigilantes 12x36: 11h + 1h intrajornada
      break;
    
    default:
      jornadaPadrao = 8; // Fallback para escalas não mapeadas
      break;
  }
  
  return jornadaPadrao;
}

/**
 * Calcula a jornada padrão baseada nos horários (função auxiliar)
 */
export function calcularJornadaPadrao(horarios: HorariosDia): number {
  if (!horarios.entrada || !horarios.saida) {
    return 8; // Padrão se não tem horários
  }
  
  const entrada = horarioParaMinutos(horarios.entrada);
  const saida = horarioParaMinutos(horarios.saida);
  const inicioRefeicao = horarioParaMinutos(horarios.inicio_refeicao);
  const terminoRefeicao = horarioParaMinutos(horarios.termino_refeicao);
  
  // Calcular jornada total
  let jornadaTotalMinutos = saida - entrada;
  if (jornadaTotalMinutos < 0) {
    jornadaTotalMinutos += 24 * 60; // Ajustar se passou da meia-noite
  }
  
  // REGRA: Toda jornada > 6h tem direito a intrajornada
  const jornadaTotalHoras = jornadaTotalMinutos / 60;
  
  if (jornadaTotalHoras > 6) {
    // Verificar se intrajornada foi suprimida
    const intrajornadaSuprimida = (inicioRefeicao === terminoRefeicao);
    
    if (intrajornadaSuprimida) {
      // Intrajornada suprimida: jornada = total - 1h (que vira intrajornada extra)
      return Number((jornadaTotalHoras - 1).toFixed(2));
    } else {
      // Intrajornada usufruída: descontar o intervalo
      let minutosIntervalo = 0;
      if (inicioRefeicao && terminoRefeicao && terminoRefeicao > inicioRefeicao) {
        minutosIntervalo = terminoRefeicao - inicioRefeicao;
      }
      const jornadaEfetivaMinutos = jornadaTotalMinutos - minutosIntervalo;
      return Number((jornadaEfetivaMinutos / 60).toFixed(2));
    }
  } else {
    // Jornada <= 6h: sem intrajornada obrigatória
    return Number(jornadaTotalHoras.toFixed(2));
  }
}

/**
 * Calcula horas trabalhadas em um dia - VERSÃO CORRIGIDA
 */
export function calcularHorasDia(
  horarios: HorariosDia,
  jornadaPadrao: number = 8, // horas - SERÁ RECALCULADO baseado nos horários previstos
  feriado: boolean = false,
  folga: boolean = false,
  diaSemana: number = 0, // 0=Dom, 1=Seg, ..., 6=Sáb
  nomeEscala: string = '',
  horariosPrevistos?: HorariosDia // Horários da escala para calcular atrasos
): CalculoHoras {
  
  const resultado: CalculoHoras = {
    horas_normais: 0,
    horas_extras_50: 0,
    horas_extras_100: 0,
    horas_noturnas: 0,
    intrajornada_50: 0,
    intrajornada_100: 0,
    atrasos: 0,
    total_horas: 0,
    
    // === EVENTOS EXCEPCIONAIS (PROVENTOS) ===
    decimo_terceiro_proporcional_rescisao: 0,
    ferias_proporcionais_rescisao: 0,
    um_terco_ferias_proporcional_rescisao: 0,
    plr_proporcional_rescisao: 0,
    decimo_terceiro_vantagens_rescisao: 0,
    
    // === NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
    decimo_terceiro_primeira_parcela: 0,
    decimo_terceiro_vantagens_primeira_parcela: 0,
    decimo_terceiro_segunda_parcela: 0,
    decimo_terceiro_vantagens_segunda_parcela: 0,
    folga_trabalhada: 0,
    
    // === SERVIÇOS EXTERNOS E REEMBOLSOS ===
    servicos_externos_folhas_pagamento: 0,
    servicos_externos_controle_rondas: 0,
    reembolsos_uber: 0
  };

  // REGRA ESPECIAL: FIGLIMPT1/FIGLIMPT2 - Sábado de folga programada NÃO gera falta
  if (!horarios.entrada || !horarios.saida) {
    // Verificar se é sábado de folga programada (não gera falta)
    if (['FIGLIMPT1', 'FIGLIMPT2'].includes(nomeEscala) && 
        diaSemana === 6 && 
        !feriado && 
        !folga) {
      // Assumir que é sábado de folga programada (não gera falta)
      return resultado;
    }
    return resultado;
  }
  
  // Calcular jornada padrão sempre a partir dos horários previstos reais (banco)
  // Remove a lista hardcoded — qualquer escala usa calcularJornadaPadrao(horariosPrevistos)
  if (horariosPrevistos && horariosPrevistos.entrada && horariosPrevistos.saida) {
    jornadaPadrao = calcularJornadaPadrao(horariosPrevistos);
  } else if (nomeEscala) {
    // Fallback apenas quando não há horários previstos disponíveis
    jornadaPadrao = calcularJornadaPadraoEscala(nomeEscala, diaSemana, feriado);
  }
  
  // ========================================
  // REGRA ESPECIAL: TRABALHO EM FERIADO
  // ========================================
  // IMPORTANTE: Para VIGIAS em feriado com intrajornada suprimida:
  // - 11h de HE 100%
  // - 1h de Intrajornada 100%
  // - Total: 12h
  if (feriado) {
    const entrada = horarioParaMinutos(horarios.entrada);
    const saida = horarioParaMinutos(horarios.saida);
    const inicioRefeicao = horarioParaMinutos(horarios.inicio_refeicao);
    const terminoRefeicao = horarioParaMinutos(horarios.termino_refeicao);
    const intervaloSuprimido = (inicioRefeicao === terminoRefeicao);
    
    // REGRA ESPECIAL PARA ESCALAS 12X36 EM FERIADO
    // Aplica-se a TODAS as escalas com jornada de 12h (vigilantes, limpeza, etc)
    if (jornadaPadrao === 12) {
      if (intervaloSuprimido) {
        // Intrajornada suprimida em feriado:
        // Fórmula: (Saída - Entrada) - (Fim Ref. - Inicio Ref.) = HE 100%
        //          (Fim Ref. - Inicio Ref.) = Intrajornada 100%
        // Resultado: 11h HE 100% + 1h Intra 100% = 12h × 200%
        resultado.horas_extras_100 = 11;
        resultado.intrajornada_100 = 1;
        resultado.total_horas = 12;
      } else {
        // Intrajornada usufruída em feriado:
        // Calcular horas trabalhadas (descontando intrajornada)
        const periodoAntes = inicioRefeicao - entrada;
        let periodoDepois = saida - terminoRefeicao;
        
        // Ajustar se passou da meia-noite
        if (periodoDepois < 0) {
          periodoDepois += 24 * 60;
        }
        
        const horasTrabalhadasMinutos = periodoAntes + periodoDepois;
        
        // Todas as horas trabalhadas são extras 100% em feriados
        resultado.horas_extras_100 = minutosParaHorasDecimais(horasTrabalhadasMinutos);
        resultado.total_horas = minutosParaHorasDecimais(horasTrabalhadasMinutos);
      }
    } 
    // REGRA PARA OUTRAS ESCALAS EM FERIADO
    else {
      // Calcular horas trabalhadas (descontando intrajornada)
      const periodoAntes = inicioRefeicao - entrada;
      let periodoDepois = saida - terminoRefeicao;
      
      // Ajustar se passou da meia-noite
      if (periodoDepois < 0) {
        periodoDepois += 24 * 60;
      }
      
      const horasTrabalhadasMinutos = periodoAntes + periodoDepois;
      
      // Todas as horas trabalhadas são extras 100% em feriados
      resultado.horas_extras_100 = minutosParaHorasDecimais(horasTrabalhadasMinutos);
      resultado.total_horas = minutosParaHorasDecimais(horasTrabalhadasMinutos);
    }
    
    // Calcular horas noturnas
    resultado.horas_noturnas = calcularHorasNoturnas(entrada, saida, inicioRefeicao, terminoRefeicao);
    
    return resultado;
  }
  
  // ========================================
  // REGRA ESPECIAL: TRABALHO EM FOLGA
  // ========================================
  // Se trabalhou em dia de FOLGA, todas as horas trabalhadas são extras
  // Segunda a Sábado: 50% | Domingo: 100%
  // A intrajornada é descontada (é intervalo de descanso, não hora trabalhada)
  if (folga) {
    const entrada = horarioParaMinutos(horarios.entrada);
    const saida = horarioParaMinutos(horarios.saida);
    const inicioRefeicao = horarioParaMinutos(horarios.inicio_refeicao);
    const terminoRefeicao = horarioParaMinutos(horarios.termino_refeicao);
    
    // Calcular horas trabalhadas (descontando intrajornada)
    const periodoAntes = inicioRefeicao - entrada;
    let periodoDepois = saida - terminoRefeicao;
    
    // Ajustar se passou da meia-noite
    if (periodoDepois < 0) {
      periodoDepois += 24 * 60;
    }
    
    const horasTrabalhadasMinutos = periodoAntes + periodoDepois;
    const isDomingo = (diaSemana === 0);
    
    // Todas as horas trabalhadas são extras
    if (isDomingo) {
      resultado.horas_extras_100 = minutosParaHorasDecimais(horasTrabalhadasMinutos);
    } else {
      resultado.horas_extras_50 = minutosParaHorasDecimais(horasTrabalhadasMinutos);
    }
    
    // Intrajornada NÃO é anotada em folgas (é apenas descanso)
    // As colunas "Intra" são apenas para intrajornada SUPRIMIDA
    
    // Calcular horas noturnas
    resultado.horas_noturnas = calcularHorasNoturnas(entrada, saida, inicioRefeicao, terminoRefeicao);
    
    // Total = apenas horas trabalhadas (SEM intrajornada)
    resultado.total_horas = minutosParaHorasDecimais(horasTrabalhadasMinutos);
    
    return resultado;
  }

  // Converter para minutos
  const entrada = horarioParaMinutos(horarios.entrada);
  const saida = horarioParaMinutos(horarios.saida);
  const inicioRefeicao = horarioParaMinutos(horarios.inicio_refeicao);
  const terminoRefeicao = horarioParaMinutos(horarios.termino_refeicao);

  // ========================================
  // LÓGICA UNIVERSAL PARA TODAS AS ESCALAS
  // ========================================
  
  // Calcular jornada total (Saída - Entrada)
  let jornadaTotalMinutos = saida - entrada;
  if (jornadaTotalMinutos < 0) {
    jornadaTotalMinutos += 24 * 60; // Ajustar se passou da meia-noite
  }
  const jornadaTotalHoras = jornadaTotalMinutos / 60;
  
  // REGRA 1: Ignorar intrajornada se jornada < 6h
  if (jornadaTotalHoras < 6) {
    // Calcular horas trabalhadas (descontando intervalo se houver)
    let minutosIntervalo = 0;
    if (inicioRefeicao && terminoRefeicao && terminoRefeicao > inicioRefeicao) {
      minutosIntervalo = terminoRefeicao - inicioRefeicao;
    }
    
    const minutosTrabalho = jornadaTotalMinutos - minutosIntervalo;
    const horasEfetivas = minutosParaHorasDecimais(minutosTrabalho);
    
    // CORREÇÃO: Horas normais = mínimo entre horas efetivas e jornada padrão
    resultado.horas_normais = Math.min(horasEfetivas, jornadaPadrao);
    
    if (horasEfetivas > jornadaPadrao) {
      // Horas extras (raro em jornadas < 6h, mas possível)
      const horasExtras = horasEfetivas - jornadaPadrao;
      if (diaSemana === 0) {
        resultado.horas_extras_100 = horasExtras;
      } else {
        resultado.horas_extras_50 = horasExtras;
      }
    }
    
    resultado.total_horas = horasEfetivas;
    resultado.horas_noturnas = calcularHorasNoturnas(entrada, saida, inicioRefeicao, terminoRefeicao);
    
    if (!folga && !feriado) {
      let horariosParaAtrasos = horariosPrevistos;
      if (!horariosParaAtrasos && nomeEscala) {
        horariosParaAtrasos = gerarHorariosPadraoEscala(nomeEscala, diaSemana) || undefined;
      }
      if (horariosParaAtrasos) {
        resultado.atrasos = calcularAtrasos(horarios, horariosParaAtrasos);
        // NÃO subtrair atrasos das horas trabalhadas: as horas já são calculadas
        // a partir dos horários REAIS (entrada/saída efetivas), portanto o período
        // de atraso já está excluído. O desconto financeiro é aplicado em
        // desconto_atrasos = total_atrasos * valorHora na folha de pagamento.
      }
    }
    
    return resultado;
  }
  
  // REGRA 2: Verificar se intervalo está suprimido
  const intervaloSuprimido = (inicioRefeicao === terminoRefeicao);
  const isDomingoOuFeriado = (diaSemana === 0) || feriado;
  
  // REGRA 3: Se intervalo suprimido, anotar 1h de intrajornada
  if (intervaloSuprimido) {
    // ========================================
    // LÓGICA CORRETA PARA INTRAJORNADA SUPRIMIDA
    // ========================================
    // Fórmula: (Saída - Entrada) - 1h = Horas para distribuir
    //          1h = Intrajornada (50% ou 100%)
    // IMPORTANTE: Não pagar hora extra em duplicidade!
    
    const totalHorasJornada = minutosParaHorasDecimais(jornadaTotalMinutos);
    
    // CORREÇÃO: Se trabalhou menos de 6h com intrajornada suprimida (horários iguais)
    // não descontar 1h de intrajornada - é apenas uma jornada curta
    if (totalHorasJornada < 6) {
      // Jornada curta - tratar como jornada normal sem intrajornada obrigatória
      resultado.horas_normais = Math.min(totalHorasJornada, jornadaPadrao);
      resultado.total_horas = totalHorasJornada;
      
      // Calcular atrasos
      if (!folga && !feriado) {
        let horariosParaAtrasos = horariosPrevistos;
        if (!horariosParaAtrasos && nomeEscala) {
          horariosParaAtrasos = gerarHorariosPadraoEscala(nomeEscala, diaSemana) || undefined;
        }
        if (horariosParaAtrasos) {
          resultado.atrasos = calcularAtrasos(horarios, horariosParaAtrasos);
          // Não subtrair atrasos das horas: horas já vêm dos horários reais.
          // Desconto financeiro é tratado em desconto_atrasos.
        }
      }
      
      resultado.horas_noturnas = calcularHorasNoturnas(entrada, saida, inicioRefeicao, terminoRefeicao);
      return resultado;
    }
    
    const horasParaDistribuir = totalHorasJornada - 1; // Descontar 1h de intrajornada
    
    // CORREÇÃO: Horas normais = mínimo entre horas distribuídas e jornada padrão
    resultado.horas_normais = Math.min(horasParaDistribuir, jornadaPadrao);
    
    if (horasParaDistribuir > jornadaPadrao) {
      // Trabalhou MAIS que a jornada padrão = horas extras
      const horasExtras = horasParaDistribuir - jornadaPadrao;
      
      // REGRA CORRETA: Em dias normais (seg-sáb) = HE 50%, Em domingos = HE 100%
      if (isDomingoOuFeriado) {
        resultado.horas_extras_100 = horasExtras;
      } else {
        resultado.horas_extras_50 = horasExtras;
      }
    }
    
    // Intrajornada: SEMPRE 1h (50% ou 100% dependendo do dia)
    if (isDomingoOuFeriado) {
      resultado.intrajornada_100 = 1;
    } else {
      resultado.intrajornada_50 = 1;
    }
    
    // Total = horas distribuídas + intrajornada
    resultado.total_horas = totalHorasJornada;

  }
  // REGRA 4: Se intervalo usufruído, calcular normalmente
  else {
    // Calcular horas trabalhadas (descontando intervalo)
    let minutosIntervalo = 0;
    if (inicioRefeicao && terminoRefeicao && terminoRefeicao > inicioRefeicao) {
      minutosIntervalo = terminoRefeicao - inicioRefeicao;
    }
    
    const minutosTrabalho = jornadaTotalMinutos - minutosIntervalo;
    const horasEfetivas = minutosParaHorasDecimais(minutosTrabalho);
    
    // ========================================
    // CORREÇÃO: CALCULAR HORAS NORMAIS CORRETAMENTE
    // ========================================
    
    // Horas normais = mínimo entre horas efetivas e jornada padrão
    resultado.horas_normais = Math.min(horasEfetivas, jornadaPadrao);
    
    if (horasEfetivas > jornadaPadrao) {
      // Trabalhou MAIS que a jornada padrão = horas extras
      const horasExtras = horasEfetivas - jornadaPadrao;
      
      // REGRA CORRETA: Em dias normais (seg-sáb) = HE 50%, Em domingos = HE 100%
      if (diaSemana === 0) { // Domingo
        resultado.horas_extras_100 = horasExtras;
      } else {
        resultado.horas_extras_50 = horasExtras;
      }
    }
    // Se horasEfetivas === jornadaPadrao: perfeito, só horas normais
    // Se horasEfetivas < jornadaPadrao: horas normais = horas efetivas, atrasos serão calculados
    
    resultado.total_horas = horasEfetivas;
    

  }
  
  // Calcular horas noturnas
  resultado.horas_noturnas = calcularHorasNoturnas(entrada, saida, inicioRefeicao, terminoRefeicao);
  
  // Calcular atrasos (se não for folga/feriado) — apenas para registro/desconto financeiro.
  // As horas trabalhadas (horas_normais/total_horas) já são calculadas a partir
  // dos horários REAIS, portanto o período de atraso já está excluído delas.
  // O desconto monetário é aplicado em desconto_atrasos na folha de pagamento.
  if (!folga && !feriado) {
    let horariosParaAtrasos = horariosPrevistos;
    if (!horariosParaAtrasos && nomeEscala) {
      horariosParaAtrasos = gerarHorariosPadraoEscala(nomeEscala, diaSemana) || undefined;
    }
    if (horariosParaAtrasos) {
      resultado.atrasos = calcularAtrasos(horarios, horariosParaAtrasos);
    }
  }
  
  return resultado;
}

/**
 * Calcula atrasos e saídas antecipadas com tolerância de 5 minutos (CLT art. 58 §1º)
 * Só desconta se o desvio SUPERAR 5 minutos; desconta o total (não apenas o excedente)
 */
export function calcularAtrasos(
  horariosReais: HorariosDia,
  horariosPrevistos: HorariosDia
): number {
  const TOLERANCIA = 5; // minutos
  let minutosTotal = 0;

  // 1) ATRASO NA ENTRADA: entrou depois do previsto
  if (horariosPrevistos.entrada && horariosReais.entrada) {
    const entradaPrevista = horarioParaMinutos(horariosPrevistos.entrada);
    const entradaReal = horarioParaMinutos(horariosReais.entrada);
    const atraso = entradaReal - entradaPrevista;
    if (atraso > TOLERANCIA) {
      minutosTotal += atraso;
    }
  }

  // 2) SAÍDA ANTECIPADA PARA REFEIÇÃO: saiu antes do previsto
  if (horariosPrevistos.inicio_refeicao && horariosReais.inicio_refeicao) {
    const previsto = horarioParaMinutos(horariosPrevistos.inicio_refeicao);
    const real = horarioParaMinutos(horariosReais.inicio_refeicao);
    const antecipacao = previsto - real;
    if (antecipacao > TOLERANCIA) {
      minutosTotal += antecipacao;
    }
  }

  // 3) ATRASO NO RETORNO DA REFEIÇÃO: voltou depois do previsto
  if (horariosPrevistos.termino_refeicao && horariosReais.termino_refeicao) {
    const previsto = horarioParaMinutos(horariosPrevistos.termino_refeicao);
    const real = horarioParaMinutos(horariosReais.termino_refeicao);
    const atraso = real - previsto;
    if (atraso > TOLERANCIA) {
      minutosTotal += atraso;
    }
  }

  // 4) SAÍDA ANTECIPADA DO EXPEDIENTE: saiu antes do previsto
  if (horariosPrevistos.saida && horariosReais.saida) {
    const saidaPrevista = horarioParaMinutos(horariosPrevistos.saida);
    const saidaReal = horarioParaMinutos(horariosReais.saida);
    let antecipacao = saidaPrevista - saidaReal;
    // Ajuste para saídas que cruzam meia-noite (ex: previsto 06:00, real 23:00)
    if (antecipacao < -12 * 60) antecipacao += 24 * 60;
    if (antecipacao > TOLERANCIA) {
      minutosTotal += antecipacao;
    }
  }

  return minutosParaHorasDecimais(minutosTotal);
}

/**
 * Calcula horas noturnas (22h às 5h) - descontando intrajornada
 */
export function calcularHorasNoturnas(
  entradaMinutos: number, 
  saidaMinutos: number,
  inicioRefeicaoMinutos: number = 0,
  terminoRefeicaoMinutos: number = 0
): number {
  const inicioNoturno = 22 * 60; // 22:00
  const fimNoturno = 5 * 60; // 05:00
  
  let minutosNoturnos = 0;

  // Caso 1: Trabalha durante a noite (ex: 20h às 6h)
  if (entradaMinutos < saidaMinutos) {
    // Período noturno: 22h-24h
    if (saidaMinutos > inicioNoturno) {
      const inicio = Math.max(entradaMinutos, inicioNoturno);
      minutosNoturnos += Math.min(saidaMinutos, 24 * 60) - inicio;
    }
    // Período noturno: 0h-5h
    if (entradaMinutos < fimNoturno) {
      const fim = Math.min(saidaMinutos, fimNoturno);
      minutosNoturnos += fim - Math.max(entradaMinutos, 0);
    }
  } else {
    // Caso 2: Passa da meia-noite (ex: 22h às 6h do dia seguinte)
    // Das 22h até meia-noite
    if (entradaMinutos >= inicioNoturno) {
      minutosNoturnos += (24 * 60) - entradaMinutos;
    } else if (entradaMinutos < inicioNoturno) {
      minutosNoturnos += (24 * 60) - inicioNoturno;
    }
    // Da meia-noite até 5h ou até a saída
    minutosNoturnos += Math.min(saidaMinutos, fimNoturno);
  }

  // Descontar intrajornada se houver e estiver no período noturno
  if (inicioRefeicaoMinutos && terminoRefeicaoMinutos && terminoRefeicaoMinutos > inicioRefeicaoMinutos) {
    // Verificar se a refeição está no período noturno
    let minutosRefeicaoNoturna = 0;
    
    // Refeição entre 22h-24h
    if (inicioRefeicaoMinutos >= inicioNoturno && inicioRefeicaoMinutos < 24 * 60) {
      const fimRefeicaoAjustado = Math.min(terminoRefeicaoMinutos, 24 * 60);
      minutosRefeicaoNoturna += fimRefeicaoAjustado - inicioRefeicaoMinutos;
    }
    
    // Refeição entre 0h-5h
    if (terminoRefeicaoMinutos <= fimNoturno && terminoRefeicaoMinutos > 0) {
      const inicioRefeicaoAjustado = Math.max(inicioRefeicaoMinutos, 0);
      if (inicioRefeicaoAjustado < fimNoturno) {
        minutosRefeicaoNoturna += terminoRefeicaoMinutos - inicioRefeicaoAjustado;
      }
    }
    
    // Se a refeição cruza a meia-noite (ex: 23:00-01:00)
    if (inicioRefeicaoMinutos > terminoRefeicaoMinutos) {
      // Parte antes da meia-noite (23:00-24:00)
      if (inicioRefeicaoMinutos >= inicioNoturno) {
        minutosRefeicaoNoturna += (24 * 60) - inicioRefeicaoMinutos;
      }
      // Parte depois da meia-noite (00:00-01:00)
      if (terminoRefeicaoMinutos <= fimNoturno) {
        minutosRefeicaoNoturna += terminoRefeicaoMinutos;
      }
    }
    
    minutosNoturnos -= minutosRefeicaoNoturna;
  }

  // Garantir que não seja negativo
  minutosNoturnos = Math.max(0, minutosNoturnos);

  return minutosParaHorasDecimais(minutosNoturnos);
}

/**
 * Calcula totais do mês
 * @param dadosDias - Dados dos dias do mês
 * @param cargoNome - (Opcional) Mantido por compatibilidade. NÃO mais usado para FT automático,
 *                    pois FT agora é EXCLUSIVAMENTE manual (campo `ft_manual` em cada dia).
 */
export function calcularTotaisMes(dadosDias: any, cargoNome: string = ''): {
  total_horas_normais: number;
  total_horas_extras_50: number;
  total_horas_extras_100: number;
  total_horas_noturnas: number;
  total_intrajornada_50: number;
  total_intrajornada_100: number;
  total_faltas_justificadas: number;
  total_faltas_injustificadas: number;
  total_suspensoes: number; // NOVO: Total de dias de suspensão
  total_atrasos: number;
  
  // === TOTAIS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
  total_decimo_terceiro_proporcional_rescisao: number;
  total_ferias_proporcionais_rescisao: number;
  total_um_terco_ferias_proporcional_rescisao: number;
  total_plr_proporcional_rescisao: number;
  total_decimo_terceiro_vantagens_rescisao: number;
  
  // === TOTAIS NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
  total_decimo_terceiro_primeira_parcela: number;
  total_decimo_terceiro_vantagens_primeira_parcela: number;
  total_decimo_terceiro_segunda_parcela: number;
  total_decimo_terceiro_vantagens_segunda_parcela: number;
  total_folga_trabalhada: number;
  
  // === TOTAIS SERVIÇOS EXTERNOS E REEMBOLSOS ===
  total_servicos_externos_folhas_pagamento: number;
  total_servicos_externos_controle_rondas: number;
  total_reembolsos_uber: number;
  
  // === FOLGAS TRABALHADAS (4h ou mais) ===
  folgas_trabalhadas: number;
} {
  const totais = {
    total_horas_normais: 0,
    total_horas_extras_50: 0,
    total_horas_extras_100: 0,
    total_horas_noturnas: 0,
    total_intrajornada_50: 0,
    total_intrajornada_100: 0,
    total_faltas_justificadas: 0,
    total_faltas_injustificadas: 0,
    total_suspensoes: 0, // NOVO: Total de dias de suspensão
    total_atrasos: 0,
    
    // === TOTAIS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
    total_decimo_terceiro_proporcional_rescisao: 0,
    total_ferias_proporcionais_rescisao: 0,
    total_um_terco_ferias_proporcional_rescisao: 0,
    total_plr_proporcional_rescisao: 0,
    total_decimo_terceiro_vantagens_rescisao: 0,
    
    // === TOTAIS NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
    total_decimo_terceiro_primeira_parcela: 0,
    total_decimo_terceiro_vantagens_primeira_parcela: 0,
    total_decimo_terceiro_segunda_parcela: 0,
    total_decimo_terceiro_vantagens_segunda_parcela: 0,
    total_folga_trabalhada: 0,
    
    // === TOTAIS SERVIÇOS EXTERNOS E REEMBOLSOS ===
    total_servicos_externos_folhas_pagamento: 0,
    total_servicos_externos_controle_rondas: 0,
    total_reembolsos_uber: 0,
    
    // === FOLGAS TRABALHADAS (4h ou mais) ===
    folgas_trabalhadas: 0
  };

  Object.keys(dadosDias).forEach(diaKey => {
    const dia = dadosDias[diaKey];

    // ⭐ NOVA REGRA FT: Quando o dia é marcado como FT (ft_manual=true),
    //    o pagamento é INTEGRAL via diária fixa (R$200 Vigia/Aux. Limpeza, R$250 Zelador),
    //    que JÁ inclui horas extras, adicional noturno, intrajornada, DSR, VT e VA daquele dia.
    //    Portanto NÃO somamos horas/proventos do dia para evitar pagamento em dobro.
    //    Apenas contabilizamos a quantidade de FTs (folgas_trabalhadas) para gerar o benefício.
    const isFT = dia.ft_manual === true;

    if (dia.calculo && !isFT) {
      totais.total_horas_normais += dia.calculo.horas_normais || 0;
      totais.total_horas_extras_50 += dia.calculo.horas_extras_50 || 0;
      totais.total_horas_extras_100 += dia.calculo.horas_extras_100 || 0;
      totais.total_horas_noturnas += dia.calculo.horas_noturnas || 0;
      totais.total_intrajornada_50 += dia.calculo.intrajornada_50 || 0;
      totais.total_intrajornada_100 += dia.calculo.intrajornada_100 || 0;
      totais.total_atrasos += dia.calculo.atrasos || 0;
    }

    // ⭐ Eventos excepcionais e serviços externos são proventos pontuais
    //    independentes da FT — somam mesmo se o dia for FT.
    if (dia.calculo) {
      // === SOMAR EVENTOS EXCEPCIONAIS (PROVENTOS) ===
      totais.total_decimo_terceiro_proporcional_rescisao += dia.calculo.decimo_terceiro_proporcional_rescisao || 0;
      totais.total_ferias_proporcionais_rescisao += dia.calculo.ferias_proporcionais_rescisao || 0;
      totais.total_um_terco_ferias_proporcional_rescisao += dia.calculo.um_terco_ferias_proporcional_rescisao || 0;
      totais.total_plr_proporcional_rescisao += dia.calculo.plr_proporcional_rescisao || 0;
      totais.total_decimo_terceiro_vantagens_rescisao += dia.calculo.decimo_terceiro_vantagens_rescisao || 0;

      // === SOMAR NOVOS EVENTOS EXCEPCIONAIS (PROVENTOS) ===
      totais.total_decimo_terceiro_primeira_parcela += dia.calculo.decimo_terceiro_primeira_parcela || 0;
      totais.total_decimo_terceiro_vantagens_primeira_parcela += dia.calculo.decimo_terceiro_vantagens_primeira_parcela || 0;
      totais.total_decimo_terceiro_segunda_parcela += dia.calculo.decimo_terceiro_segunda_parcela || 0;
      totais.total_decimo_terceiro_vantagens_segunda_parcela += dia.calculo.decimo_terceiro_vantagens_segunda_parcela || 0;
      totais.total_folga_trabalhada += dia.calculo.folga_trabalhada || 0;

      // === SOMAR SERVIÇOS EXTERNOS E REEMBOLSOS ===
      totais.total_servicos_externos_folhas_pagamento += dia.calculo.servicos_externos_folhas_pagamento || 0;
      totais.total_servicos_externos_controle_rondas += dia.calculo.servicos_externos_controle_rondas || 0;
      totais.total_reembolsos_uber += dia.calculo.reembolsos_uber || 0;
    }

    // === CONTAR FOLGAS TRABALHADAS (FT) - APENAS MANUAL ===
    // ⭐ NOVA REGRA: FT (Folga Trabalhada) é EXCLUSIVAMENTE marcada manualmente
    //    pelo usuário através do campo `ft_manual` em cada linha da folha de ponto.
    //    Não há mais detecção automática (horas extras >= 4h).
    //    O valor monetário da FT é calculado em calcularFolhaPagamento.ts buscando
    //    o valor diário da função (Vigia/Aux. Limpeza/Zelador) na tabela de apoio.
    if (dia.ft_manual === true) {
      totais.folgas_trabalhadas += 1;
    }

    if (dia.atestado || dia.falta_justificada) {
      totais.total_faltas_justificadas += 1;
    }
    
    if (dia.falta_injustificada) {
      totais.total_faltas_injustificadas += 1;
    }
    
    // NOVO: Contar suspensões
    if (dia.suspensao) {
      totais.total_suspensoes += 1;
    }
  });

  // Arredondar para 2 casas decimais
  Object.keys(totais).forEach(key => {
    if (key.startsWith('total_horas') || 
        key.startsWith('total_intrajornada') || 
        key === 'total_atrasos' ||
        key.startsWith('total_decimo') ||
        key.startsWith('total_ferias') ||
        key.startsWith('total_um_terco') ||
        key.startsWith('total_plr')) {
      totais[key as keyof typeof totais] = Number(totais[key as keyof typeof totais].toFixed(2));
    }
  });

  return totais;
}

/**
 * Define valores dos eventos excepcionais (proventos) para um funcionário
 */
export function definirEventosExcepcionais(
  dadosDias: any,
  diaKey: string,
  eventos: {
    decimo_terceiro_proporcional_rescisao?: number;
    ferias_proporcionais_rescisao?: number;
    um_terco_ferias_proporcional_rescisao?: number;
    plr_proporcional_rescisao?: number;
    decimo_terceiro_vantagens_rescisao?: number;
    
    // === NOVOS EVENTOS EXCEPCIONAIS ===
    decimo_terceiro_primeira_parcela?: number;
    decimo_terceiro_vantagens_primeira_parcela?: number;
    decimo_terceiro_segunda_parcela?: number;
    decimo_terceiro_vantagens_segunda_parcela?: number;
    folga_trabalhada?: number;
    
    // === SERVIÇOS EXTERNOS E REEMBOLSOS ===
    servicos_externos_folhas_pagamento?: number;
    servicos_externos_controle_rondas?: number;
    reembolsos_uber?: number;
  }
): void {
  if (!dadosDias[diaKey] || !dadosDias[diaKey].calculo) {
    return;
  }
  
  // Atualizar os valores dos eventos excepcionais
  if (eventos.decimo_terceiro_proporcional_rescisao !== undefined) {
    dadosDias[diaKey].calculo.decimo_terceiro_proporcional_rescisao = eventos.decimo_terceiro_proporcional_rescisao;
  }
  
  if (eventos.ferias_proporcionais_rescisao !== undefined) {
    dadosDias[diaKey].calculo.ferias_proporcionais_rescisao = eventos.ferias_proporcionais_rescisao;
  }
  
  if (eventos.um_terco_ferias_proporcional_rescisao !== undefined) {
    dadosDias[diaKey].calculo.um_terco_ferias_proporcional_rescisao = eventos.um_terco_ferias_proporcional_rescisao;
  }
  
  if (eventos.plr_proporcional_rescisao !== undefined) {
    dadosDias[diaKey].calculo.plr_proporcional_rescisao = eventos.plr_proporcional_rescisao;
  }
  
  if (eventos.decimo_terceiro_vantagens_rescisao !== undefined) {
    dadosDias[diaKey].calculo.decimo_terceiro_vantagens_rescisao = eventos.decimo_terceiro_vantagens_rescisao;
  }
  
  // === NOVOS EVENTOS EXCEPCIONAIS ===
  if (eventos.decimo_terceiro_primeira_parcela !== undefined) {
    dadosDias[diaKey].calculo.decimo_terceiro_primeira_parcela = eventos.decimo_terceiro_primeira_parcela;
  }
  
  if (eventos.decimo_terceiro_vantagens_primeira_parcela !== undefined) {
    dadosDias[diaKey].calculo.decimo_terceiro_vantagens_primeira_parcela = eventos.decimo_terceiro_vantagens_primeira_parcela;
  }
  
  if (eventos.decimo_terceiro_segunda_parcela !== undefined) {
    dadosDias[diaKey].calculo.decimo_terceiro_segunda_parcela = eventos.decimo_terceiro_segunda_parcela;
  }
  
  if (eventos.decimo_terceiro_vantagens_segunda_parcela !== undefined) {
    dadosDias[diaKey].calculo.decimo_terceiro_vantagens_segunda_parcela = eventos.decimo_terceiro_vantagens_segunda_parcela;
  }
  
  if (eventos.folga_trabalhada !== undefined) {
    dadosDias[diaKey].calculo.folga_trabalhada = eventos.folga_trabalhada;
  }
  
  // === SERVIÇOS EXTERNOS E REEMBOLSOS ===
  if (eventos.servicos_externos_folhas_pagamento !== undefined) {
    dadosDias[diaKey].calculo.servicos_externos_folhas_pagamento = eventos.servicos_externos_folhas_pagamento;
  }
  
  if (eventos.servicos_externos_controle_rondas !== undefined) {
    dadosDias[diaKey].calculo.servicos_externos_controle_rondas = eventos.servicos_externos_controle_rondas;
  }
  
  if (eventos.reembolsos_uber !== undefined) {
    dadosDias[diaKey].calculo.reembolsos_uber = eventos.reembolsos_uber;
  }
}

/**
 * Calcula o salário bruto incluindo eventos excepcionais
 */
export function calcularSalarioBruto(
  salarioBase: number,
  totais: ReturnType<typeof calcularTotaisMes>,
  valorHoraNormal: number = 0,
  valorHoraExtra50: number = 0,
  valorHoraExtra100: number = 0,
  valorHoraNoturna: number = 0,
  valorIntrajornada50: number = 0,
  valorIntrajornada100: number = 0
): {
  salario_base: number;
  valor_horas_normais: number;
  valor_horas_extras_50: number;
  valor_horas_extras_100: number;
  valor_horas_noturnas: number;
  valor_intrajornada_50: number;
  valor_intrajornada_100: number;
  valor_eventos_excepcionais: number;
  salario_bruto: number;
} {
  const valorHorasNormais = totais.total_horas_normais * valorHoraNormal;
  const valorHorasExtras50 = totais.total_horas_extras_50 * valorHoraExtra50;
  const valorHorasExtras100 = totais.total_horas_extras_100 * valorHoraExtra100;
  const valorHorasNoturnas = totais.total_horas_noturnas * valorHoraNoturna;
  const valorTotalIntrajornada50 = totais.total_intrajornada_50 * valorIntrajornada50;
  const valorTotalIntrajornada100 = totais.total_intrajornada_100 * valorIntrajornada100;
  
  // Somar todos os eventos excepcionais
  const valorEventosExcepcionais = 
    totais.total_decimo_terceiro_proporcional_rescisao +
    totais.total_ferias_proporcionais_rescisao +
    totais.total_um_terco_ferias_proporcional_rescisao +
    totais.total_plr_proporcional_rescisao +
    totais.total_decimo_terceiro_vantagens_rescisao +
    // === NOVOS EVENTOS EXCEPCIONAIS ===
    totais.total_decimo_terceiro_primeira_parcela +
    totais.total_decimo_terceiro_vantagens_primeira_parcela +
    totais.total_decimo_terceiro_segunda_parcela +
    totais.total_decimo_terceiro_vantagens_segunda_parcela +
    totais.total_folga_trabalhada +
    // === SERVIÇOS EXTERNOS (PROVENTOS) ===
    totais.total_servicos_externos_folhas_pagamento +
    totais.total_servicos_externos_controle_rondas;
    // Nota: reembolsos_uber é benefício, não provento, então não entra aqui
  
  const salarioBruto = 
    salarioBase +
    valorHorasNormais +
    valorHorasExtras50 +
    valorHorasExtras100 +
    valorHorasNoturnas +
    valorTotalIntrajornada50 +
    valorTotalIntrajornada100 +
    valorEventosExcepcionais;
  
  return {
    salario_base: salarioBase,
    valor_horas_normais: valorHorasNormais,
    valor_horas_extras_50: valorHorasExtras50,
    valor_horas_extras_100: valorHorasExtras100,
    valor_horas_noturnas: valorHorasNoturnas,
    valor_intrajornada_50: valorTotalIntrajornada50,
    valor_intrajornada_100: valorTotalIntrajornada100,
    valor_eventos_excepcionais: valorEventosExcepcionais,
    salario_bruto: Number(salarioBruto.toFixed(2))
  };
}

/**
 * Valida horários de um dia
 */
export function validarHorarios(horarios: HorariosDia): string[] {
  const erros: string[] = [];

  if (!horarios.entrada || !horarios.saida) {
    return erros; // Sem horários é válido (folga/feriado)
  }

  const entrada = horarioParaMinutos(horarios.entrada);
  const saida = horarioParaMinutos(horarios.saida);
  const inicioRefeicao = horarioParaMinutos(horarios.inicio_refeicao);
  const terminoRefeicao = horarioParaMinutos(horarios.termino_refeicao);

  // Validar entrada < saída (considerando virada de dia)
  if (entrada === saida) {
    erros.push('Horário de entrada igual ao de saída');
  }

  // Validar refeição
  if (inicioRefeicao && terminoRefeicao) {
    if (inicioRefeicao >= terminoRefeicao) {
      erros.push('Início da refeição deve ser antes do término');
    }
    
    // Refeição deve estar entre entrada e saída
    if (inicioRefeicao < entrada || terminoRefeicao > saida) {
      if (saida > entrada) { // Não passou da meia-noite
        erros.push('Refeição deve estar entre entrada e saída');
      }
    }
  }

  return erros;
}
