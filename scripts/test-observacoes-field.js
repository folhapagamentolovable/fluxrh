import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testObservacoesField() {
  console.log('🔍 Testando campo observacoes na tabela folha_calculada...\n');

  try {
    // 1. Verificar se a coluna existe
    console.log('1. Verificando se a coluna observacoes existe...');
    const { data: folhas, error: selectError } = await supabase
      .from('folha_calculada')
      .select('id, funcionario_id, nome_funcionario, observacoes')
      .limit(3);

    if (selectError) {
      console.error('❌ Erro ao consultar tabela:', selectError.message);
      if (selectError.message.includes('observacoes')) {
        console.log('💡 A coluna observacoes ainda não foi criada. Execute a migração primeiro.');
        console.log('📋 SQL para executar:');
        console.log('ALTER TABLE folha_calculada ADD COLUMN observacoes TEXT;');
      }
      return;
    }

    console.log('✅ Coluna observacoes existe e é consultável');
    console.log(`📊 Encontradas ${folhas?.length || 0} folhas para teste`);

    if (folhas && folhas.length > 0) {
      console.log('\n2. Dados atuais:');
      folhas.forEach((folha, index) => {
        console.log(`   Folha ${index + 1}:`);
        console.log(`     - ID: ${folha.id}`);
        console.log(`     - Funcionário: ${folha.nome_funcionario}`);
        console.log(`     - Observações: ${folha.observacoes || 'NULL'}`);
      });

      // 3. Testar inserção/atualização
      console.log('\n3. Testando atualização de observações...');
      const primeiraFolha = folhas[0];
      const novaObservacao = `Teste de observação - ${new Date().toISOString()}`;

      const { data: updateData, error: updateError } = await supabase
        .from('folha_calculada')
        .update({ observacoes: novaObservacao })
        .eq('id', primeiraFolha.id)
        .select();

      if (updateError) {
        console.error('❌ Erro ao atualizar observação:', updateError.message);
      } else {
        console.log('✅ Observação atualizada com sucesso!');
        console.log(`   Nova observação: ${updateData[0]?.observacoes}`);
      }
    }

    console.log('\n🎉 Teste do campo observacoes concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

await testObservacoesField();