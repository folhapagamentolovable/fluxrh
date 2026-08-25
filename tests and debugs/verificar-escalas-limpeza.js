import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarEscalas() {
  console.log('🔍 Verificando escalas de limpeza e zeladoria...');
  console.log('═══════════════════════════════════════════════════════════');
  
  const escalas = ['FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2'];
  
  for (const codigo of escalas) {
    const { data, error } = await supabase
      .from('regras_escalas')
      .select('*')
      .eq('codigo_escala', codigo)
      .eq('ativa', true)
      .single();
    
    if (error) {
      console.log(`❌ ${codigo}: Erro - ${error.message}`);
      continue;
    }
    
    if (!data) {
      console.log(`⚠️ ${codigo}: Não encontrada`);
      continue;
    }
    
    console.log(`\n📋 ${codigo} (${data.nome_escala}):`);
    console.log(`   - Trabalha Domingo: ${data.trabalha_domingo}`);
    console.log(`   - Trabalha Feriado: ${data.trabalha_feriado}`);
    console.log(`   - Tipo Alternância: ${data.tipo_alternancia}`);
    
    // Verificar se está configurado corretamente para limpeza/zeladoria
    const problemas = [];
    
    if (data.trabalha_domingo === true) {
      problemas.push('❌ Configurado para TRABALHAR aos domingos (deveria ser FALSE)');
    }
    
    if (data.trabalha_feriado === true) {
      problemas.push('❌ Configurado para TRABALHAR em feriados (deveria ser FALSE)');
    }
    
    if (data.regras_json) {
      try {
        const regras = JSON.parse(data.regras_json);
        console.log(`   - Regras JSON - Trabalha Domingo: ${regras.trabalha_domingo}`);
        console.log(`   - Regras JSON - Trabalha Feriado: ${regras.trabalha_feriado}`);
        
        if (regras.trabalha_domingo === true) {
          problemas.push('❌ Regras JSON configuradas para TRABALHAR aos domingos');
        }
        
        if (regras.trabalha_feriado === true) {
          problemas.push('❌ Regras JSON configuradas para TRABALHAR em feriados');
        }
      } catch (e) {
        console.log(`   - Regras JSON: Erro ao parsear - ${e.message}`);
        problemas.push('❌ Regras JSON inválidas');
      }
    }
    
    if (problemas.length > 0) {
      console.log(`\n   🚨 PROBLEMAS ENCONTRADOS:`);
      problemas.forEach(p => console.log(`      ${p}`));
    } else {
      console.log(`   ✅ Configuração correta para limpeza/zeladoria`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 RESUMO:');
  console.log('   Para escalas de LIMPEZA e ZELADORIA:');
  console.log('   - trabalha_domingo deve ser FALSE');
  console.log('   - trabalha_feriado deve ser FALSE');
  console.log('   - Isso garante folga em domingos e feriados (como 01/01/2026)');
}

verificarEscalas().catch(console.error);