export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      banco_horas_mensal: {
        Row: {
          ano: number
          atualizado_em: string | null
          created_at: string | null
          data_calculo: string | null
          dias_com_banco: number | null
          dias_trabalhados: number | null
          funcionario_id: string
          id: string
          mes: number
          minutos_entrada: number | null
          minutos_saida: number | null
          minutos_total: number | null
        }
        Insert: {
          ano: number
          atualizado_em?: string | null
          created_at?: string | null
          data_calculo?: string | null
          dias_com_banco?: number | null
          dias_trabalhados?: number | null
          funcionario_id: string
          id?: string
          mes: number
          minutos_entrada?: number | null
          minutos_saida?: number | null
          minutos_total?: number | null
        }
        Update: {
          ano?: number
          atualizado_em?: string | null
          created_at?: string | null
          data_calculo?: string | null
          dias_com_banco?: number | null
          dias_trabalhados?: number | null
          funcionario_id?: string
          id?: string
          mes?: number
          minutos_entrada?: number | null
          minutos_saida?: number | null
          minutos_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_mensal_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_mensal_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          cbo: string | null
          created_at: string | null
          escala_id: string | null
          id: string
          nome_cargo: string
          regra_escala_id: string | null
          salario_base: number
          updated_at: string | null
        }
        Insert: {
          cbo?: string | null
          created_at?: string | null
          escala_id?: string | null
          id?: string
          nome_cargo: string
          regra_escala_id?: string | null
          salario_base: number
          updated_at?: string | null
        }
        Update: {
          cbo?: string | null
          created_at?: string | null
          escala_id?: string | null
          id?: string
          nome_cargo?: string
          regra_escala_id?: string | null
          salario_base?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "regras_escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_regra_escala_id_fkey"
            columns: ["regra_escala_id"]
            isOneToOne: false
            referencedRelation: "regras_escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_postos: {
        Row: {
          created_at: string | null
          id: string
          posto_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          posto_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          posto_id?: string
          user_id?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cidade: string | null
          cnpj: string
          created_at: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_contato: string | null
          nome_empresa: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj: string
          created_at?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_contato?: string | null
          nome_empresa: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string
          created_at?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_contato?: string | null
          nome_empresa?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      escala_mensal: {
        Row: {
          ano: number
          cargo_id: string | null
          created_at: string | null
          dias_trabalhados: string | null
          empresa_id: string | null
          escala_id: string
          funcionario_id: string
          id: string
          mes: number
          nome_funcionario: string | null
          observacoes: string | null
          posto_trabalho_id: string | null
          regra_escala_id: string | null
          total_dias_folga: number | null
          total_dias_trabalho: number | null
          total_feriados: number | null
          updated_at: string | null
        }
        Insert: {
          ano: number
          cargo_id?: string | null
          created_at?: string | null
          dias_trabalhados?: string | null
          empresa_id?: string | null
          escala_id: string
          funcionario_id: string
          id?: string
          mes: number
          nome_funcionario?: string | null
          observacoes?: string | null
          posto_trabalho_id?: string | null
          regra_escala_id?: string | null
          total_dias_folga?: number | null
          total_dias_trabalho?: number | null
          total_feriados?: number | null
          updated_at?: string | null
        }
        Update: {
          ano?: number
          cargo_id?: string | null
          created_at?: string | null
          dias_trabalhados?: string | null
          empresa_id?: string | null
          escala_id?: string
          funcionario_id?: string
          id?: string
          mes?: number
          nome_funcionario?: string | null
          observacoes?: string | null
          posto_trabalho_id?: string | null
          regra_escala_id?: string | null
          total_dias_folga?: number | null
          total_dias_trabalho?: number | null
          total_feriados?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escala_mensal_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_mensal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_mensal_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "regras_escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_mensal_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_mensal_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_mensal_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_mensal_regra_escala_id_fkey"
            columns: ["regra_escala_id"]
            isOneToOne: false
            referencedRelation: "regras_escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          cidade: string | null
          created_at: string | null
          data_feriado: string
          dia_semana: string | null
          estado: string | null
          id: string
          nome_feriado: string
          tipo_feriado: string | null
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          data_feriado: string
          dia_semana?: string | null
          estado?: string | null
          id?: string
          nome_feriado: string
          tipo_feriado?: string | null
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          data_feriado?: string
          dia_semana?: string | null
          estado?: string | null
          id?: string
          nome_feriado?: string
          tipo_feriado?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ferias: {
        Row: {
          created_at: string | null
          data_fim_aquisitivo: string
          data_fim_gozo: string | null
          data_inicio_aquisitivo: string
          data_inicio_gozo: string | null
          data_limite_concessivo: string
          dias_abono: number | null
          dias_direito: number | null
          dias_gozados: number | null
          fracionamento: number | null
          funcionario_id: string
          id: string
          itens_calculados: Json | null
          nome_funcionario: string | null
          observacoes: string | null
          periodo_aquisitivo: number
          periodo1_fim: string | null
          periodo1_inicio: string | null
          periodo2_fim: string | null
          periodo2_inicio: string | null
          periodo3_fim: string | null
          periodo3_inicio: string | null
          resposta_empresa: string | null
          salario_base_calculo: number | null
          status: string
          total_fracoes: number | null
          updated_at: string | null
          valor_abono: number | null
          valor_ferias: number | null
          valor_terco: number | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string | null
          data_fim_aquisitivo: string
          data_fim_gozo?: string | null
          data_inicio_aquisitivo: string
          data_inicio_gozo?: string | null
          data_limite_concessivo: string
          dias_abono?: number | null
          dias_direito?: number | null
          dias_gozados?: number | null
          fracionamento?: number | null
          funcionario_id: string
          id?: string
          itens_calculados?: Json | null
          nome_funcionario?: string | null
          observacoes?: string | null
          periodo_aquisitivo: number
          periodo1_fim?: string | null
          periodo1_inicio?: string | null
          periodo2_fim?: string | null
          periodo2_inicio?: string | null
          periodo3_fim?: string | null
          periodo3_inicio?: string | null
          resposta_empresa?: string | null
          salario_base_calculo?: number | null
          status?: string
          total_fracoes?: number | null
          updated_at?: string | null
          valor_abono?: number | null
          valor_ferias?: number | null
          valor_terco?: number | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string | null
          data_fim_aquisitivo?: string
          data_fim_gozo?: string | null
          data_inicio_aquisitivo?: string
          data_inicio_gozo?: string | null
          data_limite_concessivo?: string
          dias_abono?: number | null
          dias_direito?: number | null
          dias_gozados?: number | null
          fracionamento?: number | null
          funcionario_id?: string
          id?: string
          itens_calculados?: Json | null
          nome_funcionario?: string | null
          observacoes?: string | null
          periodo_aquisitivo?: number
          periodo1_fim?: string | null
          periodo1_inicio?: string | null
          periodo2_fim?: string | null
          periodo2_inicio?: string | null
          periodo3_fim?: string | null
          periodo3_inicio?: string | null
          resposta_empresa?: string | null
          salario_base_calculo?: number | null
          status?: string
          total_fracoes?: number | null
          updated_at?: string | null
          valor_abono?: number | null
          valor_ferias?: number | null
          valor_terco?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_calculada: {
        Row: {
          adiantamento_13_salario: number | null
          adiantamento_vantagens_13: number | null
          adicional_acumulo_funcao: number | null
          adicional_insalubridade: number | null
          adicional_noturno: number | null
          ano: number
          base_fgts: number | null
          base_inss: number | null
          base_irrf: number | null
          cesta_basica: number | null
          complemento_salario: number | null
          created_at: string | null
          decimo_terceiro_integral: number | null
          decimo_terceiro_primeira_parcela: number | null
          decimo_terceiro_proporcional_rescisao: number | null
          decimo_terceiro_segunda_parcela: number | null
          decimo_terceiro_vantagens_primeira_parcela: number | null
          decimo_terceiro_vantagens_rescisao: number | null
          decimo_terceiro_vantagens_segunda_parcela: number | null
          desc_ajuste_beneficios: number | null
          desc_avaria_utilitario: number
          desc_rondas_nao_realizadas_benef: number | null
          desconto_adiantamento_quinzenal: number | null
          desconto_adiantamento_salario: number | null
          desconto_atrasos: number | null
          desconto_complemento_anterior: number | null
          desconto_contribuicao_assistencial: number | null
          desconto_convenio_odonto: number | null
          desconto_dsr_faltas: number | null
          desconto_faltas: number | null
          desconto_inss: number | null
          desconto_irrf: number | null
          desconto_pensao_alimenticia: number | null
          desconto_plr: number | null
          desconto_rondas_nao_realizadas: number | null
          desconto_seguro_vida: number | null
          desconto_va_faltas: number | null
          desconto_vt: number | null
          desconto_vt_faltas: number | null
          dias_dsr_faltas: number | null
          dias_va_mes_anterior: number | null
          dias_va_mes_atual: number | null
          dias_vt_mes_anterior: number | null
          dias_vt_mes_atual: number | null
          dsr_adicional_noturno: number | null
          dsr_horas_extras: number | null
          empresa_id: string | null
          eventos_excepcionais: Json | null
          ferias_proporcionais_rescisao: number | null
          fgts: number | null
          folga_trabalhada: number | null
          folgas_trabalhadas_va: number | null
          folgas_trabalhadas_vt: number | null
          funcionario_id: string
          horas_extras: number | null
          horas_extras_100: number | null
          horas_extras_50: number | null
          id: string
          inss_13: number | null
          inss_ferias: number | null
          inss_patronal: number | null
          intrajornada_100: number | null
          intrajornada_50: number | null
          mes: number
          nome_funcionario: string | null
          observacoes: string | null
          plr: number | null
          plr_proporcional_rescisao: number | null
          posto_trabalho_id: string | null
          premio_permanencia: number | null
          reembolsos_uber: number | null
          salario_base: number
          salario_familia: number | null
          salario_liquido: number
          servicos_externos_controle_rondas: number | null
          servicos_externos_folhas_pagamento: number | null
          supervisao_palmeiras: number | null
          total_beneficios: number | null
          total_descontos: number
          total_proventos: number
          um_terco_ferias_proporcional_rescisao: number | null
          updated_at: string | null
          vale_alimentacao: number | null
          vale_alimentacao_mes_anterior: number | null
          vale_alimentacao_mes_atual: number | null
          vale_transporte: number | null
          vale_transporte_mes_anterior: number | null
          vale_transporte_mes_atual: number | null
          valor_va_folgas_trabalhadas: number | null
          valor_vt_folgas_trabalhadas: number | null
          vantagens_13: number | null
        }
        Insert: {
          adiantamento_13_salario?: number | null
          adiantamento_vantagens_13?: number | null
          adicional_acumulo_funcao?: number | null
          adicional_insalubridade?: number | null
          adicional_noturno?: number | null
          ano: number
          base_fgts?: number | null
          base_inss?: number | null
          base_irrf?: number | null
          cesta_basica?: number | null
          complemento_salario?: number | null
          created_at?: string | null
          decimo_terceiro_integral?: number | null
          decimo_terceiro_primeira_parcela?: number | null
          decimo_terceiro_proporcional_rescisao?: number | null
          decimo_terceiro_segunda_parcela?: number | null
          decimo_terceiro_vantagens_primeira_parcela?: number | null
          decimo_terceiro_vantagens_rescisao?: number | null
          decimo_terceiro_vantagens_segunda_parcela?: number | null
          desc_ajuste_beneficios?: number | null
          desc_avaria_utilitario?: number
          desc_rondas_nao_realizadas_benef?: number | null
          desconto_adiantamento_quinzenal?: number | null
          desconto_adiantamento_salario?: number | null
          desconto_atrasos?: number | null
          desconto_complemento_anterior?: number | null
          desconto_contribuicao_assistencial?: number | null
          desconto_convenio_odonto?: number | null
          desconto_dsr_faltas?: number | null
          desconto_faltas?: number | null
          desconto_inss?: number | null
          desconto_irrf?: number | null
          desconto_pensao_alimenticia?: number | null
          desconto_plr?: number | null
          desconto_rondas_nao_realizadas?: number | null
          desconto_seguro_vida?: number | null
          desconto_va_faltas?: number | null
          desconto_vt?: number | null
          desconto_vt_faltas?: number | null
          dias_dsr_faltas?: number | null
          dias_va_mes_anterior?: number | null
          dias_va_mes_atual?: number | null
          dias_vt_mes_anterior?: number | null
          dias_vt_mes_atual?: number | null
          dsr_adicional_noturno?: number | null
          dsr_horas_extras?: number | null
          empresa_id?: string | null
          eventos_excepcionais?: Json | null
          ferias_proporcionais_rescisao?: number | null
          fgts?: number | null
          folga_trabalhada?: number | null
          folgas_trabalhadas_va?: number | null
          folgas_trabalhadas_vt?: number | null
          funcionario_id: string
          horas_extras?: number | null
          horas_extras_100?: number | null
          horas_extras_50?: number | null
          id?: string
          inss_13?: number | null
          inss_ferias?: number | null
          inss_patronal?: number | null
          intrajornada_100?: number | null
          intrajornada_50?: number | null
          mes: number
          nome_funcionario?: string | null
          observacoes?: string | null
          plr?: number | null
          plr_proporcional_rescisao?: number | null
          posto_trabalho_id?: string | null
          premio_permanencia?: number | null
          reembolsos_uber?: number | null
          salario_base?: number
          salario_familia?: number | null
          salario_liquido?: number
          servicos_externos_controle_rondas?: number | null
          servicos_externos_folhas_pagamento?: number | null
          supervisao_palmeiras?: number | null
          total_beneficios?: number | null
          total_descontos?: number
          total_proventos?: number
          um_terco_ferias_proporcional_rescisao?: number | null
          updated_at?: string | null
          vale_alimentacao?: number | null
          vale_alimentacao_mes_anterior?: number | null
          vale_alimentacao_mes_atual?: number | null
          vale_transporte?: number | null
          vale_transporte_mes_anterior?: number | null
          vale_transporte_mes_atual?: number | null
          valor_va_folgas_trabalhadas?: number | null
          valor_vt_folgas_trabalhadas?: number | null
          vantagens_13?: number | null
        }
        Update: {
          adiantamento_13_salario?: number | null
          adiantamento_vantagens_13?: number | null
          adicional_acumulo_funcao?: number | null
          adicional_insalubridade?: number | null
          adicional_noturno?: number | null
          ano?: number
          base_fgts?: number | null
          base_inss?: number | null
          base_irrf?: number | null
          cesta_basica?: number | null
          complemento_salario?: number | null
          created_at?: string | null
          decimo_terceiro_integral?: number | null
          decimo_terceiro_primeira_parcela?: number | null
          decimo_terceiro_proporcional_rescisao?: number | null
          decimo_terceiro_segunda_parcela?: number | null
          decimo_terceiro_vantagens_primeira_parcela?: number | null
          decimo_terceiro_vantagens_rescisao?: number | null
          decimo_terceiro_vantagens_segunda_parcela?: number | null
          desc_ajuste_beneficios?: number | null
          desc_avaria_utilitario?: number
          desc_rondas_nao_realizadas_benef?: number | null
          desconto_adiantamento_quinzenal?: number | null
          desconto_adiantamento_salario?: number | null
          desconto_atrasos?: number | null
          desconto_complemento_anterior?: number | null
          desconto_contribuicao_assistencial?: number | null
          desconto_convenio_odonto?: number | null
          desconto_dsr_faltas?: number | null
          desconto_faltas?: number | null
          desconto_inss?: number | null
          desconto_irrf?: number | null
          desconto_pensao_alimenticia?: number | null
          desconto_plr?: number | null
          desconto_rondas_nao_realizadas?: number | null
          desconto_seguro_vida?: number | null
          desconto_va_faltas?: number | null
          desconto_vt?: number | null
          desconto_vt_faltas?: number | null
          dias_dsr_faltas?: number | null
          dias_va_mes_anterior?: number | null
          dias_va_mes_atual?: number | null
          dias_vt_mes_anterior?: number | null
          dias_vt_mes_atual?: number | null
          dsr_adicional_noturno?: number | null
          dsr_horas_extras?: number | null
          empresa_id?: string | null
          eventos_excepcionais?: Json | null
          ferias_proporcionais_rescisao?: number | null
          fgts?: number | null
          folga_trabalhada?: number | null
          folgas_trabalhadas_va?: number | null
          folgas_trabalhadas_vt?: number | null
          funcionario_id?: string
          horas_extras?: number | null
          horas_extras_100?: number | null
          horas_extras_50?: number | null
          id?: string
          inss_13?: number | null
          inss_ferias?: number | null
          inss_patronal?: number | null
          intrajornada_100?: number | null
          intrajornada_50?: number | null
          mes?: number
          nome_funcionario?: string | null
          observacoes?: string | null
          plr?: number | null
          plr_proporcional_rescisao?: number | null
          posto_trabalho_id?: string | null
          premio_permanencia?: number | null
          reembolsos_uber?: number | null
          salario_base?: number
          salario_familia?: number | null
          salario_liquido?: number
          servicos_externos_controle_rondas?: number | null
          servicos_externos_folhas_pagamento?: number | null
          supervisao_palmeiras?: number | null
          total_beneficios?: number | null
          total_descontos?: number
          total_proventos?: number
          um_terco_ferias_proporcional_rescisao?: number | null
          updated_at?: string | null
          vale_alimentacao?: number | null
          vale_alimentacao_mes_anterior?: number | null
          vale_alimentacao_mes_atual?: number | null
          vale_transporte?: number | null
          vale_transporte_mes_anterior?: number | null
          vale_transporte_mes_atual?: number | null
          valor_va_folgas_trabalhadas?: number | null
          valor_vt_folgas_trabalhadas?: number | null
          vantagens_13?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_calculada_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_calculada_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_calculada_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_calculada_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_calculada_backup_eventos_20260301: {
        Row: {
          ano: number | null
          created_at: string | null
          decimo_terceiro_integral_old: number | null
          decimo_terceiro_primeira_parcela_old: number | null
          decimo_terceiro_segunda_parcela_old: number | null
          decimo_terceiro_vantagens_primeira_parcela_old: number | null
          decimo_terceiro_vantagens_segunda_parcela_old: number | null
          eventos_excepcionais: Json | null
          funcionario_id: string | null
          id: string | null
          mes: number | null
          servicos_externos_controle_rondas_old: number | null
          servicos_externos_folhas_pagamento_old: number | null
          vantagens_13_old: number | null
        }
        Insert: {
          ano?: number | null
          created_at?: string | null
          decimo_terceiro_integral_old?: number | null
          decimo_terceiro_primeira_parcela_old?: number | null
          decimo_terceiro_segunda_parcela_old?: number | null
          decimo_terceiro_vantagens_primeira_parcela_old?: number | null
          decimo_terceiro_vantagens_segunda_parcela_old?: number | null
          eventos_excepcionais?: Json | null
          funcionario_id?: string | null
          id?: string | null
          mes?: number | null
          servicos_externos_controle_rondas_old?: number | null
          servicos_externos_folhas_pagamento_old?: number | null
          vantagens_13_old?: number | null
        }
        Update: {
          ano?: number | null
          created_at?: string | null
          decimo_terceiro_integral_old?: number | null
          decimo_terceiro_primeira_parcela_old?: number | null
          decimo_terceiro_segunda_parcela_old?: number | null
          decimo_terceiro_vantagens_primeira_parcela_old?: number | null
          decimo_terceiro_vantagens_segunda_parcela_old?: number | null
          eventos_excepcionais?: Json | null
          funcionario_id?: string | null
          id?: string | null
          mes?: number | null
          servicos_externos_controle_rondas_old?: number | null
          servicos_externos_folhas_pagamento_old?: number | null
          vantagens_13_old?: number | null
        }
        Relationships: []
      }
      folha_ponto_alteracoes: {
        Row: {
          alterado_por: string
          alterado_por_nome: string
          campo_alterado: string
          created_at: string
          data_registro: string | null
          id: string
          motivo: string
          nome_funcionario: string | null
          registro_ponto_id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_por: string
          alterado_por_nome: string
          campo_alterado: string
          created_at?: string
          data_registro?: string | null
          id?: string
          motivo: string
          nome_funcionario?: string | null
          registro_ponto_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_por?: string
          alterado_por_nome?: string
          campo_alterado?: string
          created_at?: string
          data_registro?: string | null
          id?: string
          motivo?: string
          nome_funcionario?: string | null
          registro_ponto_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_ponto_alteracoes_registro_ponto_id_fkey"
            columns: ["registro_ponto_id"]
            isOneToOne: false
            referencedRelation: "folha_ponto_automatica"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_ponto_automatica: {
        Row: {
          created_at: string
          data_registro: string
          distancia_posto_metros: number | null
          funcionario_id: string
          id: string
          inconsistencias: Json | null
          latitude_registro: number | null
          longitude_registro: number | null
          nome_funcionario: string
          nome_posto: string
          observacoes: string | null
          posto_trabalho_id: string
          precisao_metros: number | null
          primeiro_registro: string | null
          quarto_registro: string | null
          segundo_registro: string | null
          status: string
          terceiro_registro: string | null
          updated_at: string
          validacao_geolocalizacao: boolean | null
        }
        Insert: {
          created_at?: string
          data_registro?: string
          distancia_posto_metros?: number | null
          funcionario_id: string
          id?: string
          inconsistencias?: Json | null
          latitude_registro?: number | null
          longitude_registro?: number | null
          nome_funcionario: string
          nome_posto: string
          observacoes?: string | null
          posto_trabalho_id: string
          precisao_metros?: number | null
          primeiro_registro?: string | null
          quarto_registro?: string | null
          segundo_registro?: string | null
          status?: string
          terceiro_registro?: string | null
          updated_at?: string
          validacao_geolocalizacao?: boolean | null
        }
        Update: {
          created_at?: string
          data_registro?: string
          distancia_posto_metros?: number | null
          funcionario_id?: string
          id?: string
          inconsistencias?: Json | null
          latitude_registro?: number | null
          longitude_registro?: number | null
          nome_funcionario?: string
          nome_posto?: string
          observacoes?: string | null
          posto_trabalho_id?: string
          precisao_metros?: number | null
          primeiro_registro?: string | null
          quarto_registro?: string | null
          segundo_registro?: string | null
          status?: string
          terceiro_registro?: string | null
          updated_at?: string
          validacao_geolocalizacao?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_ponto_automatica_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_ponto_automatica_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_ponto_automatica_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      folhas_ponto: {
        Row: {
          ano: number
          atrasos: number | null
          cargo_id: string | null
          created_at: string | null
          dados_dias: Json | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          escala_id: string | null
          faltas: number | null
          folgas_trabalhadas: number
          funcionario_id: string
          horas_extras: number | null
          horas_trabalhadas: number | null
          id: string
          mes: number
          nome_funcionario: string | null
          observacoes: string | null
          posto_trabalho_id: string | null
          total_atrasos: number | null
          total_faltas_injustificadas: number | null
          total_faltas_justificadas: number | null
          total_horas_extras_100: number | null
          total_horas_extras_50: number | null
          total_horas_normais: number | null
          total_horas_noturnas: number | null
          total_intrajornada_100: number | null
          total_intrajornada_50: number | null
          total_suspensoes: number | null
          updated_at: string | null
        }
        Insert: {
          ano: number
          atrasos?: number | null
          cargo_id?: string | null
          created_at?: string | null
          dados_dias?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          escala_id?: string | null
          faltas?: number | null
          folgas_trabalhadas?: number
          funcionario_id: string
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          mes: number
          nome_funcionario?: string | null
          observacoes?: string | null
          posto_trabalho_id?: string | null
          total_atrasos?: number | null
          total_faltas_injustificadas?: number | null
          total_faltas_justificadas?: number | null
          total_horas_extras_100?: number | null
          total_horas_extras_50?: number | null
          total_horas_normais?: number | null
          total_horas_noturnas?: number | null
          total_intrajornada_100?: number | null
          total_intrajornada_50?: number | null
          total_suspensoes?: number | null
          updated_at?: string | null
        }
        Update: {
          ano?: number
          atrasos?: number | null
          cargo_id?: string | null
          created_at?: string | null
          dados_dias?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          escala_id?: string | null
          faltas?: number | null
          folgas_trabalhadas?: number
          funcionario_id?: string
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          mes?: number
          nome_funcionario?: string | null
          observacoes?: string | null
          posto_trabalho_id?: string | null
          total_atrasos?: number | null
          total_faltas_injustificadas?: number | null
          total_faltas_justificadas?: number | null
          total_horas_extras_100?: number | null
          total_horas_extras_50?: number | null
          total_horas_normais?: number | null
          total_horas_noturnas?: number | null
          total_intrajornada_100?: number | null
          total_intrajornada_50?: number | null
          total_suspensoes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folhas_ponto_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_ponto_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionario_documentos: {
        Row: {
          created_at: string | null
          data_validade: string | null
          descricao: string | null
          funcionario_id: string
          id: string
          nome_arquivo: string
          tipo_documento: string
          updated_at: string | null
          url_arquivo: string
        }
        Insert: {
          created_at?: string | null
          data_validade?: string | null
          descricao?: string | null
          funcionario_id: string
          id?: string
          nome_arquivo: string
          tipo_documento: string
          updated_at?: string | null
          url_arquivo: string
        }
        Update: {
          created_at?: string | null
          data_validade?: string | null
          descricao?: string | null
          funcionario_id?: string
          id?: string
          nome_arquivo?: string
          tipo_documento?: string
          updated_at?: string | null
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          acumulado_banco_horas: number | null
          acumulo_funcao: boolean | null
          adicional_insalubridade: boolean | null
          ativo: boolean | null
          banco_horas_ativo: boolean | null
          cargo_id: string | null
          codigo_escala: string | null
          cpf: string | null
          created_at: string | null
          data_admissao: string
          data_nascimento: string | null
          demitido: boolean | null
          email: string | null
          empresa_id: string | null
          faixa_vt: number | null
          foto_url: string | null
          funcionario_registrado: boolean | null
          id: string
          nome_cargo: string | null
          nome_completo: string
          nome_empresa: string | null
          nome_posto: string | null
          numero_ctps: string | null
          posto_trabalho_id: string | null
          quantidade_filhos: number | null
          recebe_adiantamento_quinzenal: boolean | null
          recebe_seguro_vida: boolean | null
          recebe_vt: boolean | null
          ronda: boolean | null
          serie_ctps: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acumulado_banco_horas?: number | null
          acumulo_funcao?: boolean | null
          adicional_insalubridade?: boolean | null
          ativo?: boolean | null
          banco_horas_ativo?: boolean | null
          cargo_id?: string | null
          codigo_escala?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao: string
          data_nascimento?: string | null
          demitido?: boolean | null
          email?: string | null
          empresa_id?: string | null
          faixa_vt?: number | null
          foto_url?: string | null
          funcionario_registrado?: boolean | null
          id?: string
          nome_cargo?: string | null
          nome_completo: string
          nome_empresa?: string | null
          nome_posto?: string | null
          numero_ctps?: string | null
          posto_trabalho_id?: string | null
          quantidade_filhos?: number | null
          recebe_adiantamento_quinzenal?: boolean | null
          recebe_seguro_vida?: boolean | null
          recebe_vt?: boolean | null
          ronda?: boolean | null
          serie_ctps?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acumulado_banco_horas?: number | null
          acumulo_funcao?: boolean | null
          adicional_insalubridade?: boolean | null
          ativo?: boolean | null
          banco_horas_ativo?: boolean | null
          cargo_id?: string | null
          codigo_escala?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string
          data_nascimento?: string | null
          demitido?: boolean | null
          email?: string | null
          empresa_id?: string | null
          faixa_vt?: number | null
          foto_url?: string | null
          funcionario_registrado?: boolean | null
          id?: string
          nome_cargo?: string | null
          nome_completo?: string
          nome_empresa?: string | null
          nome_posto?: string | null
          numero_ctps?: string | null
          posto_trabalho_id?: string | null
          quantidade_filhos?: number | null
          recebe_adiantamento_quinzenal?: boolean | null
          recebe_seguro_vida?: boolean | null
          recebe_vt?: boolean | null
          ronda?: boolean | null
          serie_ctps?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_salarios: {
        Row: {
          created_at: string | null
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          funcionario_id: string
          id: string
          motivo: string
          observacoes: string | null
          percentual_reajuste: number | null
          salario_base: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia: string
          funcionario_id: string
          id?: string
          motivo?: string
          observacoes?: string | null
          percentual_reajuste?: number | null
          salario_base: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          funcionario_id?: string
          id?: string
          motivo?: string
          observacoes?: string | null
          percentual_reajuste?: number | null
          salario_base?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_salarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_salarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_salarios_cargo: {
        Row: {
          cargo_id: string
          created_at: string | null
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          id: string
          motivo: string | null
          observacoes: string | null
          percentual_reajuste: number | null
          salario_base: number
          updated_at: string | null
        }
        Insert: {
          cargo_id: string
          created_at?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          percentual_reajuste?: number | null
          salario_base: number
          updated_at?: string | null
        }
        Update: {
          cargo_id?: string
          created_at?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          percentual_reajuste?: number | null
          salario_base?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_salarios_cargo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_auditoria_operacoes: {
        Row: {
          created_at: string
          entidade: string | null
          erro_mensagem: string | null
          id: string
          ids_afetados: Json | null
          payload_anterior: Json | null
          payload_executado: Json | null
          payload_sugerido: Json | null
          prompt_original: string | null
          status: string
          tool_chamada: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          entidade?: string | null
          erro_mensagem?: string | null
          id?: string
          ids_afetados?: Json | null
          payload_anterior?: Json | null
          payload_executado?: Json | null
          payload_sugerido?: Json | null
          prompt_original?: string | null
          status?: string
          tool_chamada: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          entidade?: string | null
          erro_mensagem?: string | null
          id?: string
          ids_afetados?: Json | null
          payload_anterior?: Json | null
          payload_executado?: Json | null
          payload_sugerido?: Json | null
          prompt_original?: string | null
          status?: string
          tool_chamada?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      manager_empresas: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_broadcast: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          empresa_id: string | null
          funcionario_id: string | null
          id: string
          mensagem: string
          posto_trabalho_id: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          empresa_id?: string | null
          funcionario_id?: string | null
          id?: string
          mensagem: string
          posto_trabalho_id?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          empresa_id?: string | null
          funcionario_id?: string | null
          id?: string
          mensagem?: string
          posto_trabalho_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_broadcast_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_broadcast_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_broadcast_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_broadcast_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_broadcast_lidas: {
        Row: {
          created_at: string
          funcionario_id: string
          id: string
          lida_em: string
          mensagem_id: string
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          id?: string
          lida_em?: string
          mensagem_id: string
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          id?: string
          lida_em?: string
          mensagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_broadcast_lidas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_broadcast_lidas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_broadcast_lidas_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens_broadcast"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_lidas: {
        Row: {
          created_at: string | null
          funcionario_id: string
          id: string
          lida_em: string
          sugestao_id: string
        }
        Insert: {
          created_at?: string | null
          funcionario_id: string
          id?: string
          lida_em?: string
          sugestao_id: string
        }
        Update: {
          created_at?: string | null
          funcionario_id?: string
          id?: string
          lida_em?: string
          sugestao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_lidas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_lidas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_lidas_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_reclamacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_calculo: {
        Row: {
          ano_vigencia: number
          ativo: boolean | null
          cesta_basica: number | null
          contribuicao_assistencial: number | null
          convenio_odontologico: number | null
          created_at: string | null
          desconto_plr: number | null
          desconto_seguro_vida: number | null
          ft_diaria_aux_limpeza: number | null
          ft_diaria_vigia: number | null
          ft_diaria_zelador: number | null
          id: string
          inss_faixa1_aliquota: number | null
          inss_faixa1_deducao: number | null
          inss_faixa1_limite: number | null
          inss_faixa2_aliquota: number | null
          inss_faixa2_deducao: number | null
          inss_faixa2_limite: number | null
          inss_faixa3_aliquota: number | null
          inss_faixa3_deducao: number | null
          inss_faixa3_limite: number | null
          inss_faixa4_aliquota: number | null
          inss_faixa4_deducao: number | null
          inss_faixa4_limite: number | null
          irrf_faixa1_aliquota: number | null
          irrf_faixa1_deducao: number | null
          irrf_faixa1_limite: number | null
          irrf_faixa2_aliquota: number | null
          irrf_faixa2_deducao: number | null
          irrf_faixa2_limite: number | null
          irrf_faixa3_aliquota: number | null
          irrf_faixa3_deducao: number | null
          irrf_faixa3_limite: number | null
          irrf_faixa4_aliquota: number | null
          irrf_faixa4_deducao: number | null
          irrf_faixa4_limite: number | null
          irrf_faixa5_aliquota: number | null
          irrf_faixa5_deducao: number | null
          irrf_faixa5_limite: number | null
          isencao_irpf: number | null
          percentual_acumulo_funcao: number | null
          percentual_adiantamento_quinzenal: number | null
          percentual_desconto_vt: number | null
          percentual_fgts: number | null
          percentual_insalubridade: number | null
          percentual_inss: number | null
          percentual_inss_patronal: number | null
          plr_base: number | null
          plr_desconto_advertencia: number | null
          plr_desconto_falta_injustificada: number | null
          plr_desconto_falta_justificada: number | null
          plr_desconto_suspensao: number | null
          plr_dias_minimos_mes: number | null
          plr_taxa_negociacao: number | null
          premio_permanencia_base: number | null
          salario_familia: number | null
          salario_minimo: number | null
          updated_at: string | null
          vale_alimentacao: number | null
          vale_transporte: number | null
          vale_transporte_faixa2: number | null
        }
        Insert: {
          ano_vigencia?: number
          ativo?: boolean | null
          cesta_basica?: number | null
          contribuicao_assistencial?: number | null
          convenio_odontologico?: number | null
          created_at?: string | null
          desconto_plr?: number | null
          desconto_seguro_vida?: number | null
          ft_diaria_aux_limpeza?: number | null
          ft_diaria_vigia?: number | null
          ft_diaria_zelador?: number | null
          id?: string
          inss_faixa1_aliquota?: number | null
          inss_faixa1_deducao?: number | null
          inss_faixa1_limite?: number | null
          inss_faixa2_aliquota?: number | null
          inss_faixa2_deducao?: number | null
          inss_faixa2_limite?: number | null
          inss_faixa3_aliquota?: number | null
          inss_faixa3_deducao?: number | null
          inss_faixa3_limite?: number | null
          inss_faixa4_aliquota?: number | null
          inss_faixa4_deducao?: number | null
          inss_faixa4_limite?: number | null
          irrf_faixa1_aliquota?: number | null
          irrf_faixa1_deducao?: number | null
          irrf_faixa1_limite?: number | null
          irrf_faixa2_aliquota?: number | null
          irrf_faixa2_deducao?: number | null
          irrf_faixa2_limite?: number | null
          irrf_faixa3_aliquota?: number | null
          irrf_faixa3_deducao?: number | null
          irrf_faixa3_limite?: number | null
          irrf_faixa4_aliquota?: number | null
          irrf_faixa4_deducao?: number | null
          irrf_faixa4_limite?: number | null
          irrf_faixa5_aliquota?: number | null
          irrf_faixa5_deducao?: number | null
          irrf_faixa5_limite?: number | null
          isencao_irpf?: number | null
          percentual_acumulo_funcao?: number | null
          percentual_adiantamento_quinzenal?: number | null
          percentual_desconto_vt?: number | null
          percentual_fgts?: number | null
          percentual_insalubridade?: number | null
          percentual_inss?: number | null
          percentual_inss_patronal?: number | null
          plr_base?: number | null
          plr_desconto_advertencia?: number | null
          plr_desconto_falta_injustificada?: number | null
          plr_desconto_falta_justificada?: number | null
          plr_desconto_suspensao?: number | null
          plr_dias_minimos_mes?: number | null
          plr_taxa_negociacao?: number | null
          premio_permanencia_base?: number | null
          salario_familia?: number | null
          salario_minimo?: number | null
          updated_at?: string | null
          vale_alimentacao?: number | null
          vale_transporte?: number | null
          vale_transporte_faixa2?: number | null
        }
        Update: {
          ano_vigencia?: number
          ativo?: boolean | null
          cesta_basica?: number | null
          contribuicao_assistencial?: number | null
          convenio_odontologico?: number | null
          created_at?: string | null
          desconto_plr?: number | null
          desconto_seguro_vida?: number | null
          ft_diaria_aux_limpeza?: number | null
          ft_diaria_vigia?: number | null
          ft_diaria_zelador?: number | null
          id?: string
          inss_faixa1_aliquota?: number | null
          inss_faixa1_deducao?: number | null
          inss_faixa1_limite?: number | null
          inss_faixa2_aliquota?: number | null
          inss_faixa2_deducao?: number | null
          inss_faixa2_limite?: number | null
          inss_faixa3_aliquota?: number | null
          inss_faixa3_deducao?: number | null
          inss_faixa3_limite?: number | null
          inss_faixa4_aliquota?: number | null
          inss_faixa4_deducao?: number | null
          inss_faixa4_limite?: number | null
          irrf_faixa1_aliquota?: number | null
          irrf_faixa1_deducao?: number | null
          irrf_faixa1_limite?: number | null
          irrf_faixa2_aliquota?: number | null
          irrf_faixa2_deducao?: number | null
          irrf_faixa2_limite?: number | null
          irrf_faixa3_aliquota?: number | null
          irrf_faixa3_deducao?: number | null
          irrf_faixa3_limite?: number | null
          irrf_faixa4_aliquota?: number | null
          irrf_faixa4_deducao?: number | null
          irrf_faixa4_limite?: number | null
          irrf_faixa5_aliquota?: number | null
          irrf_faixa5_deducao?: number | null
          irrf_faixa5_limite?: number | null
          isencao_irpf?: number | null
          percentual_acumulo_funcao?: number | null
          percentual_adiantamento_quinzenal?: number | null
          percentual_desconto_vt?: number | null
          percentual_fgts?: number | null
          percentual_insalubridade?: number | null
          percentual_inss?: number | null
          percentual_inss_patronal?: number | null
          plr_base?: number | null
          plr_desconto_advertencia?: number | null
          plr_desconto_falta_injustificada?: number | null
          plr_desconto_falta_justificada?: number | null
          plr_desconto_suspensao?: number | null
          plr_dias_minimos_mes?: number | null
          plr_taxa_negociacao?: number | null
          premio_permanencia_base?: number | null
          salario_familia?: number | null
          salario_minimo?: number | null
          updated_at?: string | null
          vale_alimentacao?: number | null
          vale_transporte?: number | null
          vale_transporte_faixa2?: number | null
        }
        Relationships: []
      }
      plr_apuracao: {
        Row: {
          advertencias: number
          ano: number
          created_at: string | null
          data_pagamento_efetivo: string | null
          desconto_total: number
          faltas_injustificadas: number
          faltas_justificadas: number
          funcionario_id: string
          id: string
          meses_trabalhados: number
          observacoes: string | null
          semestre: number
          status: string
          suspensoes: number
          updated_at: string | null
          valor_bruto: number
          valor_final: number
        }
        Insert: {
          advertencias?: number
          ano: number
          created_at?: string | null
          data_pagamento_efetivo?: string | null
          desconto_total?: number
          faltas_injustificadas?: number
          faltas_justificadas?: number
          funcionario_id: string
          id?: string
          meses_trabalhados?: number
          observacoes?: string | null
          semestre: number
          status?: string
          suspensoes?: number
          updated_at?: string | null
          valor_bruto?: number
          valor_final?: number
        }
        Update: {
          advertencias?: number
          ano?: number
          created_at?: string | null
          data_pagamento_efetivo?: string | null
          desconto_total?: number
          faltas_injustificadas?: number
          faltas_justificadas?: number
          funcionario_id?: string
          id?: string
          meses_trabalhados?: number
          observacoes?: string | null
          semestre?: number
          status?: string
          suspensoes?: number
          updated_at?: string | null
          valor_bruto?: number
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "plr_apuracao_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plr_apuracao_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_visibility_config: {
        Row: {
          ano_limite: number
          ativo: boolean
          created_at: string | null
          id: number
          mes_limite: number
          meses_retroativos: number
          observacoes: string | null
          tipo_documento: string
          updated_at: string | null
        }
        Insert: {
          ano_limite: number
          ativo?: boolean
          created_at?: string | null
          id?: number
          mes_limite: number
          meses_retroativos?: number
          observacoes?: string | null
          tipo_documento: string
          updated_at?: string | null
        }
        Update: {
          ano_limite?: number
          ativo?: boolean
          created_at?: string | null
          id?: number
          mes_limite?: number
          meses_retroativos?: number
          observacoes?: string | null
          tipo_documento?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      postos_trabalho: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cnpj: string
          created_at: string | null
          data_atualizacao_status: string | null
          empresa_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          latitude: number | null
          local_area: string | null
          longitude: number | null
          nome_contato: string | null
          nome_posto: string
          raio_validacao_metros: number | null
          telefone: string | null
          updated_at: string | null
          valor_contrato: number | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj: string
          created_at?: string | null
          data_atualizacao_status?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          local_area?: string | null
          longitude?: number | null
          nome_contato?: string | null
          nome_posto: string
          raio_validacao_metros?: number | null
          telefone?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string
          created_at?: string | null
          data_atualizacao_status?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          local_area?: string | null
          longitude?: number | null
          nome_contato?: string | null
          nome_posto?: string
          raio_validacao_metros?: number | null
          telefone?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "postos_trabalho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          funcionario_id: string | null
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          funcionario_id?: string | null
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          funcionario_id?: string | null
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_escalas: {
        Row: {
          ativa: boolean | null
          cargo_id: string | null
          codigo_escala: string
          created_at: string | null
          data_vigencia: string
          empresa_id: string | null
          estado_inicial_01_01: string | null
          horarios_domingo: Json | null
          horarios_feriado: Json | null
          horarios_quarta: Json | null
          horarios_quinta: Json | null
          horarios_sabado: Json | null
          horarios_segunda: Json | null
          horarios_sexta: Json | null
          horarios_terca: Json | null
          id: string
          nome_escala: string
          observacoes: string | null
          posto_trabalho_id: string | null
          regras_json: Json | null
          tipo_alternancia: string | null
          trabalha_domingo: boolean | null
          trabalha_feriado: boolean | null
          trabalha_quarta: boolean | null
          trabalha_quinta: boolean | null
          trabalha_sabado: boolean | null
          trabalha_segunda: boolean | null
          trabalha_sexta: boolean | null
          trabalha_terca: boolean | null
          turno: string | null
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          cargo_id?: string | null
          codigo_escala: string
          created_at?: string | null
          data_vigencia?: string
          empresa_id?: string | null
          estado_inicial_01_01?: string | null
          horarios_domingo?: Json | null
          horarios_feriado?: Json | null
          horarios_quarta?: Json | null
          horarios_quinta?: Json | null
          horarios_sabado?: Json | null
          horarios_segunda?: Json | null
          horarios_sexta?: Json | null
          horarios_terca?: Json | null
          id?: string
          nome_escala: string
          observacoes?: string | null
          posto_trabalho_id?: string | null
          regras_json?: Json | null
          tipo_alternancia?: string | null
          trabalha_domingo?: boolean | null
          trabalha_feriado?: boolean | null
          trabalha_quarta?: boolean | null
          trabalha_quinta?: boolean | null
          trabalha_sabado?: boolean | null
          trabalha_segunda?: boolean | null
          trabalha_sexta?: boolean | null
          trabalha_terca?: boolean | null
          turno?: string | null
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          cargo_id?: string | null
          codigo_escala?: string
          created_at?: string | null
          data_vigencia?: string
          empresa_id?: string | null
          estado_inicial_01_01?: string | null
          horarios_domingo?: Json | null
          horarios_feriado?: Json | null
          horarios_quarta?: Json | null
          horarios_quinta?: Json | null
          horarios_sabado?: Json | null
          horarios_segunda?: Json | null
          horarios_sexta?: Json | null
          horarios_terca?: Json | null
          id?: string
          nome_escala?: string
          observacoes?: string | null
          posto_trabalho_id?: string | null
          regras_json?: Json | null
          tipo_alternancia?: string | null
          trabalha_domingo?: boolean | null
          trabalha_feriado?: boolean | null
          trabalha_quarta?: boolean | null
          trabalha_quinta?: boolean | null
          trabalha_sabado?: boolean | null
          trabalha_segunda?: boolean | null
          trabalha_sexta?: boolean | null
          trabalha_terca?: boolean | null
          turno?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_escalas_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_escalas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_escalas_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      rondas_nao_conformidades: {
        Row: {
          alerta_exibido: boolean | null
          ciclo_numero: number | null
          created_at: string
          data_ronda: string
          descricao: string
          diferenca_minutos: number | null
          funcionario_id: string | null
          id: string
          leitura_id: string | null
          nivel: string
          nome_funcionario: string | null
          ponto_nome: string | null
          recomendacao_gerencial: string
          sessao_id: string | null
          tipo: string
        }
        Insert: {
          alerta_exibido?: boolean | null
          ciclo_numero?: number | null
          created_at?: string
          data_ronda?: string
          descricao: string
          diferenca_minutos?: number | null
          funcionario_id?: string | null
          id?: string
          leitura_id?: string | null
          nivel: string
          nome_funcionario?: string | null
          ponto_nome?: string | null
          recomendacao_gerencial: string
          sessao_id?: string | null
          tipo: string
        }
        Update: {
          alerta_exibido?: boolean | null
          ciclo_numero?: number | null
          created_at?: string
          data_ronda?: string
          descricao?: string
          diferenca_minutos?: number | null
          funcionario_id?: string | null
          id?: string
          leitura_id?: string | null
          nivel?: string
          nome_funcionario?: string | null
          ponto_nome?: string | null
          recomendacao_gerencial?: string
          sessao_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rondas_nao_conformidades_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rondas_nao_conformidades_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_audit_logs: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          dispositivo: string | null
          id: string
          ip: string | null
          registro_id: string | null
          tabela: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          dispositivo?: string | null
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabela?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          dispositivo?: string | null
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabela?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rq_ciclos: {
        Row: {
          created_at: string
          data_turno: string
          grade_horaria: Json
          hora_fim: string
          hora_inicio: string
          id: string
          numero_ciclo: number
          rota_id: string
          total_pontos: number
        }
        Insert: {
          created_at?: string
          data_turno: string
          grade_horaria?: Json
          hora_fim: string
          hora_inicio: string
          id?: string
          numero_ciclo: number
          rota_id: string
          total_pontos?: number
        }
        Update: {
          created_at?: string
          data_turno?: string
          grade_horaria?: Json
          hora_fim?: string
          hora_inicio?: string
          id?: string
          numero_ciclo?: number
          rota_id?: string
          total_pontos?: number
        }
        Relationships: [
          {
            foreignKeyName: "rq_ciclos_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rq_rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_execucoes: {
        Row: {
          ciclo_id: string
          created_at: string
          empresa_id: string | null
          finalizada_em: string | null
          funcionario_id: string
          id: string
          iniciada_em: string | null
          nome_funcionario: string | null
          observacoes: string | null
          posto_trabalho_id: string
          rota_id: string
          status: Database["public"]["Enums"]["rq_status_execucao"]
          total_pontos_esperados: number
          total_pontos_lidos: number
          updated_at: string
        }
        Insert: {
          ciclo_id: string
          created_at?: string
          empresa_id?: string | null
          finalizada_em?: string | null
          funcionario_id: string
          id?: string
          iniciada_em?: string | null
          nome_funcionario?: string | null
          observacoes?: string | null
          posto_trabalho_id: string
          rota_id: string
          status?: Database["public"]["Enums"]["rq_status_execucao"]
          total_pontos_esperados?: number
          total_pontos_lidos?: number
          updated_at?: string
        }
        Update: {
          ciclo_id?: string
          created_at?: string
          empresa_id?: string | null
          finalizada_em?: string | null
          funcionario_id?: string
          id?: string
          iniciada_em?: string | null
          nome_funcionario?: string | null
          observacoes?: string | null
          posto_trabalho_id?: string
          rota_id?: string
          status?: Database["public"]["Enums"]["rq_status_execucao"]
          total_pontos_esperados?: number
          total_pontos_lidos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rq_execucoes_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "rq_ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_execucoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_execucoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_execucoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_execucoes_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_execucoes_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rq_rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_leituras: {
        Row: {
          codigo_lido: string | null
          created_at: string
          diferenca_segundos: number | null
          dispositivo: string | null
          execucao_id: string
          funcionario_id: string
          horario_leitura: string
          horario_maximo: string | null
          horario_minimo: string | null
          horario_previsto: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome_funcionario: string | null
          observacao: string | null
          ordem_esperada: number | null
          ordem_lida: number | null
          ponto_id: string
          status: Database["public"]["Enums"]["rq_status_leitura"]
        }
        Insert: {
          codigo_lido?: string | null
          created_at?: string
          diferenca_segundos?: number | null
          dispositivo?: string | null
          execucao_id: string
          funcionario_id: string
          horario_leitura?: string
          horario_maximo?: string | null
          horario_minimo?: string | null
          horario_previsto?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome_funcionario?: string | null
          observacao?: string | null
          ordem_esperada?: number | null
          ordem_lida?: number | null
          ponto_id: string
          status?: Database["public"]["Enums"]["rq_status_leitura"]
        }
        Update: {
          codigo_lido?: string | null
          created_at?: string
          diferenca_segundos?: number | null
          dispositivo?: string | null
          execucao_id?: string
          funcionario_id?: string
          horario_leitura?: string
          horario_maximo?: string | null
          horario_minimo?: string | null
          horario_previsto?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome_funcionario?: string | null
          observacao?: string | null
          ordem_esperada?: number | null
          ordem_lida?: number | null
          ponto_id?: string
          status?: Database["public"]["Enums"]["rq_status_leitura"]
        }
        Relationships: [
          {
            foreignKeyName: "rq_leituras_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "rq_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_leituras_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_leituras_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_leituras_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "rq_pontos_ronda"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_ocorrencias: {
        Row: {
          created_at: string
          descricao: string
          execucao_id: string
          id: string
          justificativa: string | null
          leitura_id: string | null
          resolvida: boolean
          tipo: Database["public"]["Enums"]["rq_tipo_ocorrencia"]
        }
        Insert: {
          created_at?: string
          descricao: string
          execucao_id: string
          id?: string
          justificativa?: string | null
          leitura_id?: string | null
          resolvida?: boolean
          tipo: Database["public"]["Enums"]["rq_tipo_ocorrencia"]
        }
        Update: {
          created_at?: string
          descricao?: string
          execucao_id?: string
          id?: string
          justificativa?: string | null
          leitura_id?: string | null
          resolvida?: boolean
          tipo?: Database["public"]["Enums"]["rq_tipo_ocorrencia"]
        }
        Relationships: [
          {
            foreignKeyName: "rq_ocorrencias_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "rq_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_ocorrencias_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "rq_leituras"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_pausas: {
        Row: {
          ativo: boolean
          created_at: string
          dias_semana: string[]
          hora_fim: string
          hora_inicio: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_semana?: string[]
          hora_fim: string
          hora_inicio: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_semana?: string[]
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      rq_pontos_ronda: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          ordem: number
          posto_trabalho_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          ordem?: number
          posto_trabalho_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          ordem?: number
          posto_trabalho_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rq_pontos_ronda_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_rota_pontos: {
        Row: {
          created_at: string
          id: string
          ordem: number
          ponto_id: string
          rota_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          ponto_id: string
          rota_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          ponto_id?: string
          rota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rq_rota_pontos_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "rq_pontos_ronda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rq_rota_pontos_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rq_rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      rq_rotas: {
        Row: {
          ativo: boolean
          bloquear_fora_ordem: boolean
          created_at: string
          descricao: string | null
          dias_semana: string[]
          funcionarios_ids: string[] | null
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_pontos_minutos: number
          nome: string
          pontos_ids: string[] | null
          posto_trabalho_id: string
          tolerancia_minutos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bloquear_fora_ordem?: boolean
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          funcionarios_ids?: string[] | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_pontos_minutos?: number
          nome: string
          pontos_ids?: string[] | null
          posto_trabalho_id: string
          tolerancia_minutos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bloquear_fora_ordem?: boolean
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          funcionarios_ids?: string[] | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_pontos_minutos?: number
          nome?: string
          pontos_ids?: string[] | null
          posto_trabalho_id?: string
          tolerancia_minutos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rq_rotas_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestoes_reclamacoes: {
        Row: {
          created_at: string
          data_registro: string
          data_resposta: string | null
          funcionario_id: string
          id: string
          nome_funcionario: string
          observacoes: string | null
          reclamacao: string | null
          resposta_empresa: string | null
          status: string
          sugestao: string | null
          tema: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_registro?: string
          data_resposta?: string | null
          funcionario_id: string
          id?: string
          nome_funcionario: string
          observacoes?: string | null
          reclamacao?: string | null
          resposta_empresa?: string | null
          status?: string
          sugestao?: string | null
          tema: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_registro?: string
          data_resposta?: string | null
          funcionario_id?: string
          id?: string
          nome_funcionario?: string
          observacoes?: string | null
          reclamacao?: string | null
          resposta_empresa?: string | null
          status?: string
          sugestao?: string | null
          tema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_reclamacoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_reclamacoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_banco_horas_mensal: {
        Row: {
          ano: number | null
          atualizado_em: string | null
          cargo_id: string | null
          codigo_escala: string | null
          created_at: string | null
          data_calculo: string | null
          dias_com_banco: number | null
          dias_trabalhados: number | null
          empresa_id: string | null
          funcionario_id: string | null
          id: string | null
          mes: number | null
          minutos_entrada: number | null
          minutos_saida: number | null
          minutos_total: number | null
          nome_cargo: string | null
          nome_completo: string | null
          nome_empresa: string | null
          posto_trabalho_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_mensal_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_mensal_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "vw_funcionarios_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_funcionarios_cliente: {
        Row: {
          ativo: boolean | null
          cargo_id: string | null
          codigo_escala: string | null
          data_admissao: string | null
          demitido: boolean | null
          empresa_id: string | null
          foto_url: string | null
          id: string | null
          nome_cargo: string | null
          nome_completo: string | null
          nome_empresa: string | null
          nome_posto: string | null
          posto_trabalho_id: string | null
          ronda: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          cargo_id?: string | null
          codigo_escala?: string | null
          data_admissao?: string | null
          demitido?: boolean | null
          empresa_id?: string | null
          foto_url?: string | null
          id?: string | null
          nome_cargo?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          nome_posto?: string | null
          posto_trabalho_id?: string | null
          ronda?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          cargo_id?: string | null
          codigo_escala?: string | null
          data_admissao?: string | null
          demitido?: boolean | null
          empresa_id?: string | null
          foto_url?: string | null
          id?: string | null
          nome_cargo?: string | null
          nome_completo?: string | null
          nome_empresa?: string | null
          nome_posto?: string | null
          posto_trabalho_id?: string | null
          ronda?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_posto_trabalho_id_fkey"
            columns: ["posto_trabalho_id"]
            isOneToOne: false
            referencedRelation: "postos_trabalho"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      audit_rls_security: {
        Args: never
        Returns: {
          policy_name: string
          recommendation: string
          security_level: string
          table_name: string
        }[]
      }
      calcular_banco_horas_mensal: {
        Args: { p_ano: number; p_funcionario_id: string; p_mes: number }
        Returns: {
          dias_com_banco: number
          dias_trabalhados: number
          minutos_entrada: number
          minutos_saida: number
          minutos_total: number
        }[]
      }
      gerar_escala_funcionario: {
        Args: {
          p_cod_escala: string
          p_data_fim: string
          p_data_inicio: string
        }
        Returns: {
          data_escala: string
          dia_semana: string
          horario_entrada: string
          horario_inicio_refeicao: string
          horario_saida: string
          horario_termino_refeicao: string
          observacao: string
          status: string
        }[]
      }
      get_funcionarios_cliente: {
        Args: never
        Returns: {
          ativo: boolean
          cargo_id: string
          codigo_escala: string
          data_admissao: string
          demitido: boolean
          empresa_id: string
          foto_url: string
          id: string
          nome_cargo: string
          nome_completo: string
          nome_empresa: string
          nome_posto: string
          posto_trabalho_id: string
          ronda: boolean
        }[]
      }
      get_manager_empresas: { Args: { _user_id: string }; Returns: string[] }
      get_salario_cargo_vigente: {
        Args: { p_cargo_id: string; p_data?: string }
        Returns: number
      }
      get_salario_vigente: {
        Args: { p_data?: string; p_funcionario_id: string }
        Returns: number
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_own_employee_data: {
        Args: { funcionario_user_id: string }
        Returns: boolean
      }
      limpar_nao_conformidades_antigas: { Args: never; Returns: number }
      manager_has_empresa_access: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      recalcular_banco_horas_mes: {
        Args: { p_ano: number; p_mes: number }
        Returns: number
      }
      recalcular_banco_horas_ultimos_meses: {
        Args: { p_meses?: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "client"
      rq_status_execucao:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "incompleta"
        | "nao_realizada"
      rq_status_leitura:
        | "no_prazo"
        | "adiantado"
        | "atrasado"
        | "fora_de_ordem"
        | "invalido"
        | "nao_realizado"
      rq_tipo_ocorrencia:
        | "fora_de_ordem"
        | "fora_tolerancia"
        | "ponto_nao_lido"
        | "qr_invalido"
        | "ciclo_incompleto"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "manager", "client"],
      rq_status_execucao: [
        "pendente",
        "em_andamento",
        "concluida",
        "incompleta",
        "nao_realizada",
      ],
      rq_status_leitura: [
        "no_prazo",
        "adiantado",
        "atrasado",
        "fora_de_ordem",
        "invalido",
        "nao_realizado",
      ],
      rq_tipo_ocorrencia: [
        "fora_de_ordem",
        "fora_tolerancia",
        "ponto_nao_lido",
        "qr_invalido",
        "ciclo_incompleto",
        "outro",
      ],
    },
  },
} as const
