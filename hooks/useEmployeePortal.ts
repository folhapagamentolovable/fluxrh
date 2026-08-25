import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { filterDocumentsByVisibility } from '../utils/portalVisibility';

interface Cargo {
  id: string;
  nome_cargo: string;
  salario_base: number;
}

interface Empresa {
  id: string;
  nome_empresa: string;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
}

interface PostoTrabalho {
  id: string;
  nome_posto: string;
  cnpj: string;
}

interface Funcionario {
  id: string;
  nome_completo: string;
  cpf: string | null;
  data_admissao: string;
  data_nascimento?: string | null;
  cargo_id: string | null;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
  nome_cargo: string | null;
  nome_empresa: string | null;
  nome_posto: string | null;
  funcionario_registrado: boolean | null;
  user_id: string | null;
  codigo_escala?: string | null;
  numero_ctps?: string | null;
  serie_ctps?: string | null;
  recebe_vt?: boolean | null;
  adicional_insalubridade?: boolean | null;
  acumulo_funcao?: boolean | null;
  recebe_seguro_vida?: boolean | null;
  banco_horas_ativo?: boolean | null;
  ronda?: boolean | null;
  // Dados relacionados
  cargo?: Cargo | null;
  empresa?: Empresa | null;
  posto_trabalho?: PostoTrabalho | null;
}

interface FolhaCalculada {
  id: string;
  mes: number;
  ano: number;
  salario_base: number;
  total_proventos: number;
  total_descontos: number;
  salario_liquido: number;
  [key: string]: any;
}

interface EscalaMensal {
  id: string;
  mes: number;
  ano: number;
  dias_trabalhados: string | null;
  total_dias_trabalho: number | null;
  total_dias_folga: number | null;
  total_feriados: number | null;
  observacoes: string | null;
}

interface Ferias {
  id: string;
  periodo_aquisitivo: number;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_concessivo: string;
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  dias_gozados: number | null;
  status: string;
  valor_ferias: number | null;
  valor_terco: number | null;
  valor_total: number | null;
  observacoes: string | null;
}

