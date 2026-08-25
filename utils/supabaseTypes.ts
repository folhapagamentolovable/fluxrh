/**
 * Tipos auxiliares para lidar com respostas do Supabase
 * 
 * O Supabase retorna arrays para relações em queries com select(),
 * mas muitas vezes queremos tratar como objetos únicos.
 * Este arquivo fornece utilidades para fazer essas conversões de forma segura.
 */

import type { Empresa, PostoTrabalho, Cargo, Funcionario, FolhaPonto, FolhaCalculada, EscalaMensal } from '../lib/supabase';

// Tipo genérico para extrair o primeiro elemento de um array ou retornar o próprio tipo
export type FirstOrSelf<T> = T extends (infer U)[] ? U | undefined : T;

// Tipo para relações do Supabase que podem vir como array ou objeto único
export type SupabaseRelation<T> = T | T[] | null | undefined;

// Função helper para normalizar relações do Supabase
export function normalizeRelation<T>(relation: SupabaseRelation<T>): T | undefined {
  if (!relation) return undefined;
  if (Array.isArray(relation)) {
    return relation[0];
  }
  return relation;
}

// Função helper para garantir array de relações
export function ensureArray<T>(relation: SupabaseRelation<T>): T[] {
  if (!relation) return [];
  if (Array.isArray(relation)) return relation;
  return [relation];
}

// Tipos para respostas brutas do Supabase (antes da normalização)
export interface FuncionarioRaw {
  id: string;
  nome_completo: string;
  cpf?: string | null;
  numero_ctps?: string | null;
  serie_ctps?: string | null;
  data_nascimento?: string | null;
  data_admissao: string;
  quantidade_filhos?: number | null;
  recebe_vt?: boolean | null;
  recebe_seguro_vida?: boolean | null;
  funcionario_registrado?: boolean | null;
  adicional_insalubridade?: boolean | null;
  acumulo_funcao?: boolean | null;
  recebe_adiantamento_quinzenal?: boolean | null;
  ativo?: boolean | null;
  demitido?: boolean | null;
  cargo_id?: string | null;
  empresa_id?: string | null;
  posto_trabalho_id?: string | null;
  nome_empresa?: string | null;
  nome_posto?: string | null;
  nome_cargo?: string | null;
  codigo_escala?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Relações podem vir como array ou objeto
  cargo?: SupabaseRelation<Partial<Cargo>>;
  empresa?: SupabaseRelation<Partial<Empresa>>;
  posto_trabalho?: SupabaseRelation<Partial<PostoTrabalho>>;
}

export interface FolhaCalculadaRaw {
  id: string;
  funcionario_id: string;
  mes: number;
  ano: number;
  nome_funcionario?: string | null;
  empresa_id?: string | null;
  posto_trabalho_id?: string | null;
  salario_base: number;
  adicional_noturno?: number | null;
  dsr_adicional_noturno?: number | null;
  horas_extras?: number | null;
  horas_extras_50?: number | null;
  horas_extras_100?: number | null;
  dsr_horas_extras?: number | null;
  adicional_insalubridade?: number | null;
  adicional_acumulo_funcao?: number | null;
  intrajornada_50?: number | null;
  intrajornada_100?: number | null;
  folga_trabalhada?: number | null;
  complemento_salario?: number | null;
  vale_transporte?: number | null;
  vale_alimentacao?: number | null;
  vale_transporte_mes_anterior?: number | null;
  vale_transporte_mes_atual?: number | null;
  vale_alimentacao_mes_anterior?: number | null;
  vale_alimentacao_mes_atual?: number | null;
  cesta_basica?: number | null;
  salario_familia?: number | null;
  plr?: number | null;
  premio_permanencia?: number | null;
  total_proventos: number;
  desconto_inss?: number | null;
  desconto_irrf?: number | null;
  desconto_vt?: number | null;
  desconto_vt_faltas?: number | null;
  desconto_va_faltas?: number | null;
  desconto_seguro_vida?: number | null;
  desconto_convenio_odonto?: number | null;
  desconto_contribuicao_assistencial?: number | null;
  desconto_faltas?: number | null;
  desconto_atrasos?: number | null;
  desconto_plr?: number | null;
  desconto_pensao_alimenticia?: number | null;
  desconto_rondas_nao_realizadas?: number | null;
  desc_rondas_nao_realizadas_benef?: number | null;
  desconto_adiantamento_quinzenal?: number | null;
  desconto_complemento_anterior?: number | null;
  desc_avaria_utilitario?: number | null;
  total_descontos: number;
  salario_liquido: number;
  base_inss?: number | null;
  base_irrf?: number | null;
  base_fgts?: number | null;
  fgts?: number | null;
  inss_patronal?: number | null;
  inss_13?: number | null;
  total_beneficios?: number | null;
  servicos_externos_folhas_pagamento?: number | null;
  servicos_externos_controle_rondas?: number | null;
  reembolsos_uber?: number | null;
  decimo_terceiro_integral?: number | null;
  decimo_terceiro_primeira_parcela?: number | null;
  decimo_terceiro_segunda_parcela?: number | null;
  decimo_terceiro_proporcional_rescisao?: number | null;
  decimo_terceiro_vantagens_primeira_parcela?: number | null;
  decimo_terceiro_vantagens_segunda_parcela?: number | null;
  decimo_terceiro_vantagens_rescisao?: number | null;
  adiantamento_13_salario?: number | null;
  adiantamento_vantagens_13?: number | null;
  vantagens_13?: number | null;
  ferias_proporcionais_rescisao?: number | null;
  um_terco_ferias_proporcional_rescisao?: number | null;
  plr_proporcional_rescisao?: number | null;
  eventos_excepcionais?: any;
  created_at?: string | null;
  updated_at?: string | null;
  // Relações podem vir como array ou objeto
  funcionario?: SupabaseRelation<Partial<Funcionario>>;
  empresa?: SupabaseRelation<Partial<Empresa>>;
  posto_trabalho?: SupabaseRelation<Partial<PostoTrabalho>>;
}

