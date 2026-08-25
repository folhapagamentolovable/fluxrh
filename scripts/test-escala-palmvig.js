import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEscalaPalmvig() {
  console.log('🔍 Testando escala PALMVIGDIURNOT1 para dezembro/2025...\n');

  try {
    // 1. Verificar configuração da escala
    console.log('1. Verificando configuração da escala PALMVIGDIURNOT1...');
    const { data: escala, error: escalaError } = await supabase
      .from('regras_escalas')
      .select('*')
      .eq('codigo_escala', 'PALMVIGDIURNOT1')
      .single();

    if (escalaError || !escala) {
      console.error('❌ Escala PALMVIGDIURNOT1 não encontrada:', escalaError?.message);
      return;
    }

    console.log('✅ Escala encontrada:');
    console.log(`   Código: ${escala.codigo_escala}`);
    console.log(`   Nome: ${escala.nome_escala}`);
    console.log(`   Tipo Alternância: ${escala.tipo_alternancia}`);
    console.log(`   Estado Inicial 01/01: ${escala.estado_inicial_01_01 || 'NULL'}`);

    // 2. Analisar o padrão esperado para dezembro/2025
    console.log('\n2. Analisando padrão esperado para dezembro/2025...');
    
    // Dezembro 2025 começa numa segunda-feira (dia 1)
    // Se trabalha nos dias pares: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30
    const diasPares = [];
    for (let dia = 2; dia <= 31; dia += 2) {
      diasPares.push(dia);
    }
    
    console.log(`   Dias pares em dezembro/2025: ${diasPares.join(', ')}`);
    console.log(`   Total de dias trabalhados esperados: ${diasPares.length}`);

    // 3. Verificar se existe funcionário com essa escala
    console.log('\n3. Verificando funcionários com essa escala...');
    const { data: funcionarios, error: funcError } = await supabase
      .from('funcionarios')
      .select(`
        id, nome_completo, ativo,
        cargo:cargos(id, nome_cargo, escala_id)
      `)
      .eq('cargo.escala_id', escala.id)
      .eq('ativo', true)
      .limit(3);

    if (funcError) {
      console.error('❌ Erro ao buscar funcionários:', funcError.message);
      return;
    }

    if (!funcionarios || funcionarios.length === 0) {
      console.log('⚠️ Nenhum funcionário ativo encontrado com essa escala');
      console.log('   Será necessário criar um funcionário de teste ou usar escala existente');
      return;
    }

    console.log(`✅ Encontrados ${funcionarios.length} funcionário(s) com essa escala:`);
    funcionarios.forEach(func => {
      console.log(`   - ${func.nome_completo} (ID: ${func.id})`);
    });

    console.log('\n🎯 Teste configurado com sucesso!');
    console.log('📋 Próximos passos manuais:');
    console.log('   1. Acesse "Escalas Mensais e Anuais"');
    console.log('   2. Selecione dezembro/2025');
    console.log('   3. Clique em "Gerar Escala"');
    console.log('   4. Verifique se o vigia trabalha apenas nos dias pares');
    console.log(`   5. Dias esperados: ${diasPares.join(', ')}`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testEscalaPalmvig();