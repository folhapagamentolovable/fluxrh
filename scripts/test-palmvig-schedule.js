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

async function testPalmvigSchedule() {
  console.log('🔍 Testando geração de escala PALMVIGDIURNOT1 para dezembro/2025...\n');

  try {
    // 1. Buscar a regra PALMVIGDIURNOT1
    console.log('1. Buscando regra PALMVIGDIURNOT1...');
    const { data: regra, error: regraError } = await supabase
      .from('regras_escalas')
      .select('*')
      .eq('codigo_escala', 'PALMVIGDIURNOT1')
      .single();

    if (regraError || !regra) {
      console.error('❌ Regra PALMVIGDIURNOT1 não encontrada:', regraError?.message);
      return;
    }

    console.log('✅ Regra encontrada:');
    console.log(`   Código: ${regra.codigo_escala}`);
    console.log(`   Nome: ${regra.nome_escala}`);
    console.log(`   Tipo Alternância: ${regra.tipo_alternancia}`);
    console.log(`   Estado Inicial 01/01: ${regra.estado_inicial_01_01}`);

    // 2. Simular geração de escala para dezembro/2025
    console.log('\n2. Simulando geração de escala para dezembro/2025...');
    
    const ano = 2025;
    const mes = 12; // dezembro
    const diasNoMes = new Date(ano, mes, 0).getDate(); // 31 dias em dezembro
    
    console.log(`   Mês: ${mes}/${ano} (${diasNoMes} dias)`);
    
    // Lógica baseada no interpretador de escalas
    const escala = [];
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mes - 1, dia);
      const diaSemana = data.getDay(); // 0 = domingo, 1 = segunda, etc.
      
      let trabalha = false;
      
      if (regra.tipo_alternancia === 'DIAS_ALTERNADOS_T2' && regra.estado_inicial_01_01 === 'folga') {
        // Para T2 com estado inicial 'folga', deve trabalhar nos dias pares
        // Calcular dias desde 01/01/2025
        const inicioAno = new Date(2025, 0, 1); // 01/01/2025
        const diasDesdeInicio = Math.floor((data.getTime() - inicioAno.getTime()) / (1000 * 60 * 60 * 24));
        
        // Se estado inicial é 'folga', então:
        // Dia 0 (01/01) = folga
        // Dia 1 (02/01) = trabalha
        // Dia 2 (03/01) = folga
        // etc.
        trabalha = (diasDesdeInicio % 2) === 1;
      } else if (regra.tipo_alternancia === 'DIAS_ALTERNADOS_T1' && regra.estado_inicial_01_01 === 'trabalha') {
        // Para T1 com estado inicial 'trabalha', deve trabalhar nos dias ímpares
        const inicioAno = new Date(2025, 0, 1);
        const diasDesdeInicio = Math.floor((data.getTime() - inicioAno.getTime()) / (1000 * 60 * 60 * 24));
        trabalha = (diasDesdeInicio % 2) === 0;
      }
      
      escala.push({
        dia,
        data: data.toISOString().split('T')[0],
        diaSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][diaSemana],
        trabalha,
        tipo: trabalha ? 'TRABALHO' : 'FOLGA'
      });
    }
    
    // 3. Verificar se trabalha nos dias pares
    console.log('\n3. Verificando se trabalha nos dias pares...');
    
    const diasTrabalho = escala.filter(e => e.trabalha);
    const diasFolga = escala.filter(e => !e.trabalha);
    
    console.log(`   Total dias de trabalho: ${diasTrabalho.length}`);
    console.log(`   Total dias de folga: ${diasFolga.length}`);
    
    // Verificar se todos os dias de trabalho são pares
    const diasTrabalhoSaoPares = diasTrabalho.every(e => e.dia % 2 === 0);
    const diasFolgaSaoImpares = diasFolga.every(e => e.dia % 2 === 1);
    
    console.log(`   Todos os dias de trabalho são pares: ${diasTrabalhoSaoPares ? '✅' : '❌'}`);
    console.log(`   Todos os dias de folga são ímpares: ${diasFolgaSaoImpares ? '✅' : '❌'}`);
    
    // 4. Mostrar primeira semana como exemplo
    console.log('\n4. Primeira semana de dezembro/2025:');
    escala.slice(0, 7).forEach(e => {
      const status = e.trabalha ? '🟢 TRABALHA' : '🔴 FOLGA';
      console.log(`   ${e.data} (${e.diaSemana}) - Dia ${e.dia}: ${status}`);
    });
    
    // 5. Mostrar resumo dos dias pares/ímpares
    console.log('\n5. Resumo por paridade:');
    const diasPares = escala.filter(e => e.dia % 2 === 0);
    const diasImpares = escala.filter(e => e.dia % 2 === 1);
    
    const paresTrabalham = diasPares.filter(e => e.trabalha).length;
    const paresFolgam = diasPares.filter(e => !e.trabalha).length;
    const imparesTrabalham = diasImpares.filter(e => e.trabalha).length;
    const imparesFolgam = diasImpares.filter(e => !e.trabalha).length;
    
    console.log(`   Dias pares (${diasPares.length}): ${paresTrabalham} trabalham, ${paresFolgam} folgam`);
    console.log(`   Dias ímpares (${diasImpares.length}): ${imparesTrabalham} trabalham, ${imparesFolgam} folgam`);
    
    // 6. Resultado final
    console.log('\n6. Resultado do teste:');
    if (diasTrabalhoSaoPares && diasFolgaSaoImpares) {
      console.log('🎉 ✅ TESTE PASSOU: PALMVIGDIURNOT1 trabalha corretamente nos dias pares!');
    } else {
      console.log('❌ TESTE FALHOU: PALMVIGDIURNOT1 não está trabalhando nos dias pares como esperado.');
      
      // Mostrar dias que não seguem o padrão
      const diasErrados = escala.filter(e => 
        (e.dia % 2 === 0 && !e.trabalha) || (e.dia % 2 === 1 && e.trabalha)
      );
      
      if (diasErrados.length > 0) {
        console.log('\n   Dias que não seguem o padrão:');
        diasErrados.forEach(e => {
          const esperado = e.dia % 2 === 0 ? 'TRABALHA' : 'FOLGA';
          const atual = e.trabalha ? 'TRABALHA' : 'FOLGA';
          console.log(`     Dia ${e.dia}: esperado ${esperado}, atual ${atual}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

await testPalmvigSchedule();