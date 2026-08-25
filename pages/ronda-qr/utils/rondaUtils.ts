/**
 * Ronda QR - Utility functions for patrol cycle management
 */

export interface CicloInfo {
  numero: number;
  horaInicio: string; // "19:00", "20:00", etc.
  horaInicioDate: Date;
  horaFimDate: Date;
  emPausa?: boolean; // true if this cycle falls entirely within a pause
}

export interface PontoGrade {
  ordem: number;
  pontoId: string;
  pontoNome: string;
  pontoCodigo: string;
  horarioIdeal: Date;
  horarioMinimo: Date;
  horarioMaximo: Date;
}

export interface GradeHoraria {
  ciclo: CicloInfo;
  pontos: PontoGrade[];
  duracaoTotalMinutos: number;
  viavel: boolean;
}

export interface PausaConfig {
  inicio: string; // "22:00"
  fim: string;    // "23:00"
  descricao: string;
}

/**
 * Default meal break pauses
 */
export const PAUSAS_PADRAO: PausaConfig[] = [
  { inicio: '22:00', fim: '23:00', descricao: 'Refeição (22:00 às 23:00)' },
  { inicio: '00:30', fim: '01:30', descricao: 'Refeição (00:30 às 01:30)' },
];

/**
 * Convert "HH:MM" to a Date object on the given patrol date
 */
