import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente diretas
const supabaseUrl = "https://nmwrplxnjqyerorbbcxk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td3JwbHhuanF5ZXJvcmJiY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODA4OTYsImV4cCI6MjA3NTg1Njg5Nn0.Pf9j30tFgKQ5AMv0Y0puswj9NrPynDOWOuhkE2Hyfis";

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listarEscalas() {
  console.log('🔍 Consultando escalas na tabela regras_escalas...\n');
  
  // Primeiro, vamos ver se a tabela existe e quais colunas tem
  const { data: escalas, error } = await supabase
    .from('regras_escalas')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ Erro ao consultar escalas:', error);
    console.log('Tentando outras tabelas relacionadas...');
    
    // Tentar tabela escalas
    const { data: escalasAlt, error: errorAlt } = await supabase
      .from('escalas')
      .select('*')
      .limit(5);
    
    if (errorAlt) {
      console.error('❌ Erro ao consultar tabela escalas:', errorAlt);
    } else {
      console.log('✅ Dados da tabela escalas:', escalasAlt);
    }
    return;
  }
  
  if (!escalas || escalas.length === 0) {
    console.log('⚠️ Nenhuma escala encontrada na tabela regras_escalas');
    
    // Tentar tabela escalas
    const { data: escalasAlt, error: errorAlt } = await supabase
      .from('escalas')
      .select('*')
      .limit(10);
    
    if (errorAlt) {
      console.error('❌ Erro ao consultar tabela escalas:', errorAlt);
    } else if (escalasAlt && escalasAlt.length > 0) {
      console.log('✅ Encontrados dados na tabela escalas:');
      escalasAlt.forEach((escala, index) => {
        console.log(`${index + 1}. Código: ${escala.codigo || escala.id || 'N/A'}`);
        console.log(`   Dados:`, escala);
        console.log('');
      });
    }
    return;
  }
  
  console.log(`📋 Encontradas ${escalas.length} escalas:\n`);
  
  escalas.forEach((escala, index) => {
    console.log(`${index + 1}. ${escala.codigo_escala}`);
    console.log(`   Nome: ${escala.nome_escala}`);
    
    // Analisar horários de segunda-feira
    if (escala.horarios_segunda) {
      try {
        const horarios = typeof escala.horarios_segunda === 'string' 
          ? JSON.parse(escala.horarios_segunda) 
          : escala.horarios_segunda;
        
        if (horarios.entrada && horarios.saida) {
          const entrada = horarios.entrada;
          const saida = horarios.saida;
          const almoco = horarios.inicio_almoco && horarios.termino_almoco 
            ? `${horarios.inicio_almoco}-${horarios.termino_almoco}`
            : 'Sem almoço';
          
          console.log(`   Segunda: ${entrada} às ${saida} (Almoço: ${almoco})`);
          
          // Calcular jornada aproximada
          const [hE, mE] = entrada.split(':').map(Number);
          const [hS, mS] = saida.split(':').map(Number);
          let totalMin = (hS * 60 + mS) - (hE * 60 + mE);
          if (totalMin < 0) totalMin += 24 * 60;
          
          // Descontar almoço se houver
          if (horarios.inicio_almoco && horarios.termino_almoco) {
            const [hIA, mIA] = horarios.inicio_almoco.split(':').map(Number);
            const [hTA, mTA] = horarios.termino_almoco.split(':').map(Number);
            const almocoMin = (hTA * 60 + mTA) - (hIA * 60 + mIA);
            totalMin -= almocoMin;
          }
          
          const jornada = (totalMin / 60).toFixed(1);
          console.log(`   Jornada estimada: ${jornada}h`);
        }
      } catch (e) {
        console.log(`   Segunda: Erro ao analisar horários`);
      }
    }
    
    console.log('');
  });
}

listarEscalas().catch(console.error);