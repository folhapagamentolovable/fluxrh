import { supabase } from '../lib/supabase';

export async function testSupabaseConnection() {
  try {
    console.log('🔄 Testando conexão com Supabase...');
    console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Key (primeiros 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

    // Teste básico de conexão - apenas verificar se a tabela existe
    const { data, error, count } = await supabase
      .from('empresas')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error);
      return { success: false, error: error.message, details: error };
    }

    console.log('✅ Conexão estabelecida!');
    console.log('📊 Tabela empresas encontrada com', count, 'registros');
    console.log('📊 Dados de exemplo:', data);
    return { success: true, data, count };
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function testTableExists(tableName: string) {
  try {
    console.log(`🔍 Verificando se a tabela '${tableName}' existe...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`❌ Tabela '${tableName}' não encontrada:`, error);
      return { exists: false, error: error.message };
    }

    console.log(`✅ Tabela '${tableName}' encontrada!`);
    return { exists: true, data };
  } catch (err) {
    console.error(`❌ Erro ao verificar tabela '${tableName}':`, err);
    return { exists: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function runDiagnostics() {
  console.log('🚀 Iniciando diagnósticos do Supabase...');
  
  // 1. Testar conexão
  const connectionTest = await testSupabaseConnection();
  
  // 2. Testar tabela empresas
  const tableTest = await testTableExists('empresas');
  
  // 3. Tentar inserir dados de teste
  if (connectionTest.success && tableTest.exists) {
    try {
      console.log('🧪 Testando inserção...');
      const testData = {
        nome_empresa: 'Teste FluxPay - ' + Date.now(),
        cnpj: '12345678000190' // CNPJ sem máscara para evitar problemas
      };
      
      const { data, error } = await supabase
        .from('empresas')
        .insert(testData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro na inserção de teste:', error);
        return { success: false, error: error.message, phase: 'insert' };
      }

      console.log('✅ Inserção de teste bem-sucedida:', data);
      
      // Limpar dados de teste
      await supabase.from('empresas').delete().eq('id', data.id);
      console.log('🧹 Dados de teste removidos');
      
      return { success: true, message: 'Todos os testes passaram!' };
    } catch (err) {
      console.error('❌ Erro no teste de inserção:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido', phase: 'insert' };
    }
  }
  
  return { 
    success: false, 
    error: 'Falha nos testes preliminares',
    connectionTest,
    tableTest
  };
}