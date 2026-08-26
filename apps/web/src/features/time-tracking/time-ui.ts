export function formatMinutes(value:number){const sign=value<0?"−":"";const absolute=Math.abs(value);return`${sign}${Math.floor(absolute/60)}h ${String(absolute%60).padStart(2,"0")}min`}
export const punchLabels={clock_in:"Entrada",break_start:"Início intervalo",break_end:"Fim intervalo",clock_out:"Saída"} as const;
export const exceptionLabels={missing_punch:"Marcação ausente",late_arrival:"Atraso",early_leave:"Saída antecipada",excess_hours:"Jornada excessiva",short_break:"Intervalo reduzido",location_mismatch:"Local divergente"} as const;
