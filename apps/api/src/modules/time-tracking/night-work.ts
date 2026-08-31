const MINUTE = 60_000;
const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export type WorkInterval = { start: string; end: string };

const overlapMinutes = (start: Date, end: Date, windowStart: Date, windowEnd: Date) =>
  Math.max(0, (Math.min(end.getTime(), windowEnd.getTime()) - Math.max(start.getTime(), windowStart.getTime())) / MINUTE);

/** Calcula a duração prevista, inclusive quando a escala termina no dia seguinte. */
export function scheduledWorkMinutes(startTime: string, endTime: string, breakMinutes: number) {
  const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  return Math.max(0, end - start - breakMinutes);
}

/**
 * Converte o trabalho urbano entre 22h e 5h em horas de 52m30s e separa
 * a prorrogação diurna após as 5h. Os intervalos recebidos já excluem pausas.
 */
export function calculateNightWork(intervals: WorkInterval[], utcOffsetMinutes = -180) {
  let nightClockMinutes = 0;
  let extensionMinutes = 0;

  for (const interval of intervals) {
    const parsedStart = new Date(interval.start);
    const parsedEnd = new Date(interval.end);
    const start = new Date(parsedStart.getTime() + utcOffsetMinutes * MINUTE);
    const end = new Date(parsedEnd.getTime() + utcOffsetMinutes * MINUTE);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) continue;

    const firstDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - 1));
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    for (let day = new Date(firstDay); day <= lastDay; day.setUTCDate(day.getUTCDate() + 1)) {
      const nightStart = new Date(day);
      nightStart.setUTCHours(22, 0, 0, 0);
      const nightEnd = new Date(day);
      nightEnd.setUTCDate(nightEnd.getUTCDate() + 1);
      nightEnd.setUTCHours(5, 0, 0, 0);
      const nightOverlap = overlapMinutes(start, end, nightStart, nightEnd);
      nightClockMinutes += nightOverlap;

      // A extensão só é reconhecida quando o mesmo trecho laborado atravessa 5h.
      if (nightOverlap > 0 && start < nightEnd && end > nightEnd)
        extensionMinutes += Math.max(0, (end.getTime() - nightEnd.getTime()) / MINUTE);
    }
  }

  const reducedNightHours = nightClockMinutes / 52.5;
  const extensionHours = extensionMinutes / 60;
  return {
    nightClockMinutes: round(nightClockMinutes, 0),
    reducedNightHours: round(reducedNightHours, 6),
    extensionMinutes: round(extensionMinutes, 0),
    extensionHours: round(extensionHours, 6),
    payableNightHours: round(reducedNightHours + extensionHours, 6),
  };
}

export function auditNightShift(input: {
  intervals: WorkInterval[];
  monthlySalary: number;
  divisor?: number;
  additionalRate?: number;
}) {
  const divisor = input.divisor ?? 220;
  const additionalRate = input.additionalRate ?? 0.2;
  const hours = calculateNightWork(input.intervals);
  const hourlyRate = input.monthlySalary / divisor;
  return {
    ...hours,
    divisor,
    additionalRate,
    hourlyRate: round(hourlyRate, 6),
    nightAdditionalPerShift: round(hourlyRate * additionalRate * hours.payableNightHours),
  };
}
