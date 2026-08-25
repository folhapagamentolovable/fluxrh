import { supabase } from '../lib/supabase';

// Função para testar a conexão com o Supabase
export async function testSupabaseConnection() {
  try {
    console.log('🔄 Testando conexão com Supabase...');
    
    // Teste básico de conexão
    const { data, error } = await supabase
      .from('empresas')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    console.log('📊 Dados de teste:', data);
    
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro inesperado:', message);
    return { success: false, error: message };
  }
}

// Função para verificar se as tabelas existem
export async function checkTables() {
  const tables = [
    'empresas',
    'postos_trabalho', 
    'escalas',
    'cargos',
    'funcionarios',
    'feriados',
    'parametros_calculo'
  ];

  console.log('🔍 Verificando tabelas...');
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count(*)')
        .limit(1);

      if (error) {
        console.error(`❌ Tabela '${table}' não encontrada:`, error.message);
      } else {
        console.log(`✅ Tabela '${table}' encontrada`);
      }
    } catch (err) {
      console.error(`❌ Erro ao verificar tabela '${table}':`, err);
    }
  }
}

// Função para inserir dados de teste
export async function insertTestData() {
  try {
    console.log('📝 Inserindo dados de teste...');

    // Inserir uma empresa de teste
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .insert({
        nome_empresa: 'Empresa Teste FluxPay',
        cnpj: '12.345.678/0001-90',
        endereco: 'Rua Teste, 123',
        cidade: 'São Paulo',
        estado: 'SP',
        telefone: '(11) 99999-9999',
        nome_contato: 'João Teste'
      })
      .select()
      .single();

    if (empresaError) {
      console.error('❌ Erro ao inserir empresa:', empresaError.message);
      return { success: false, error: empresaError.message };
    }

    console.log('✅ Empresa de teste inserida:', empresa);

    // Inserir uma escala de teste
    const { data: escala, error: escalaError } = await supabase
      .from('escalas')
      .insert({
        codigo_escala: '12x36',
        nome_escala: '12 por 36 horas',
        regra_escala: 'Trabalha 12 horas e folga 36 horas',
        data_inicio: '2025-01-01'
      })
      .select()
      .single();

    if (escalaError) {
      console.error('❌ Erro ao inserir escala:', escalaError.message);
    } else {
      console.log('✅ Escala de teste inserida:', escala);
    }

    return { success: true, data: { empresa, escala } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('❌ Erro ao inserir dados de teste:', message);
    return { success: false, error: message };
  }
}

// Função completa de teste
export async function runFullTest() {
  console.log('🚀 Iniciando teste completo do Supabase...');
  
  // 1. Testar conexão
  const connectionTest = await testSupabaseConnection();
  if (!connectionTest.success) {
    return connectionTest;
  }

  // 2. Verificar tabelas
  await checkTables();

  // 3. Inserir dados de teste (opcional)
  // const insertTest = await insertTestData();
  
  console.log('🎉 Teste completo finalizado!');
  return { success: true };
}