function parseHoraParaDate(hora: string, dataTurno: Date): Date {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(dataTurno);
  if (h >= 19) {
    d.setHours(h, m, 0, 0);
  } else {
    // Next day for hours 0-18
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/**
 * Check if a given time falls within any pause interval
 */
export function estaDurantePausa(horario: Date, dataTurno: Date, pausas: PausaConfig[] = PAUSAS_PADRAO): PausaConfig | null {
  for (const pausa of pausas) {
    const inicio = parseHoraParaDate(pausa.inicio, dataTurno);
    const fim = parseHoraParaDate(pausa.fim, dataTurno);
    if (horario >= inicio && horario < fim) {
      return pausa;
    }
  }
  return null;
}

/**
 * Get the pause that is approaching (within X minutes from now)
 */
export function getPausaProxima(
  agora: Date,
  dataTurno: Date,
  minutosAntes: number = 5,
  pausas: PausaConfig[] = PAUSAS_PADRAO
): { pausa: PausaConfig; minutosRestantes: number; inicioPausa: Date } | null {
  for (const pausa of pausas) {
    const inicio = parseHoraParaDate(pausa.inicio, dataTurno);
    const diffMs = inicio.getTime() - agora.getTime();
    const diffMin = diffMs / 60000;
    if (diffMin > 0 && diffMin <= minutosAntes) {
      return { pausa, minutosRestantes: Math.ceil(diffMin), inicioPausa: inicio };
    }
  }
  return null;
}

/**
 * Get the current active pause, if any
 */
export function getPausaAtual(agora: Date, dataTurno: Date, pausas: PausaConfig[] = PAUSAS_PADRAO): { pausa: PausaConfig; fimPausa: Date } | null {
  for (const pausa of pausas) {
    const inicio = parseHoraParaDate(pausa.inicio, dataTurno);
    const fim = parseHoraParaDate(pausa.fim, dataTurno);
    if (agora >= inicio && agora < fim) {
      return { pausa, fimPausa: fim };
    }
  }
  return null;
}

/**
 * Generate patrol cycles from 19:00 to 06:00
 * Cycles are structured around meal breaks:
 *   - 19:00-20:00, 20:00-21:00, 21:00-22:00 (work)
 *   - 22:00-23:00 (PAUSA refeição)
 *   - 23:00-00:00 (work)
 *   - 00:00-00:30 (work - half cycle before pause)
 *   - 00:30-01:30 (PAUSA refeição)
 *   - 01:30-02:30, 02:30-03:30, 03:30-04:30 (work)
 *   - 04:30-05:00 (work - half cycle)
 *   - 05:00-06:00 (work)
 */
export function gerarCiclosTurno(dataTurno: Date, pausas: PausaConfig[] = PAUSAS_PADRAO): CicloInfo[] {
  // Define cycle slots as [hourStart, minuteStart, hourEnd, minuteEnd, isPause]
  const slots: Array<{ h1: number; m1: number; h2: number; m2: number; pausa: boolean; label: string }> = [
    { h1: 19, m1: 0,  h2: 20, m2: 0,  pausa: false, label: '19:00' },
    { h1: 20, m1: 0,  h2: 21, m2: 0,  pausa: false, label: '20:00' },
    { h1: 21, m1: 0,  h2: 22, m2: 0,  pausa: false, label: '21:00' },
    { h1: 22, m1: 0,  h2: 23, m2: 0,  pausa: true,  label: '22:00' }, // Refeição
    { h1: 23, m1: 0,  h2: 0,  m2: 0,  pausa: false, label: '23:00' },
    { h1: 0,  m1: 0,  h2: 0,  m2: 30, pausa: false, label: '00:00' },
    { h1: 0,  m1: 30, h2: 1,  m2: 30, pausa: true,  label: '00:30' }, // Refeição
    { h1: 1,  m1: 30, h2: 2,  m2: 30, pausa: false, label: '01:30' },
    { h1: 2,  m1: 30, h2: 3,  m2: 30, pausa: false, label: '02:30' },
    { h1: 3,  m1: 30, h2: 4,  m2: 30, pausa: false, label: '03:30' },
    { h1: 4,  m1: 30, h2: 5,  m2: 0,  pausa: false, label: '04:30' },
    { h1: 5,  m1: 0,  h2: 6,  m2: 0,  pausa: false, label: '05:00' },
  ];

  function makeDate(h: number, m: number): Date {
    const d = new Date(dataTurno);
    if (h >= 19) {
      d.setHours(h, m, 0, 0);
    } else {
      d.setDate(d.getDate() + 1);
      d.setHours(h, m, 0, 0);
    }
    return d;
  }

  return slots.map((slot, index) => ({
    numero: index + 1,
    horaInicio: slot.label,
    horaInicioDate: makeDate(slot.h1, slot.m1),
    horaFimDate: makeDate(slot.h2, slot.m2),
    emPausa: slot.pausa,
  }));
}

/**
 * Calculate the expected time schedule for a cycle
 * QR0 (start) → point1 → point2 → ... → QR0 (end)
 */
export function calcularGradeHoraria(
  ciclo: CicloInfo,
  pontos: Array<{ id: string; nome: string; codigo: string; ordem: number }>,
  intervaloMinutos: number = 7,
  toleranciaMinutos: number = 3
): GradeHoraria {
  const gradepontos: PontoGrade[] = [];
  const pontoInicial = pontos.find(p => p.ordem === 0);
  const pontosOrdenados = [...pontos].sort((a, b) => a.ordem - b.ordem);
  
  // Total points including return to QR0: all points + 1 (return)
  const totalPassagens = pontosOrdenados.length + 1; // +1 for return to QR0
  const duracaoTotalMinutos = (totalPassagens - 1) * intervaloMinutos;
  
  pontosOrdenados.forEach((ponto, index) => {
    const ideal = new Date(ciclo.horaInicioDate);
    ideal.setMinutes(ideal.getMinutes() + index * intervaloMinutos);
    
    const minimo = new Date(ideal);
    minimo.setMinutes(minimo.getMinutes() - toleranciaMinutos);
    
    const maximo = new Date(ideal);
    maximo.setMinutes(maximo.getMinutes() + toleranciaMinutos);
    
    gradepontos.push({
      ordem: ponto.ordem,
      pontoId: ponto.id,
      pontoNome: ponto.nome,
      pontoCodigo: ponto.codigo,
      horarioIdeal: ideal,
      horarioMinimo: minimo,
      horarioMaximo: maximo,
    });
  });
  
  // Add return to QR0
  if (pontoInicial) {
    const idealRetorno = new Date(ciclo.horaInicioDate);
    idealRetorno.setMinutes(idealRetorno.getMinutes() + pontosOrdenados.length * intervaloMinutos);
    
    const minimoRetorno = new Date(idealRetorno);
    minimoRetorno.setMinutes(minimoRetorno.getMinutes() - toleranciaMinutos);
    
    const maximoRetorno = new Date(idealRetorno);
    maximoRetorno.setMinutes(maximoRetorno.getMinutes() + toleranciaMinutos);
    
    gradepontos.push({
      ordem: 999, // Return marker
      pontoId: pontoInicial.id,
      pontoNome: `${pontoInicial.nome} (Retorno)`,
      pontoCodigo: pontoInicial.codigo,
      horarioIdeal: idealRetorno,
      horarioMinimo: minimoRetorno,
      horarioMaximo: maximoRetorno,
    });
  }
  
  return {
    ciclo,
    pontos: gradepontos,
    duracaoTotalMinutos,
    viavel: duracaoTotalMinutos <= 60,
  };
}

/**
 * Determine reading status based on time comparison
 */
export function determinarStatusLeitura(
  horarioLeitura: Date,
  horarioPrevisto: Date,
  toleranciaMinutos: number = 3
): 'no_prazo' | 'adiantado' | 'atrasado' {
  const diffMs = horarioLeitura.getTime() - horarioPrevisto.getTime();
  const diffMin = diffMs / 60000;
  
  if (Math.abs(diffMin) <= toleranciaMinutos) return 'no_prazo';
  if (diffMin < 0) return 'adiantado';
  return 'atrasado';
}

/**
 * Resolve the effective shift date for a given moment.
 * The night shift runs 19:00 -> 06:00 of the next calendar day.
 * If `agora` is before 06:00, the shift actually started YESTERDAY.
 */
export function resolverDataTurno(agora: Date = new Date()): Date {
  const d = new Date(agora);
  if (agora.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get current active cycle based on current time.
 * Accepts an optional reference time to avoid drift between renders.
 */
export function getCicloAtual(dataTurno?: Date, agora: Date = new Date()): CicloInfo | null {
  const turnoEfetivo = dataTurno ?? resolverDataTurno(agora);
  const ciclos = gerarCiclosTurno(turnoEfetivo);
  
  for (const ciclo of ciclos) {
    if (agora >= ciclo.horaInicioDate && agora < ciclo.horaFimDate) {
      return ciclo;
    }
  }
  
  return null;
}

/**
 * Format time for display
 */
export function formatarHora(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format time with seconds
 */
export function formatarHoraCompleta(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'no_prazo': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'adiantado': return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
    case 'atrasado': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'fora_de_ordem': return 'text-red-700 bg-red-200 dark:text-red-300 dark:bg-red-900/40';
    case 'nao_realizado': return 'text-gray-500 bg-gray-200 dark:text-gray-400 dark:bg-gray-700';
    case 'em_andamento': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'concluida': return 'text-green-700 bg-green-200 dark:text-green-300 dark:bg-green-900/40';
    case 'pendente': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    case 'incompleta': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    case 'pausa': return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    no_prazo: 'No Prazo',
    adiantado: 'Adiantado',
    atrasado: 'Atrasado',
    fora_de_ordem: 'Fora de Ordem',
    nao_realizado: 'Não Realizado',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    pendente: 'Pendente',
    incompleta: 'Incompleta',
    nao_realizada: 'Não Realizada',
    invalido: 'Inválido',
    pausa: 'Em Pausa',
  };
  return labels[status] || status;
}
