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

async function testMigration() {
  console.log('🔍 Testando migração da coluna estado_inicial_01_01...\n');

  try {
    // 1. Verificar se a coluna existe
    console.log('1. Verificando estrutura da tabela...');
    const { data: escalas, error: selectError } = await supabase
      .from('regras_escalas')
      .select('id, codigo_escala, tipo_alternancia, estado_inicial_01_01')
      .limit(5);

    if (selectError) {
      console.error('❌ Erro ao consultar tabela:', selectError.message);
      if (selectError.message.includes('estado_inicial_01_01')) {
        console.log('💡 A coluna estado_inicial_01_01 ainda não foi criada. Execute a migração primeiro.');
      }
      return;
    }

    console.log('✅ Coluna estado_inicial_01_01 existe e é consultável');

    // 2. Verificar dados migrados
    console.log('\n2. Verificando dados migrados...');
    const { data: estatisticas, error: statsError } = await supabase
      .from('regras_escalas')
      .select('tipo_alternancia, estado_inicial_01_01')
      .order('tipo_alternancia');

    if (statsError) {
      console.error('❌ Erro ao consultar estatísticas:', statsError.message);
      return;
    }

    // Agrupar por tipo_alternancia e estado_inicial
    const grupos = {};
    estatisticas.forEach(item => {
      const key = `${item.tipo_alternancia || 'NULL'} -> ${item.estado_inicial_01_01 || 'NULL'}`;
      grupos[key] = (grupos[key] || 0) + 1;
    });

    console.log('📊 Distribuição dos dados:');
    Object.entries(grupos).forEach(([key, count]) => {
      console.log(`   ${key}: ${count} registros`);
    });

    // 3. Verificar migração específica
    console.log('\n3. Verificando migração específica...');
    
    const casos = [
      { tipo: 'DIAS_ALTERNADOS_T1', esperado: 'trabalha' },
      { tipo: 'DIAS_ALTERNADOS_T2', esperado: 'folga' },
      { tipo: 'SABADOS_ALTERNADOS_T1', esperado: 'trabalha' },
      { tipo: 'SABADOS_ALTERNADOS_T2', esperado: 'folga' },
      { tipo: 'NENHUMA', esperado: null },
      { tipo: 'SEM_ALTERNANCIA', esperado: null }
    ];

    for (const caso of casos) {
      const { data: registros } = await supabase
        .from('regras_escalas')
        .select('codigo_escala, tipo_alternancia, estado_inicial_01_01')
        .eq('tipo_alternancia', caso.tipo)
        .limit(3);

      if (registros && registros.length > 0) {
        const corretos = registros.filter(r => r.estado_inicial_01_01 === caso.esperado);
        const status = corretos.length === registros.length ? '✅' : '❌';
        console.log(`   ${status} ${caso.tipo}: ${corretos.length}/${registros.length} corretos`);
        
        if (corretos.length !== registros.length) {
          console.log(`      Esperado: ${caso.esperado}, Encontrado: ${registros[0].estado_inicial_01_01}`);
        }
      }
    }

    // 4. Testar constraint
    console.log('\n4. Testando constraint de valores válidos...');
    try {
      const { error: constraintError } = await supabase
        .from('regras_escalas')
        .insert({
          codigo_escala: 'TEST_CONSTRAINT',
          nome_escala: 'Teste Constraint',
          data_vigencia: '2025-01-01',
          estado_inicial_01_01: 'valor_invalido' // Deve falhar
        });

      if (constraintError) {
        console.log('✅ Constraint funcionando - valor inválido rejeitado');
        console.log(`   Erro: ${constraintError.message}`);
      } else {
        console.log('❌ Constraint não está funcionando - valor inválido foi aceito');
      }
    } catch (error) {
      console.log('✅ Constraint funcionando - valor inválido rejeitado');
    }

    console.log('\n🎉 Teste de migração concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testMigration();