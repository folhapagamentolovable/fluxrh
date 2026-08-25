// Constantes
const DATA_INICIO_UNIVERSAL = new Date('2025-01-01');

// Tipos
export interface EscalaItem {
  cod_escala: string;
  data: Date;
  status: 'TRABALHO' | 'FOLGA';
  horario: string;
}

// Função auxiliar: Obter dia da semana (0=Segunda, 6=Domingo)
function getDiaSemana(data: Date): number {
  const dia = data.getDay();
  return dia === 0 ? 6 : dia - 1; // Converte: Dom=6, Seg=0, Ter=1...
}

// Função auxiliar: Verificar se é feriado
function isFeriado(data: Date, feriados: Date[]): boolean {
  const resultado = feriados.some(f => {
    const match = f.getFullYear() === data.getFullYear() &&
                  f.getMonth() === data.getMonth() &&
                  f.getDate() === data.getDate();
    
    if (match) {
    }
    
    return match;
  });
  
  return resultado;
}

// Função para escalas de dias alternados (1x1) - VERSÃO ATUALIZADA
function checkDiaAlternadoComEstadoInicial(
  data: Date, 
  estadoInicial01_01: 'trabalha' | 'folga' | null,
  trabalhaNodia_zero_fallback: boolean
): boolean {
  const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
  
  // Usar nova coluna estado_inicial_01_01 como fonte de verdade
  if (estadoInicial01_01 !== null) {
    const trabalhaNodia_zero = estadoInicial01_01 === 'trabalha';
    const isTrabalho = trabalhaNodia_zero 
      ? diasDecorridos % 2 === 0 
      : diasDecorridos % 2 !== 0;
    return isTrabalho;
  }
  
  // Fallback para lógica antiga (compatibilidade)
  const isTrabalho = trabalhaNodia_zero_fallback 
    ? diasDecorridos % 2 === 0 
    : diasDecorridos % 2 !== 0;
  return isTrabalho;
}

// Função para escalas de dias alternados (1x1) - VERSÃO ANTIGA (mantida para compatibilidade)
function checkDiaAlternado(data: Date, trabalhaNodia_zero: boolean): boolean {
  const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
  const isTrabalho = trabalhaNodia_zero 
    ? diasDecorridos % 2 === 0 
    : diasDecorridos % 2 !== 0;
  return isTrabalho;
}

