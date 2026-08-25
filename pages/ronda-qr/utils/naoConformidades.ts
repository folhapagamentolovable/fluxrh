/**
 * Non-conformity detection and classification for patrol rounds
 * 
 * Severity levels:
 * - leve: 3-6 min early/late
 * - media: 6-7 min early/late  
 * - grave: >7 min, wrong sequence, missed QR codes
 * - gravissima: missed entire patrol, repeated sequence violations
 */

import { supabase } from '../../../lib/supabase';
import { abreviarNome } from '../../../utils/formatarNome';

export type NivelNaoConformidade = 'leve' | 'media' | 'grave' | 'gravissima';
export type TipoNaoConformidade = 'antecipacao' | 'atraso' | 'sequencia_incorreta' | 'ausencia_leitura' | 'ronda_nao_realizada' | 'sequencia_repetida';

export interface NaoConformidade {
  nivel: NivelNaoConformidade;
  tipo: TipoNaoConformidade;
  diferenca_minutos: number;
  descricao: string;
  recomendacao_gerencial: string;
  alerta_funcionario: string;
  ponto_nome?: string;
}

/**
 * Classify a timing deviation into a non-conformity level
 */
export function classificarDesvioTempo(
  diferencaMinutos: number,
  nomeFuncionario: string,
  pontoNome?: string
): NaoConformidade | null {
  const absDiff = Math.abs(diferencaMinutos);
  const nomeAbrev = abreviarNome(nomeFuncionario);
  const direcao = diferencaMinutos < 0 ? 'adiantado' : 'atrasado';
  const tipo: TipoNaoConformidade = diferencaMinutos < 0 ? 'antecipacao' : 'atraso';

  // Within tolerance (<=3 min) — no non-conformity
  if (absDiff <= 3) return null;

  // Leve: >3 and <6 minutes
  if (absDiff > 3 && absDiff < 6) {
    return {
      nivel: 'leve',
      tipo,
      diferenca_minutos: diferencaMinutos,
      descricao: `${direcao === 'adiantado' ? 'Antecipação' : 'Atraso'} de ${absDiff} minutos${pontoNome ? ` no ponto ${pontoNome}` : ''}.`,
      recomendacao_gerencial: `Instruir o funcionário ${nomeAbrev}.`,
      alerta_funcionario: `Você está ${absDiff} minutos ${direcao}.`,
      ponto_nome: pontoNome,
    };
  }

  // Media: >=6 and <7 minutes
  if (absDiff >= 6 && absDiff < 7) {
    return {
      nivel: 'media',
      tipo,
      diferenca_minutos: diferencaMinutos,
      descricao: `${direcao === 'adiantado' ? 'Antecipação' : 'Atraso'} de ${absDiff} minutos${pontoNome ? ` no ponto ${pontoNome}` : ''}.`,
      recomendacao_gerencial: `Verificar justificativa e instruir verbalmente o funcionário ${nomeAbrev}.`,
      alerta_funcionario: `Atenção: você está ${absDiff} minutos ${direcao} com a ronda. Favor justificar no grupo de Rondas.`,
      ponto_nome: pontoNome,
    };
  }

  // Grave: >=7 minutes
  return {
    nivel: 'grave',
    tipo,
    diferenca_minutos: diferencaMinutos,
    descricao: `${direcao === 'adiantado' ? 'Antecipação' : 'Atraso'} grave de ${absDiff} minutos${pontoNome ? ` no ponto ${pontoNome}` : ''}.`,
    recomendacao_gerencial: `Verificar justificativa e ministrar treinamento específico.`,
    alerta_funcionario: `Atenção! Você cometeu uma falha grave da ronda! Favor justificar no grupo de rondas!`,
    ponto_nome: pontoNome,
  };
}

/**
 * Create a non-conformity for out-of-sequence QR code reading
 */
