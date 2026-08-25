import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nmwrplxnjqyerorbbcxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td3JwbHhuanF5ZXJvcmJiY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODA4OTYsImV4cCI6MjA3NTg1Njg5Nn0.Pf9j30tFgKQ5AMv0Y0puswj9NrPynDOWOuhkE2Hyfis';

const globalSupabase = globalThis as typeof globalThis & {
  __fluxpaySupabaseClient?: SupabaseClient<any, any, any>;
};

export const supabase = globalSupabase.__fluxpaySupabaseClient ??= createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-nmwrplxnjqyerorbbcxk-auth-token',
    debug: false
  }
});

// Interceptar erros de autenticação para evitar toasts desnecessários
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Filtrar erros conhecidos e não críticos do Supabase
  if (message.includes('refresh_token_not_found') || 
      message.includes('AuthApiError') ||
      message.includes('Invalid refresh token')) {
    // Log silencioso para debug, mas não mostrar como erro crítico
    return;
  }
  
  // Para outros erros, usar o console.error normal
  originalConsoleError.apply(console, args);
};

// Tipos TypeScript para as tabelas
export interface Empresa {
  id: string;
  nome_empresa: string;
  cnpj: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  nome_contato?: string;
  created_at: string;
  updated_at: string;
}

export interface PostoTrabalho {
  id: string;
  nome_posto: string;
  cnpj: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  nome_contato?: string;
  valor_contrato?: number;
  empresa_id?: string;
  ativo?: boolean;
  created_at: string;
  updated_at: string;
  empresa?: Empresa;
}

export interface Escala {
  id: string;
  codigo_escala: string;
  nome_escala: string;
  regras_json?: any; // JSON com regras da escala
  data_inicio: string;
  data_fim?: string;
  created_at: string;
  updated_at: string;
}

export interface Cargo {
  id: string;
  nome_cargo: string;
  cbo?: string;
  escala_id?: string;
  salario_base: number;
  created_at: string;
  updated_at: string;
  escala?: Escala;
}

export interface Funcionario {
  id: string;
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
  numero_ctps?: string;
  serie_ctps?: string;
  data_nascimento?: string;
  data_admissao: string;
  quantidade_filhos: number;
  recebe_vt: boolean;
  faixa_vt?: number;
  recebe_seguro_vida: boolean;
  funcionario_registrado: boolean;
  adicional_insalubridade: boolean;
  acumulo_funcao: boolean;
  recebe_adiantamento_quinzenal: boolean;
  ativo: boolean;
  demitido?: boolean;
  cargo_id?: string;
  empresa_id?: string;
  posto_trabalho_id?: string;
  nome_empresa?: string;
  nome_posto?: string;
  nome_cargo?: string;
  codigo_escala?: string;
  user_id?: string | null;
  ronda?: boolean | null;
  banco_horas_ativo?: boolean | null;
  created_at: string;
  updated_at: string;
  cargo?: Cargo;
  empresa?: Empresa;
  posto_trabalho?: PostoTrabalho;
}

export interface Feriado {
  id: string;
  data_feriado: string;
  nome_feriado: string;
  dia_semana?: string;
  tipo_feriado: 'nacional' | 'estadual' | 'municipal';
  cidade?: string | null;
  estado?: string | null;
  created_at: string;
  updated_at: string;
}

// Interface atualizada com tabela progressiva do INSS
export interface ParametrosCalculo {
  id: string;
  salario_minimo: number;
  isencao_irpf: number;
  salario_familia: number;
  vale_transporte: number;
  vale_alimentacao: number;
  cesta_basica: number;
  plr_base: number;
  plr_desconto_falta_justificada?: number;
  plr_desconto_falta_injustificada?: number;
  plr_desconto_advertencia?: number;
  plr_desconto_suspensao?: number;
  plr_dias_minimos_mes?: number;
  plr_taxa_negociacao?: number;
  premio_permanencia_base: number;
  percentual_fgts: number;
  percentual_insalubridade: number;
  percentual_acumulo_funcao: number;
  percentual_desconto_vt: number;
  desconto_seguro_vida: number;
  percentual_inss: number;
  inss_faixa1_limite?: number;
  inss_faixa1_aliquota?: number;
  inss_faixa1_deducao?: number;
  inss_faixa2_limite?: number;
  inss_faixa2_aliquota?: number;
  inss_faixa2_deducao?: number;
  inss_faixa3_limite?: number;
  inss_faixa3_aliquota?: number;
  inss_faixa3_deducao?: number;
  inss_faixa4_limite?: number;
  inss_faixa4_aliquota?: number;
  inss_faixa4_deducao?: number;
  percentual_inss_patronal?: number;
  desconto_plr: number;
  convenio_odontologico: number;
  contribuicao_assistencial: number;
  percentual_adiantamento_quinzenal: number;
  ativo: boolean;
  ano_vigencia: number;
  created_at: string;
  updated_at: string;
}

export interface FolhaPonto {
  id: string;
  funcionario_id: string;
  mes: number;
  ano: number;
  empresa_id?: string;
  posto_trabalho_id?: string;
  cargo_id?: string;
  escala_id?: string;
  dados_dias?: string; // JSON string
  horas_trabalhadas: number;
  horas_extras: number;
  total_horas_normais?: number;
  total_horas_extras_50?: number;
  total_horas_extras_100?: number;
  total_horas_noturnas?: number;
  total_intrajornada_50?: number;
  total_intrajornada_100?: number;
  faltas: number;
  total_faltas_justificadas?: number;
  total_faltas_injustificadas?: number;
  atrasos: number;
  total_atrasos?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  funcionario?: Funcionario;
  empresa?: Empresa;
  posto_trabalho?: PostoTrabalho;
  cargo?: Cargo;
  escala?: Escala;
}

export interface FolhaCalculada {
  id: string;
  funcionario_id: string;
  mes: number;
  ano: number;
  salario_base: number;
  horas_extras: number;
  adicional_insalubridade: number;
  adicional_acumulo_funcao: number;
  vale_transporte: number;
  vale_alimentacao: number;
  salario_familia: number;
  total_proventos: number;
  desconto_inss: number;
  desconto_irrf: number;
  desconto_vt: number;
  desconto_seguro_vida: number;
  convenio_odontologico: number;
  contribuicao_assistencial: number;
  total_descontos: number;
  salario_liquido: number;
  fgts: number;
  created_at: string;
  updated_at: string;
  funcionario?: Funcionario;
}

export interface EscalaMensal {
  id: string;
  funcionario_id: string;
  mes: number;
  ano: number;
  escala_id: string;
  empresa_id?: string;
  posto_trabalho_id?: string;
  cargo_id?: string;
  dias_trabalhados: string; // JSON string com detalhamento completo
  total_dias_trabalho?: number;
  total_dias_folga?: number;
  total_feriados?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  funcionario?: Funcionario;
  escala?: Escala;
  empresa?: Empresa;
  posto_trabalho?: PostoTrabalho;
  cargo?: Cargo;
}