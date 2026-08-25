// Utilitário central para formatação de horas no formato HH:MM.
// Resolve casos comuns:
// - Número decimal (ex: 1.5)
// - String com vírgula decimal ("1,5")
// - Evita resultados inválidos como "32:60" (carry automático)

export function formatarHorasHHMM(valor: unknown): string {
  const toNumber = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return 0;
    const s = v.trim();
    if (!s) return 0;
    // Se vier "HH:MM" já, converte para decimal para re-normalizar
    const hhmm = /^\s*\d+\s*:\s*\d+\s*$/;
    if (hhmm.test(s)) {
      const [hStr, mStr] = s.split(':');
      const h = parseInt(hStr.trim(), 10);
      const m = parseInt(mStr.trim(), 10);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
      return h + m / 60;
    }
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const horasDecimal = toNumber(valor);
  if (!horasDecimal || horasDecimal <= 0) return '';

  const totalMinutos = Math.round(Math.abs(horasDecimal) * 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}