export function useEmployeePortal() {
  const { user, profile } = useAuth();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar funcionário vinculado ao usuário logado
  const fetchFuncionario = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar funcionário com dados relacionados (cargo, empresa, posto)
      let { data, error: fetchError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(id, nome_cargo, salario_base),
          empresa:empresas(id, nome_empresa, cnpj, endereco, cidade, estado),
          posto_trabalho:postos_trabalho(id, nome_posto, cnpj)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      // Se não encontrou por user_id, tentar vincular por email
      if (!data && profile?.email) {
        // Buscar funcionário pelo email (comparando com CPF formatado ou outro campo)
        // Como não temos email na tabela funcionarios, podemos fazer a vinculação manual depois
        // Por agora, tentar atualizar o user_id se encontrar por email no profile
        const { data: funcByEmail } = await supabase
          .from('funcionarios')
          .select(`
            *,
            cargo:cargos(id, nome_cargo, salario_base),
            empresa:empresas(id, nome_empresa, cnpj, endereco, cidade, estado),
            posto_trabalho:postos_trabalho(id, nome_posto, cnpj)
          `)
          .is('user_id', null)
          .limit(1);
        
        // Se encontrou funcionário sem vínculo, o admin deve vincular manualmente
        if (!funcByEmail || funcByEmail.length === 0) {
          setError('Funcionário não vinculado. Contate o administrador.');
          setFuncionario(null);
        }
      } else if (fetchError) {
        throw fetchError;
      } else {
        setFuncionario(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar holerites do funcionário
  const fetchHolerites = async (ano?: number): Promise<FolhaCalculada[]> => {
    if (!funcionario) return [];

    try {
      let query = supabase
        .from('folha_calculada')
        .select('*')
        .eq('funcionario_id', funcionario.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (ano) {
        query = query.eq('ano', ano);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Aplicar filtro de visibilidade
      const filteredData = await filterDocumentsByVisibility(data || [], 'holerites') as FolhaCalculada[];
      return filteredData;
    } catch (err) {
      return [];
    }
  };

  // Buscar holerites com benefícios do funcionário
  const fetchBeneficios = async (ano?: number): Promise<FolhaCalculada[]> => {
    if (!funcionario) return [];

    try {
      let query = supabase
        .from('folha_calculada')
        .select('*')
        .eq('funcionario_id', funcionario.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (ano) {
        query = query.eq('ano', ano);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filtrar apenas holerites que têm benefícios (incluindo FTs e Reembolsos)
      const holeritesBeneficios = (data || []).filter(holerite => {
        const total = 
          (holerite.vale_transporte || 0) +
          (holerite.vale_transporte_mes_anterior || 0) +
          (holerite.vale_transporte_mes_atual || 0) +
          (holerite.vale_alimentacao || 0) +
          (holerite.vale_alimentacao_mes_anterior || 0) +
          (holerite.vale_alimentacao_mes_atual || 0) +
          (holerite.cesta_basica || 0) +
          (holerite.premio_permanencia || 0) +
          (holerite.folga_trabalhada || 0) +
          (holerite.valor_vt_folgas_trabalhadas || 0) +
          (holerite.valor_va_folgas_trabalhadas || 0) +
          (holerite.reembolsos_uber || 0);
        return total > 0;
      });
      
      // Aplicar filtro de visibilidade
      const filteredData = await filterDocumentsByVisibility(holeritesBeneficios, 'beneficios') as FolhaCalculada[];
      return filteredData;
    } catch (err) {
      return [];
    }
  };
  const fetchEscalas = async (ano?: number): Promise<EscalaMensal[]> => {
    if (!funcionario) return [];

    try {
      let query = supabase
        .from('escala_mensal')
        .select('*')
        .eq('funcionario_id', funcionario.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (ano) {
        query = query.eq('ano', ano);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  };

  // Buscar férias do funcionário (ou calcular períodos aquisitivos se não existirem)
  const fetchFerias = async (): Promise<Ferias[]> => {
    if (!funcionario) return [];

    try {
      const { data, error } = await supabase
        .from('ferias')
        .select('*')
        .eq('funcionario_id', funcionario.id)
        .order('periodo_aquisitivo', { ascending: false });

      if (error) throw error;
      
      // Se existem registros na tabela ferias, retorná-los
      if (data && data.length > 0) {
        return data;
      }

      // Se não existem registros, calcular os períodos aquisitivos baseado na data de admissão
      const periodosCalculados = calcularPeriodosAquisitivos(funcionario);
      return periodosCalculados;
    } catch (err) {
      return [];
    }
  };

  // Função para calcular períodos aquisitivos baseado na data de admissão
  const calcularPeriodosAquisitivos = (func: Funcionario): Ferias[] => {
    if (!func.data_admissao) return [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataAdmissao = new Date(func.data_admissao + 'T00:00:00');
    const periodos: Ferias[] = [];
    
    let periodoNum = 1;
    let inicioAquisitivo = new Date(dataAdmissao);
    
    while (true) {
      // Fim do período aquisitivo = 12 meses após o início
      const fimAquisitivo = new Date(inicioAquisitivo);
      fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);
      fimAquisitivo.setDate(fimAquisitivo.getDate() - 1);
      
      // Data limite concessivo = 12 meses após o fim do período aquisitivo
      const limiteConcessivo = new Date(fimAquisitivo);
      limiteConcessivo.setFullYear(limiteConcessivo.getFullYear() + 1);
      
      // Só adicionar períodos que já foram adquiridos (fim aquisitivo <= hoje)
      if (fimAquisitivo > hoje) {
        break;
      }
      
      periodos.push({
        id: `calc-${func.id}-${periodoNum}`,
        periodo_aquisitivo: periodoNum,
        data_inicio_aquisitivo: inicioAquisitivo.toISOString().split('T')[0],
        data_fim_aquisitivo: fimAquisitivo.toISOString().split('T')[0],
        data_limite_concessivo: limiteConcessivo.toISOString().split('T')[0],
        data_inicio_gozo: null,
        data_fim_gozo: null,
        dias_gozados: 30,
        status: 'pendente',
        valor_ferias: null,
        valor_terco: null,
        valor_total: null,
        observacoes: 'Período calculado automaticamente'
      });
      
      // Próximo período começa no dia seguinte ao fim do anterior
      inicioAquisitivo = new Date(fimAquisitivo);
      inicioAquisitivo.setDate(inicioAquisitivo.getDate() + 1);
      periodoNum++;
      
      // Limitar a 10 períodos para evitar loop infinito
      if (periodoNum > 10) break;
    }
    
    return periodos.reverse(); // Mais recente primeiro
  };

  // Solicitar férias
  const solicitarFerias = async (feriasData: Partial<Ferias>): Promise<{ success: boolean; error?: string }> => {
    if (!funcionario) {
      return { success: false, error: 'Funcionário não encontrado' };
    }

    try {
      const { error } = await supabase
        .from('ferias')
        .insert({
          ...feriasData,
          funcionario_id: funcionario.id,
          status: 'solicitado'
        });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro ao solicitar férias' 
      };
    }
  };

  useEffect(() => {
    fetchFuncionario();
  }, [user, profile]);

  return {
    funcionario,
    loading,
    error,
    fetchHolerites,
    fetchBeneficios,
    fetchEscalas,
    fetchFerias,
    solicitarFerias,
    refetch: fetchFuncionario
  };
}
