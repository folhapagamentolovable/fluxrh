/**
 * Cache de regras de escala — carrega da tabela regras_escalas uma vez
 * e expõe lookups síncronos para uso em calcularHoras.ts e demais utilitários.
 *
 * Uso:
 *   await carregarRegrasEscala();          // chamar uma vez no boot / antes de calcular
 *   const h = getHorariosDia('FIGLIMPT1', 1); // 1 = Segunda
 */

import { supabase } from '../lib/supabase';
import type { HorariosDia } from './calcularHoras';

// ── Tipos internos ────────────────────────────────────────────
interface HorarioDia {
  entrada: string;
  saida: string;
  inicio_refeicao?: string;
  termino_refeicao?: string;
}

interface RegraEscalaRaw {
  codigo_escala: string;
  horarios_segunda:   HorarioDia | null;
  horarios_terca:     HorarioDia | null;
  horarios_quarta:    HorarioDia | null;
  horarios_quinta:    HorarioDia | null;
  horarios_sexta:     HorarioDia | null;
  horarios_sabado:    HorarioDia | null;
  horarios_domingo:   HorarioDia | null;
  horarios_feriado:   HorarioDia | null;
  trabalha_segunda:   boolean;
  trabalha_terca:     boolean;
  trabalha_quarta:    boolean;
  trabalha_quinta:    boolean;
  trabalha_sexta:     boolean;
  trabalha_sabado:    boolean;
  trabalha_domingo:   boolean;
  trabalha_feriado:   boolean;
}

// ── Cache em memória ──────────────────────────────────────────
let cache: Map<string, RegraEscalaRaw> = new Map();
let carregado = false;

const CHAVES_DIA = [
  'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'
] as const;

// ── Carregamento ──────────────────────────────────────────────
export async function carregarRegrasEscala(): Promise<void> {
  const { data, error } = await supabase
    .from('regras_escalas')
    .select(`
      codigo_escala,
      horarios_segunda, horarios_terca, horarios_quarta, horarios_quinta,
      horarios_sexta, horarios_sabado, horarios_domingo, horarios_feriado,
      trabalha_segunda, trabalha_terca, trabalha_quarta, trabalha_quinta,
      trabalha_sexta, trabalha_sabado, trabalha_domingo, trabalha_feriado
    `)
    .eq('ativa', true);

  if (error) {
    console.error('[regrasEscalaCache] Erro ao carregar:', error.message);
    return;
  }

  cache = new Map((data || []).map(r => [r.codigo_escala, r as RegraEscalaRaw]));
  carregado = true;
}

/** Garante que o cache está carregado (carrega se necessário) */
export async function garantirCache(): Promise<void> {
  if (!carregado) await carregarRegrasEscala();
}

// ── Lookups síncronos ─────────────────────────────────────────

/**
 * Retorna os horários do dia para uma escala.
 * diaSemana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
 * ehFeriado: se true, usa horarios_feriado
 */
export function getHorariosDia(
  codigoEscala: string,
  diaSemana: number,
  ehFeriado = false
): HorariosDia | null {
  const regra = cache.get(codigoEscala);
  if (!regra) return null;

  let h: HorarioDia | null = null;

  if (ehFeriado) {
    if (!regra.trabalha_feriado) return null;
    h = regra.horarios_feriado;
  } else {
    const chave = CHAVES_DIA[diaSemana];
    const trabalha = (regra as any)[`trabalha_${chave}`];
    if (!trabalha) return null;
    h = (regra as any)[`horarios_${chave}`] as HorarioDia | null;
  }

  if (!h?.entrada || !h?.saida) return null;

  return {
    entrada:          h.entrada,
    saida:            h.saida,
    inicio_refeicao:  h.inicio_refeicao  ?? h.entrada, // fallback: sem refeição
    termino_refeicao: h.termino_refeicao ?? h.saida,
  };
}

/**
 * Verifica se o funcionário trabalha no dia (considera feriado).
 */
export function trabalhaNoDia(
  codigoEscala: string,
  diaSemana: number,
  ehFeriado = false
): boolean {
  const regra = cache.get(codigoEscala);
  if (!regra) return true; // sem regra → não bloqueia

  if (ehFeriado) return regra.trabalha_feriado ?? false;

  const chave = CHAVES_DIA[diaSemana];
  return (regra as any)[`trabalha_${chave}`] ?? true;
}

/**
 * Calcula a jornada padrão (horas líquidas) a partir dos horários do banco.
 */
export function getJornadaPadrao(
  codigoEscala: string,
  diaSemana: number,
  ehFeriado = false
): number {
  const h = getHorariosDia(codigoEscala, diaSemana, ehFeriado);
  if (!h) return 8;

  const toMin = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm;
  };

  let total = toMin(h.saida) - toMin(h.entrada);
  if (total < 0) total += 24 * 60; // turno noturno

  const refeicao = toMin(h.termino_refeicao) - toMin(h.inicio_refeicao);
  const semRefeicao = refeicao <= 0;

  if (total > 6 * 60 && !semRefeicao) {
    total -= refeicao; // descontar intervalo
  }

  return Math.round((total / 60) * 100) / 100;
}

/** Retorna true se o cache já foi carregado */
export function cacheCarregado(): boolean {
  return carregado;
}

/** Retorna todos os códigos de escala carregados */
export function getCodigosEscala(): string[] {
  return Array.from(cache.keys());
}
