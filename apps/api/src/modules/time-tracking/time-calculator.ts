import type { TimePunch } from "@fluxrh/contracts";

export function minutesBetween(start: string, end: string) { return Math.max(0, Math.round((new Date(end).getTime()-new Date(start).getTime())/60_000)); }
export function calculateWorkedMinutes(punches: TimePunch[]) {
  const ordered=[...punches].sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)); let total=0;
  for(let i=0;i+1<ordered.length;i+=2) total+=minutesBetween(ordered[i].recordedAt,ordered[i+1].recordedAt);
  return total;
}
export function calculateBalance(workedMinutes:number,expectedMinutes:number,isSunday=false){const excess=Math.max(0,workedMinutes-expectedMinutes);return{balanceMinutes:workedMinutes-expectedMinutes,overtime50Minutes:isSunday?0:excess,overtime100Minutes:isSunday?excess:0}}