// Função para normalizar funcionário do Supabase
export function normalizeFuncionario(raw: FuncionarioRaw): Funcionario {
  return {
    ...raw,
    cpf: raw.cpf || '',
    numero_ctps: raw.numero_ctps ?? undefined,
    serie_ctps: raw.serie_ctps ?? undefined,
    data_nascimento: raw.data_nascimento ?? undefined,
    cargo_id: raw.cargo_id ?? undefined,
    empresa_id: raw.empresa_id ?? undefined,
    posto_trabalho_id: raw.posto_trabalho_id ?? undefined,
    nome_empresa: raw.nome_empresa ?? undefined,
    nome_posto: raw.nome_posto ?? undefined,
    nome_cargo: raw.nome_cargo ?? undefined,
    codigo_escala: raw.codigo_escala ?? undefined,
    quantidade_filhos: raw.quantidade_filhos ?? 0,
    recebe_vt: raw.recebe_vt ?? false,
    recebe_seguro_vida: raw.recebe_seguro_vida ?? false,
    funcionario_registrado: raw.funcionario_registrado ?? false,
    adicional_insalubridade: raw.adicional_insalubridade ?? false,
    acumulo_funcao: raw.acumulo_funcao ?? false,
    recebe_adiantamento_quinzenal: raw.recebe_adiantamento_quinzenal ?? false,
    ativo: raw.ativo ?? true,
    demitido: raw.demitido ?? false,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
    cargo: normalizeRelation(raw.cargo) as Cargo | undefined,
    empresa: normalizeRelation(raw.empresa) as Empresa | undefined,
    posto_trabalho: normalizeRelation(raw.posto_trabalho) as PostoTrabalho | undefined,
  };
}

// Função para normalizar array de funcionários
export function normalizeFuncionarios(raw: FuncionarioRaw[]): Funcionario[] {
  return raw.map(normalizeFuncionario);
}

// Type assertion seguro para dados do Supabase
export function asSupabaseData<T>(data: unknown): T {
  return data as T;
}

// Dados de folha calculada com todos os campos possíveis
export interface DadosFolhaCalculada {
  id: string;
  funcionario_id: string;
  mes: number;
  ano: number;
  nome_funcionario?: string | null;
  empresa_id?: string | null;
  posto_trabalho_id?: string | null;
  salario_base: number;
  adicional_noturno?: number | null;
  dsr_adicional_noturno?: number | null;
  horas_extras?: number | null;
  horas_extras_50?: number | null;
  horas_extras_100?: number | null;
  dsr_horas_extras?: number | null;
  adicional_insalubridade?: number | null;
  adicional_acumulo_funcao?: number | null;
  intrajornada_50?: number | null;
  intrajornada_100?: number | null;
  folga_trabalhada?: number | null;
  complemento_salario?: number | null;
  vale_transporte?: number | null;
  vale_alimentacao?: number | null;
  vale_transporte_mes_anterior?: number | null;
  vale_transporte_mes_atual?: number | null;
  vale_alimentacao_mes_anterior?: number | null;
  vale_alimentacao_mes_atual?: number | null;
  cesta_basica?: number | null;
  salario_familia?: number | null;
  plr?: number | null;
  premio_permanencia?: number | null;
  total_proventos: number;
  desconto_inss?: number | null;
  desconto_irrf?: number | null;
  desconto_vt?: number | null;
  desconto_vt_faltas?: number | null;
  desconto_va_faltas?: number | null;
  desconto_seguro_vida?: number | null;
  desconto_convenio_odonto?: number | null;
  desconto_contribuicao_assistencial?: number | null;
  desconto_faltas?: number | null;
  desconto_atrasos?: number | null;
  desconto_plr?: number | null;
  desconto_pensao_alimenticia?: number | null;
  desconto_rondas_nao_realizadas?: number | null;
  desc_rondas_nao_realizadas_benef?: number | null;
  desconto_adiantamento_quinzenal?: number | null;
  desconto_complemento_anterior?: number | null;
  desc_avaria_utilitario?: number | null;
  total_descontos: number;
  salario_liquido: number;
  base_inss?: number | null;
  base_irrf?: number | null;
  base_fgts?: number | null;
  fgts?: number | null;
  inss_patronal?: number | null;
  inss_13?: number | null;
  total_beneficios?: number | null;
  servicos_externos_folhas_pagamento?: number | null;
  servicos_externos_controle_rondas?: number | null;
  reembolsos_uber?: number | null;
  decimo_terceiro_integral?: number | null;
  decimo_terceiro_primeira_parcela?: number | null;
  decimo_terceiro_segunda_parcela?: number | null;
  decimo_terceiro_proporcional_rescisao?: number | null;
  decimo_terceiro_vantagens_primeira_parcela?: number | null;
  decimo_terceiro_vantagens_segunda_parcela?: number | null;
  decimo_terceiro_vantagens_rescisao?: number | null;
  adiantamento_13_salario?: number | null;
  adiantamento_vantagens_13?: number | null;
  vantagens_13?: number | null;
  ferias_proporcionais_rescisao?: number | null;
  um_terco_ferias_proporcional_rescisao?: number | null;
  plr_proporcional_rescisao?: number | null;
  eventos_excepcionais?: any;
  created_at?: string | null;
  updated_at?: string | null;
}