// Função principal de geração de escala - VERSÃO ATUALIZADA
export function gerarEscalaComEstadoInicial(
  codEscala: string,
  startDate: Date,
  endDate: Date,
  estadoInicial01_01: 'trabalha' | 'folga' | null = null,
  feriados: Date[] = []
): EscalaItem[] {
  const cronograma: EscalaItem[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const diaSemana = getDiaSemana(currentDate);
    let status: 'TRABALHO' | 'FOLGA' = 'FOLGA';
    let horario = '';

    const isFeriadoHoje = isFeriado(currentDate, feriados);

    // --- Regra 1: GALVIGDIURNOT1 / GALVIGDIURNOT2 (Diurno com Intrajornada) ---
    if (['GALVIGDIURNOT1', 'GALVIGDIURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero_fallback = codEscala === 'GALVIGDIURNOT1';
      
      if (checkDiaAlternadoComEstadoInicial(currentDate, estadoInicial01_01, trabalhaNodia_zero_fallback)) {
        status = 'TRABALHO';
        if (diaSemana <= 5 && !isFeriadoHoje) { // Seg a Sáb (e não feriado)
          horario = '06:00-12:00 e 13:00-18:00 (Intrajornada 12:00-13:00)';
        } else { // Dom ou feriado
          horario = '06:00-18:00 (Sem Intrajornada - 12h corridas)';
        }
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 2: GALVIGNOTURNOT1 / GALVIGNOTURNOT2 (Noturno sem Intrajornada) ---
    else if (['GALVIGNOTURNOT1', 'GALVIGNOTURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero_fallback = codEscala === 'GALVIGNOTURNOT2';
      
      if (checkDiaAlternadoComEstadoInicial(currentDate, estadoInicial01_01, trabalhaNodia_zero_fallback)) {
        status = 'TRABALHO';
        horario = '19:00-07:00 (Sem Intrajornada)';
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 5: PALMVIGDIURNOT1 / PALMVIGDIURNOT2 (11h Corridas) ---
    else if (['PALMVIGDIURNOT1', 'PALMVIGDIURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero_fallback = codEscala === 'PALMVIGDIURNOT1';
      
      if (checkDiaAlternadoComEstadoInicial(currentDate, estadoInicial01_01, trabalhaNodia_zero_fallback)) {
        status = 'TRABALHO';
        horario = '06:00-18:00 (Sem Intrajornada - 12h corridas)';
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 6: PALMVIGNOTURNOT1 / PALMVIGNOTURNOT2 (Noturno com Intrajornada) ---
    else if (['PALMVIGNOTURNOT1', 'PALMVIGNOTURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero_fallback = codEscala === 'PALMVIGNOTURNOT1';
      
      if (checkDiaAlternadoComEstadoInicial(currentDate, estadoInicial01_01, trabalhaNodia_zero_fallback)) {
        status = 'TRABALHO';
        horario = '18:00-22:00 e 23:00-06:00 (Intrajornada 22:00-23:00)';
      } else {
        status = 'FOLGA';
      }
    }

    // Adicionar ao cronograma
    cronograma.push({
      cod_escala: codEscala,
      data: new Date(currentDate),
      status,
      horario
    });

    // Próximo dia
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return cronograma;
}

// Função principal de geração de escala - VERSÃO ANTIGA (mantida para compatibilidade)
export function gerarEscala(
  codEscala: string,
  startDate: Date,
  endDate: Date,
  feriados: Date[] = []
): EscalaItem[] {
  const cronograma: EscalaItem[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const diaSemana = getDiaSemana(currentDate);
    let status: 'TRABALHO' | 'FOLGA' = 'FOLGA';
    let horario = '-';
    
    
    const isFeriadoHoje = isFeriado(currentDate, feriados);
    
    // Debug para feriados
    if (isFeriadoHoje) {
    }

    // --- Regra 1: GALZELADT1, GALLIMPT1, FIGZELADT1 ---
    if (['GALZELADT1', 'GALLIMPT1', 'FIGZELADT1'].includes(codEscala)) {
      // Verifica feriado e domingo PRIMEIRO
      if (diaSemana === 6 || isFeriadoHoje) { // Domingo ou Feriado
        status = 'FOLGA';
        horario = '-';
      } else if (diaSemana <= 4) { // Segunda a Sexta
        status = 'TRABALHO';
        horario = '08:00-12:00 e 13:00-17:00 (Intrajornada)';
      } else if (diaSemana === 5) { // Sábado
        status = 'TRABALHO';
        horario = '08:00-12:00 (Sem Intrajornada)';
      }
    }

    // --- Regra 2: GALVIGDIURNOT1 / GALVIGDIURNOT2 (Dia Sim/Dia Não - Diurno) ---
    else if (['GALVIGDIURNOT1', 'GALVIGDIURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero = codEscala === 'GALVIGDIURNOT1';
      
      if (checkDiaAlternado(currentDate, trabalhaNodia_zero)) {
        status = 'TRABALHO';
        if (diaSemana <= 5 && !isFeriadoHoje) { // Seg a Sáb (e não feriado)
          horario = '07:00-12:00 e 13:00-17:00 (Intrajornada)';
        } else { // Domingo ou Feriado
          horario = '07:00-17:00 (Sem Intrajornada)';
        }
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 3: GALVIGNOTURNOT1 / GALVIGNOTURNOT2 (Dia Sim/Dia Não - Noturno) ---
    else if (['GALVIGNOTURNOT1', 'GALVIGNOTURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero = codEscala === 'GALVIGNOTURNOT2';
      
      if (checkDiaAlternado(currentDate, trabalhaNodia_zero)) {
        status = 'TRABALHO';
        horario = '19:00-07:00 (Sem Intrajornada)';
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 4: PALMLIMPT1 / PALMLIMPT2 (Sábados Alternados) ---
    else if (['PALMLIMPT1', 'PALMLIMPT2'].includes(codEscala)) {
      // Verifica feriado e domingo PRIMEIRO
      if (diaSemana === 6 || isFeriadoHoje) { // Domingo ou Feriado
        status = 'FOLGA';
        horario = '-';
      } else if (diaSemana <= 4) { // Segunda a Sexta
        status = 'TRABALHO';
        horario = '08:00-12:00 e 13:00-17:00 (Intrajornada)';
      } else if (diaSemana === 5) { // Sábado
        const primeiroSabado = new Date('2025-01-04');
        const numSabado = Math.floor((currentDate.getTime() - primeiroSabado.getTime()) / (1000 * 60 * 60 * 24 * 7));
        
        if ((codEscala === 'PALMLIMPT1' && numSabado % 2 === 0) ||
            (codEscala === 'PALMLIMPT2' && numSabado % 2 !== 0)) {
          status = 'TRABALHO';
          horario = '08:00-12:00 (Sem Intrajornada)';
        } else {
          status = 'FOLGA';
        }
      }
    }

    // --- Regra 5: PALMVIGDIURNOT1 / PALMVIGDIURNOT2 (11h Corridas) ---
    else if (['PALMVIGDIURNOT1', 'PALMVIGDIURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero = codEscala === 'PALMVIGDIURNOT1';
      
      if (checkDiaAlternado(currentDate, trabalhaNodia_zero)) {
        status = 'TRABALHO';
        horario = '06:00-18:00 (Sem Intrajornada - 12h corridas)';
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 6: PALMVIGNOTURNOT1 / PALMVIGNOTURNOT2 (Noturno com Intrajornada) ---
    else if (['PALMVIGNOTURNOT1', 'PALMVIGNOTURNOT2'].includes(codEscala)) {
      const trabalhaNodia_zero = codEscala === 'PALMVIGNOTURNOT1';
      
      if (checkDiaAlternado(currentDate, trabalhaNodia_zero)) {
        status = 'TRABALHO';
        horario = '18:00-22:00 e 23:00-06:00 (Intrajornada 22:00-23:00)';
      } else {
        status = 'FOLGA';
      }
    }

    // --- Regra 7: FIGLIMPT1 / FIGLIMPT2 (Figueiras Limpeza) ---
    else if (['FIGLIMPT1', 'FIGLIMPT2'].includes(codEscala)) {
      // Verifica feriado e domingo PRIMEIRO
      if (diaSemana === 6 || isFeriadoHoje) { // Domingo ou Feriado
        status = 'FOLGA';
        horario = '-';
      } else if (diaSemana <= 3) { // Segunda a Quinta
        status = 'TRABALHO';
        horario = '08:00-12:00 e 13:00-17:00 (Intrajornada)';
      } else if (diaSemana === 4) { // Sexta
        status = 'TRABALHO';
        horario = '08:00-12:00 e 13:00-17:00 (Intrajornada)';
      } else if (diaSemana === 5) { // Sábado
        const primeiroSabado = new Date('2025-01-04');
        const numSabado = Math.floor((currentDate.getTime() - primeiroSabado.getTime()) / (1000 * 60 * 60 * 24 * 7));
        
        if ((codEscala === 'FIGLIMPT1' && numSabado % 2 === 0) ||
            (codEscala === 'FIGLIMPT2' && numSabado % 2 !== 0)) {
          status = 'TRABALHO';
          horario = '08:00-12:00 (Sem Intrajornada)';
        } else {
          status = 'FOLGA';
        }
      }
    }

    cronograma.push({
      cod_escala: codEscala,
      data: new Date(currentDate),
      status,
      horario
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return cronograma;
}

// Função auxiliar para buscar feriados do Supabase
export async function buscarFeriados(supabase: any, ano: number): Promise<Date[]> {
  const { data, error } = await supabase
    .from('feriados')
    .select('data_feriado')
    .gte('data_feriado', `${ano}-01-01`)
    .lte('data_feriado', `${ano}-12-31`);

  if (error) {
    return [];
  }

  const feriadosProcessados = (data || []).map((f: any) => {
    const dataFeriado = new Date(f.data_feriado + 'T00:00:00');
    return dataFeriado;
  });
  
  return feriadosProcessados;
}
