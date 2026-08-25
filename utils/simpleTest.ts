import { supabase } from '../lib/supabase';

// Teste simples e confiável de conexão
export async function simpleConnectionTest() {
  try {
    console.log('🔄 Teste simples de conexão...');
    
    // Apenas tentar acessar a tabela empresas
    const { error } = await supabase
      .from('empresas')
      .select('*')
      .limit(0); // Não retorna dados, apenas testa a conexão

    if (error) {
      console.error('❌ Erro:', error);
      
      // Verificar tipos específicos de erro
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: 'Tabela "empresas" não encontrada. Execute o arquivo supabase-tables.sql no Supabase.',
          type: 'table_not_found'
        };
      }
      
      if (error.code === 'PGRST301') {
        return { 
          success: false, 
          error: 'Problema de permissão. Configure as políticas RLS no Supabase.',
          type: 'permission_denied'
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        type: 'unknown',
        details: error
      };
    }

    console.log('✅ Conexão OK!');
    return { success: true, message: 'Conexão estabelecida com sucesso!' };
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      type: 'network_error'
    };
  }
}

// Teste de inserção simples
export async function simpleInsertTest() {
  try {
    console.log('🧪 Teste de inserção...');
    
    const testData = {
      nome_empresa: `Teste ${Date.now()}`,
      cnpj: `${Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0')}`
    };
    
    const { data, error } = await supabase
      .from('empresas')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro na inserção:', error);
      return { 
        success: false, 
        error: error.message,
        details: error
      };
    }

    console.log('✅ Inserção OK:', data);
    
    // Limpar dados de teste
    const { error: deleteError } = await supabase
      .from('empresas')
      .delete()
      .eq('id', data.id);
      
    if (deleteError) {
      console.warn('⚠️ Não foi possível limpar dados de teste:', deleteError);
    } else {
      console.log('🧹 Dados de teste removidos');
    }
    
    return { success: true, data, message: 'Inserção funcionando!' };
    
  } catch (err) {
    console.error('❌ Erro inesperado na inserção:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

// Diagnóstico completo simplificado
export async function runSimpleDiagnostics() {
  console.log('🚀 Diagnóstico simplificado...');
  
  // 1. Teste de conexão
  const connectionResult = await simpleConnectionTest();
  
  if (!connectionResult.success) {
    return {
      phase: 'connection',
      ...connectionResult,
      success: false as const
    };
  }
  
  // 2. Teste de inserção
  const insertResult = await simpleInsertTest();
  
  if (!insertResult.success) {
    return {
      phase: 'insert',
      ...insertResult,
      success: false as const
    };
  }
  
  console.log('🎉 Todos os testes passaram!');
  return {
    success: true,
    message: 'Supabase funcionando perfeitamente!',
    connectionResult,
    insertResult
  };
}