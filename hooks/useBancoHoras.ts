/**
 * useBancoHoras — lógica centralizada de cálculo de banco de horas.
 * Usada por BancoHoras.tsx (admin) e PortalBancoHoras.tsx (funcionário).
 * Qualquer ajuste de regra deve ser feito APENAS aqui.
 */
import { gerarHorariosPadraoEscala } from '../utils/calcularHoras';

export const TOLERANCIA_MINUTOS = 5;
/** A partir desta data, créditos de banco só contam se a soma diária (entrada+saída) ≥ 30 min. */
export const DATA_INICIO_REGRA_30MIN = '2026-06-14';
export const MINIMO_CREDITO_DIARIO = 30;

export const DIAS_SEMANA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface BancoHorasDia {
  dia: number;
  diaSemana: string;
  entradaProgramada: string;
  saidaProgramada: string;
  entradaReal: string;
  saidaReal: string;
  /** positivo = crédito (entrou antes), negativo = débito (atraso) — JÁ COM REGRA 30min APLICADA */
  minutosEntrada: number;
  /** positivo = crédito (saiu depois), negativo = débito (saída antecipada) — JÁ COM REGRA 30min APLICADA */
  minutosSaida: number;
  /** saldo líquido do dia — pode ser negativo */
  totalMinutos: number;
  /** Crédito bruto antes da regra dos 30 min (entrada) */
  minutosEntradaBruto: number;
  /** Crédito bruto antes da regra dos 30 min (saída) */
  minutosSaidaBruto: number;
  /** true se a regra dos 30 min foi aplicada (créditos zerados por não atingirem o mínimo) */
  creditoIgnoradoRegra30: boolean;
  /** true se a data está sob a regra dos 30 min */
  regra30Vigente: boolean;
}

export interface RegraEscalaBase {
  codigo_escala?: string;
  horarios_segunda?: any; horarios_terca?: any; horarios_quarta?: any;
  horarios_quinta?: any; horarios_sexta?: any; horarios_sabado?: any; horarios_domingo?: any;
  trabalha_segunda?: boolean; trabalha_terca?: boolean; trabalha_quarta?: boolean;
  trabalha_quinta?: boolean; trabalha_sexta?: boolean; trabalha_sabado?: boolean; trabalha_domingo?: boolean;
}

export interface RegistroPontoBase {
  funcionario_id: string;
  data_registro: string;
  primeiro_registro: string | null;
  quarto_registro: string | null;
}

// ── Utilitários ──────────────────────────────────────────────────────────────

export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(totalMinutes: number): string {
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return totalMinutes < 0 ? `-${str}` : str;
}

/**
 * Minutos de banco pela entrada.
 * positivo = entrou antes (crédito), negativo = entrou depois (débito).
 * Retorna 0 se dentro da tolerância.
 */
export function calcularMinutosBancoEntrada(programada: string, real: string): number {
  if (!programada || !real) return 0;
  const diff = timeToMinutes(programada) - timeToMinutes(real);
  return Math.abs(diff) <= TOLERANCIA_MINUTOS ? 0 : diff;
}

/**
 * Minutos de banco pela saída.
 * positivo = saiu depois (crédito), negativo = saiu antes (débito).
 * Retorna 0 se dentro da tolerância.
 */
export function calcularMinutosBancoSaida(programada: string, real: string): number {
  if (!programada || !real) return 0;
  const diff = timeToMinutes(real) - timeToMinutes(programada);
  return Math.abs(diff) <= TOLERANCIA_MINUTOS ? 0 : diff;
}

/**
 * Resolve o horário previsto para um dia da semana.
 * Prioridade: gerarHorariosPadraoEscala (hardcoded correto) → regras_escalas (banco).
 */
export function resolverHorarioDia(
  diaSemana: number,
  codigoEscala?: string,
  escala?: RegraEscalaBase | null
): { entrada: string; saida: string } | null {
  // 1. Fonte primária: horários hardcoded por código de escala
  if (codigoEscala) {
    const gerado = gerarHorariosPadraoEscala(codigoEscala, diaSemana);
    if (gerado) return { entrada: gerado.entrada, saida: gerado.saida };
  }

  // 2. Fallback: tabela regras_escalas
  if (!escala) return null;
  const chaves = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dia = chaves[diaSemana];
  if (!escala[`trabalha_${dia}` as keyof RegraEscalaBase]) return null;
  const horarios = escala[`horarios_${dia}` as keyof RegraEscalaBase] as any;
  if (!horarios?.entrada || !horarios?.saida) return null;
  return { entrada: horarios.entrada, saida: horarios.saida };
}

/**
 * Calcula o banco de horas dia a dia para um funcionário num mês/ano.
 */
export function calcularBancoHorasMes(params: {
  mes: number;
  ano: number;
  registros: RegistroPontoBase[];
  codigoEscala?: string;
  escala?: RegraEscalaBase | null;
}): BancoHorasDia[] {
  const { mes, ano, registros, codigoEscala, escala } = params;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const resultado: BancoHorasDia[] = [];

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const date = new Date(ano, mes - 1, dia);
    const diaSemana = date.getDay();
    const dataStr = `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
    const registro = registros.find(r => r.data_registro === dataStr);

    const horario = resolverHorarioDia(diaSemana, codigoEscala, escala);
    const entradaProg = horario?.entrada || '';
    const saidaProg = horario?.saida || '';
    const entradaReal = registro?.primeiro_registro?.substring(0, 5) || '';
    const saidaReal = registro?.quarto_registro?.substring(0, 5) || '';

    const minutosEntradaRaw = calcularMinutosBancoEntrada(entradaProg, entradaReal);
    const minutosSaidaRaw = calcularMinutosBancoSaida(saidaProg, saidaReal);

    // Regra a partir de 14/06/2026: créditos (positivos) só contam se a soma diária ≥ 30 min.
    // Débitos (negativos) sempre contam.
    let minutosEntrada = minutosEntradaRaw;
    let minutosSaida = minutosSaidaRaw;
    const regra30Vigente = dataStr >= DATA_INICIO_REGRA_30MIN;
    let creditoIgnoradoRegra30 = false;
    if (regra30Vigente) {
      const creditoEntrada = Math.max(0, minutosEntradaRaw);
      const creditoSaida = Math.max(0, minutosSaidaRaw);
      const somaCreditos = creditoEntrada + creditoSaida;
      if (somaCreditos > 0 && somaCreditos < MINIMO_CREDITO_DIARIO) {
        if (minutosEntradaRaw > 0) minutosEntrada = 0;
        if (minutosSaidaRaw > 0) minutosSaida = 0;
        creditoIgnoradoRegra30 = true;
      }
    }

    resultado.push({
      dia,
      diaSemana: DIAS_SEMANA_LABELS[diaSemana],
      entradaProgramada: entradaProg,
      saidaProgramada: saidaProg,
      entradaReal,
      saidaReal,
      minutosEntrada,
      minutosSaida,
      totalMinutos: minutosEntrada + minutosSaida,
      minutosEntradaBruto: minutosEntradaRaw,
      minutosSaidaBruto: minutosSaidaRaw,
      creditoIgnoradoRegra30,
      regra30Vigente,
    });
  }

  return resultado;
}

/**
 * Soma o total de minutos de um array de BancoHorasDia.
 */
export function somarMinutosBanco(dias: BancoHorasDia[]): number {
  return dias.reduce((acc, d) => acc + d.totalMinutos, 0);
}
