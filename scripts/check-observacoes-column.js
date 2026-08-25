import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkObservacoesColumn() {
  console.log('🔍 Verificando se a coluna observacoes existe...');

  try {
    // Tentar fazer uma consulta simples incluindo a coluna observacoes
    const { data, error } = await supabase
      .from('folha_calculada')
      .select('funcionario_id, observacoes')
      .limit(1);

    if (error) {
      if (error.message.includes('observacoes') || error.message.includes('column') || error.message.includes('does not exist')) {
        console.log('❌ A coluna observacoes NÃO existe na tabela folha_calculada');
        console.log('📋 Execute esta migração no banco de dados:');
        console.log('');
        console.log('ALTER TABLE folha_calculada ADD COLUMN observacoes TEXT;');
        console.log('COMMENT ON COLUMN folha_calculada.observacoes IS \'Observações gerais sobre a folha de pagamento do funcionário\';');
        console.log('');
      } else {
        console.error('❌ Erro inesperado:', error.message);
      }
    } else {
      console.log('✅ A coluna observacoes existe e está funcionando!');
      console.log(`📊 Teste realizado com sucesso (${data?.length || 0} registros consultados)`);
    }
  } catch (err) {
    console.error('❌ Erro ao verificar coluna:', err.message);
  }
}

await checkObservacoesColumn();