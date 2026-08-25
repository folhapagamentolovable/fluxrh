import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  Empresa, 
  PostoTrabalho, 
  Escala, 
  Cargo, 
  Funcionario, 
  Feriado, 
  ParametrosCalculo,
  FolhaPonto,
  EscalaMensal
} from '../lib/supabase';

// Hook genérico para operações CRUD
export function useSupabaseTable<T>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const insert = async (item: Partial<T>) => {
    try {
      
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(item)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      setData(prev => [result, ...prev]);
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao inserir';
      setError(message);
      return { success: false, error: message };
    }
  };

  const update = async (id: string, updates: Partial<T>) => {
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData(prev => prev.map(item => 
        (item as any).id === id ? result : item
      ));
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(message);
      return { success: false, error: message };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setData(prev => prev.filter(item => (item as any).id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchData();
  }, [tableName]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    insert,
    update,
    remove
  };
}

// Hooks específicos para cada tabela
export const useEmpresas = () => useSupabaseTable<Empresa>('empresas');

// Hook básico para postos de trabalho — APENAS postos principais (sem local_area).
// Áreas físicas (Portaria, Refeitório, etc) só devem aparecer no contexto de QR Codes.
export function usePostosTrabalho() {
  const [data, setData] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase
        .from('postos_trabalho')
        .select('*')
        .is('local_area', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const insert = async (item: Partial<PostoTrabalho>) => {
    try {
      const { data: result, error } = await supabase.from('postos_trabalho').insert(item).select().single();
      if (error) throw error;
      setData(prev => [result, ...prev]);
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao inserir';
      setError(message);
      return { success: false, error: message };
    }
  };

  const update = async (id: string, updates: Partial<PostoTrabalho>) => {
    try {
      const { data: result, error } = await supabase.from('postos_trabalho').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setData(prev => prev.map(item => (item.id === id ? result : item)));
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(message);
      return { success: false, error: message };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('postos_trabalho').delete().eq('id', id);
      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => { fetchData(); }, []);
  return { data, loading, error, refetch: fetchData, insert, update, remove };
}

// Hook para postos de trabalho com relacionamento de empresa
export function usePostosTrabalhoCompletos() {
  const [data, setData] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Apenas postos PRINCIPAIS (sem local_area). Áreas físicas (Portaria, Refeitório, etc)
      // são apenas contextos de QR Code dentro de um posto principal.
      const { data: result, error } = await supabase
        .from('postos_trabalho')
        .select(`
          *,
          empresa:empresas(*)
        `)
        .is('local_area', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar postos de trabalho');
    } finally {
      setLoading(false);
    }
  };

  const insert = async (item: Partial<PostoTrabalho>) => {
    try {
      const { data: result, error } = await supabase
        .from('postos_trabalho')
        .insert(item)
        .select(`
          *,
          empresa:empresas(*)
        `)
        .single();

      if (error) throw error;
      setData(prev => [result, ...prev]);
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao inserir';
      setError(message);
      return { success: false, error: message };
    }
  };

  const update = async (id: string, updates: Partial<PostoTrabalho>) => {
    try {
      const { data: result, error } = await supabase
        .from('postos_trabalho')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          empresa:empresas(*)
        `)
        .single();

      if (error) throw error;
      setData(prev => prev.map(item => 
        item.id === id ? result : item
      ));
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(message);
      return { success: false, error: message };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('postos_trabalho')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    insert,
    update,
    remove
  };
}
export const useEscalas = () => useSupabaseTable<Escala>('escalas');
export const useCargos = () => useSupabaseTable<Cargo>('cargos');
export const useFuncionarios = () => useSupabaseTable<Funcionario>('funcionarios');
export const useFeriados = () => useSupabaseTable<Feriado>('feriados');

/**
 * Hook que retorna feriados filtrados por cidade/estado do posto.
 * - Nacionais: sempre incluídos
 * - Estaduais: incluídos se estado do feriado === estado do posto
 * - Municipais: incluídos se cidade E estado do feriado === cidade/estado do posto
 * Se cidade/estado não informados, retorna todos (comportamento legado).
 */
export function useFeriadosPorLocalidade(cidade?: string | null, estado?: string | null) {
  const { data: todos, loading, error } = useFeriados();

  const feriados = todos.filter((f: any) => {
    if (f.tipo_feriado === 'nacional') return true;
    if (f.tipo_feriado === 'estadual') {
      if (!estado || !f.estado) return true; // sem filtro → inclui
      return f.estado.toUpperCase() === estado.toUpperCase();
    }
    if (f.tipo_feriado === 'municipal') {
      if (!cidade || !f.cidade) return true; // sem filtro → inclui
      const cidadeOk = f.cidade.toLowerCase() === cidade.toLowerCase();
      const estadoOk = !estado || !f.estado || f.estado.toUpperCase() === estado.toUpperCase();
      return cidadeOk && estadoOk;
    }
    return true;
  });

  return { data: feriados, loading, error };
}
export const useParametrosCalculo = () => useSupabaseTable<ParametrosCalculo>('parametros_calculo');
export const useFolhasPonto = () => useSupabaseTable<FolhaPonto>('folhas_ponto');
export const useEscalasMensais = () => useSupabaseTable<EscalaMensal>('escala_mensal');

// Hook para funcionários com relacionamentos
export function useFuncionariosCompletos() {
  const [data, setData] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar funcionários com relacionamentos básicos
      const { data: funcData, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .order('created_at', { ascending: false });

      if (funcError) throw funcError;

      // Buscar todas as regras de escalas
      const { data: regrasData, error: regrasError } = await supabase
        .from('regras_escalas')
        .select('id, codigo_escala, nome_escala');

      if (regrasError) throw regrasError;

      // Fazer o JOIN manual com escalas
      const result = funcData?.map(func => ({
        ...func,
        cargo: func.cargo ? {
          ...func.cargo,
          escala: regrasData?.find(r => r.id === func.cargo?.escala_id) || null
        } : null
      })) || [];

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const insert = async (item: Partial<Funcionario>) => {
    try {
      const { data: result, error } = await supabase
        .from('funcionarios')
        .insert(item)
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .single();

      if (error) throw error;

      // Buscar a escala do cargo separadamente
      if (result.cargo?.escala_id) {
        const { data: escalaData } = await supabase
          .from('regras_escalas')
          .select('id, codigo_escala, nome_escala')
          .eq('id', result.cargo.escala_id)
          .single();
        
        result.cargo.escala = escalaData || null;
      }

      setData(prev => [result, ...prev]);
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao inserir';
      setError(message);
      return { success: false, error: message };
    }
  };

  const update = async (id: string, updates: Partial<Funcionario>) => {
    try {
      const { data: result, error } = await supabase
        .from('funcionarios')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .single();

      if (error) throw error;

      // Buscar a escala do cargo separadamente
      if (result.cargo?.escala_id) {
        const { data: escalaData } = await supabase
          .from('regras_escalas')
          .select('id, codigo_escala, nome_escala')
          .eq('id', result.cargo.escala_id)
          .single();
        
        result.cargo.escala = escalaData || null;
      }

      setData(prev => prev.map(item => 
        item.id === id ? result : item
      ));
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(message);
      return { success: false, error: message };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData, insert, update, remove };
}

// Hook para cargos com escalas
export function useCargosCompletos() {
  const [data, setData] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar cargos sem relacionamento (para evitar erro de FK)
      const { data: cargosData, error: cargosError } = await supabase
        .from('cargos')
        .select('*')
        .order('created_at', { ascending: false });

      if (cargosError) throw cargosError;

      // Buscar todas as regras de escalas
      const { data: regrasData, error: regrasError } = await supabase
        .from('regras_escalas')
        .select('id, codigo_escala, nome_escala');

      if (regrasError) throw regrasError;

      // Fazer o JOIN manualmente
      const result = cargosData?.map(cargo => ({
        ...cargo,
        escala: regrasData?.find(r => r.id === cargo.escala_id) || null
      })) || [];

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cargos');
    } finally {
      setLoading(false);
    }
  };

  const insert = async (item: Partial<Cargo>) => {
    try {
      const { data: result, error } = await supabase
        .from('cargos')
        .insert(item)
        .select('*')
        .single();

      if (error) throw error;

      // Buscar a escala separadamente
      if (result.escala_id) {
        const { data: escalaData } = await supabase
          .from('regras_escalas')
          .select('id, codigo_escala, nome_escala')
          .eq('id', result.escala_id)
          .single();
        
        result.escala = escalaData || null;
      }

      setData(prev => [result, ...prev]);
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao inserir';
      setError(message);
      return { success: false, error: message };
    }
  };

  const update = async (id: string, updates: Partial<Cargo>) => {
    try {
      const { data: result, error } = await supabase
        .from('cargos')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Buscar a escala separadamente
      if (result.escala_id) {
        const { data: escalaData } = await supabase
          .from('regras_escalas')
          .select('id, codigo_escala, nome_escala')
          .eq('id', result.escala_id)
          .single();
        
        result.escala = escalaData || null;
      }

      setData(prev => prev.map(item => 
        item.id === id ? result : item
      ));
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(message);
      return { success: false, error: message };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setData(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData, insert, update, remove };
}

// Hook para funcionários ativos (não demitidos) - para uso em processamentos
export function useFuncionariosAtivos() {
  const [data, setData] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar apenas funcionários não demitidos com relacionamentos
      const { data: funcData, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(*),
          empresa:empresas(*),
          posto_trabalho:postos_trabalho(*)
        `)
        .eq('demitido', false) // 🎯 FILTRO PRINCIPAL - apenas não demitidos
        .order('created_at', { ascending: false });

      if (funcError) throw funcError;

      // Buscar todas as regras de escalas
      const { data: regrasData, error: regrasError } = await supabase
        .from('regras_escalas')
        .select('id, codigo_escala, nome_escala');

      if (regrasError) throw regrasError;

      // Fazer o JOIN manual com escalas
      const result = funcData?.map(func => ({
        ...func,
        cargo: func.cargo ? {
          ...func.cargo,
          escala: regrasData?.find(r => r.id === func.cargo?.escala_id) || null
        } : null
      })) || [];

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar funcionários ativos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}