export function classificarSequenciaIncorreta(
  nomeFuncionario: string,
  pontoNome: string,
  vezesNoTurno: number = 1
): NaoConformidade {
  const nomeAbrev = abreviarNome(nomeFuncionario);

  if (vezesNoTurno > 1) {
    return {
      nivel: 'gravissima',
      tipo: 'sequencia_repetida',
      diferenca_minutos: 0,
      descricao: `Alteração da sequência de QR Codes repetida (${vezesNoTurno}x no turno) no ponto ${pontoNome}.`,
      recomendacao_gerencial: `Verificar justificativa no livro de ocorrências, aplicar treinamento específico, aplicar advertência (se for o caso), informar o cliente.`,
      alerta_funcionario: `Atenção! Você cometeu uma falha grave da ronda! Favor justificar no grupo de rondas!`,
      ponto_nome: pontoNome,
    };
  }

  return {
    nivel: 'grave',
    tipo: 'sequencia_incorreta',
    diferenca_minutos: 0,
    descricao: `Falha na sequência de leitura no ponto ${pontoNome}.`,
    recomendacao_gerencial: `Verificar justificativa e ministrar treinamento específico.`,
    alerta_funcionario: `Atenção! Você cometeu uma falha grave da ronda! Favor justificar no grupo de rondas!`,
    ponto_nome: pontoNome,
  };
}

/**
 * Create a non-conformity for missed QR code reading
 */
export function classificarAusenciaLeitura(
  nomeFuncionario: string,
  pontoNome: string
): NaoConformidade {
  return {
    nivel: 'grave',
    tipo: 'ausencia_leitura',
    diferenca_minutos: 0,
    descricao: `Ausência de leitura do QR Code no ponto ${pontoNome}.`,
    recomendacao_gerencial: `Verificar justificativa e ministrar treinamento específico.`,
    alerta_funcionario: `Atenção! Você cometeu uma falha grave da ronda! Favor justificar no grupo de rondas!`,
    ponto_nome: pontoNome,
  };
}

/**
 * Create a non-conformity for entirely missed patrol round
 */
export function classificarRondaNaoRealizada(
  nomeFuncionario: string,
  cicloNumero: number
): NaoConformidade {
  return {
    nivel: 'gravissima',
    tipo: 'ronda_nao_realizada',
    diferenca_minutos: 0,
    descricao: `Ronda do ciclo ${cicloNumero} não realizada.`,
    recomendacao_gerencial: `Verificar justificativa no livro de ocorrências, aplicar treinamento específico, aplicar advertência (se for o caso), informar o cliente.`,
    alerta_funcionario: '',
  };
}

/**
 * Persist a non-conformity record to the database
 */
export async function registrarNaoConformidade(params: {
  sessao_id?: string;
  leitura_id?: string;
  funcionario_id: string;
  data_ronda: string;
  ciclo_numero?: number;
  nc: NaoConformidade;
}) {
  const { error } = await supabase.from('rondas_nao_conformidades').insert({
    sessao_id: params.sessao_id || null,
    leitura_id: params.leitura_id || null,
    funcionario_id: params.funcionario_id,
    data_ronda: params.data_ronda,
    ciclo_numero: params.ciclo_numero || null,
    nivel: params.nc.nivel,
    tipo: params.nc.tipo,
    diferenca_minutos: params.nc.diferenca_minutos,
    descricao: params.nc.descricao,
    recomendacao_gerencial: params.nc.recomendacao_gerencial,
    ponto_nome: params.nc.ponto_nome || null,
    alerta_exibido: true,
  });
  if (error) console.error('Erro ao registrar não conformidade:', error);
  return error;
}

/**
 * Get the color scheme for each severity level
 */
export function getNivelColor(nivel: NivelNaoConformidade) {
  switch (nivel) {
    case 'leve': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', badge: 'bg-blue-500' };
    case 'media': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', badge: 'bg-amber-500' };
    case 'grave': return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', badge: 'bg-orange-500' };
    case 'gravissima': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', badge: 'bg-red-600' };
  }
}

export function getNivelLabel(nivel: NivelNaoConformidade) {
  switch (nivel) {
    case 'leve': return 'Leve';
    case 'media': return 'Média';
    case 'grave': return 'Grave';
    case 'gravissima': return 'Gravíssima';
  }
}
