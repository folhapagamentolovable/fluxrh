// Teste para validar se a nova coluna estado_inicial_01_01 funciona corretamente
// com a escala PALMVIGDIURNOT1

console.log('🔍 Teste da Nova Coluna estado_inicial_01_01 - PALMVIGDIURNOT1\n');

// Simular a lógica atual do escalaGenerator.ts
const DATA_INICIO_UNIVERSAL = new Date('2025-01-01');

function checkDiaAlternado(data, trabalhaNodia_zero) {
  const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
  const isTrabalho = trabalhaNodia_zero 
    ? diasDecorridos % 2 === 0 
    : diasDecorridos % 2 !== 0;
  return isTrabalho;
}

function testarEscalaPalmvig() {
  console.log('📋 Configuração da Escala PALMVIGDIURNOT1:');
  console.log('   - Tipo: Dias alternados (12x12)');
  console.log('   - T1 = trabalhaNodia_zero = true (trabalha no dia 0 = 01/01/2025)');
  console.log('   - Horário: 06:00-18:00 (12h corridas)\n');

  // Testar dezembro de 2025
  console.log('🗓️ Testando Dezembro/2025:');
  console.log('   Data de referência: 01/01/2025 (dia 0)');
  console.log('   PALMVIGDIURNOT1 deve trabalhar nos dias PARES de dezembro\n');

  const diasTrabalho = [];
  const diasFolga = [];

  // Testar cada dia de dezembro/2025
  for (let dia = 1; dia <= 31; dia++) {
    const data = new Date(2025, 11, dia); // Dezembro = mês 11
    const trabalha = checkDiaAlternado(data, true); // PALMVIGDIURNOT1 = true
    
    if (trabalha) {
      diasTrabalho.push(dia);
    } else {
      diasFolga.push(dia);
    }
  }

  console.log('✅ Resultado do Teste:');
  console.log(`   Dias de TRABALHO: ${diasTrabalho.join(', ')}`);
  console.log(`   Dias de FOLGA: ${diasFolga.join(', ')}`);
  console.log(`   Total trabalho: ${diasTrabalho.length} dias`);
  console.log(`   Total folga: ${diasFolga.length} dias\n`);

  // Verificar se trabalha nos dias pares
  const diasPares = diasTrabalho.filter(dia => dia % 2 === 0);
  const diasImpares = diasTrabalho.filter(dia => dia % 2 !== 0);

  console.log('🎯 Validação - Trabalha nos Dias Pares?');
  console.log(`   Dias pares trabalhados: ${diasPares.join(', ')} (${diasPares.length} dias)`);
  console.log(`   Dias ímpares trabalhados: ${diasImpares.join(', ')} (${diasImpares.length} dias)`);

  if (diasImpares.length === 0) {
    console.log('   ✅ SUCESSO: Trabalha APENAS nos dias pares!');
  } else {
    console.log('   ❌ ERRO: Também trabalha em dias ímpares!');
  }

  // Mostrar alguns exemplos específicos
  console.log('\n📅 Exemplos Específicos:');
  const exemplos = [1, 2, 15, 16, 30, 31];
  exemplos.forEach(dia => {
    const data = new Date(2025, 11, dia);
    const trabalha = checkDiaAlternado(data, true);
    const status = trabalha ? 'TRABALHA' : 'FOLGA';
    const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   ${dia}/12/2025: ${status} (${diasDecorridos} dias desde 01/01)`);
  });

  console.log('\n🔧 Para testar na interface:');
  console.log('   1. Acesse "Escalas Mensais e Anuais"');
  console.log('   2. Selecione Dezembro/2025');
  console.log('   3. Clique em "Gerar Escala"');
  console.log('   4. Procure por funcionários com escala PALMVIGDIURNOT1');
  console.log(`   5. Verifique se trabalham apenas nos dias: ${diasPares.join(', ')}`);
}

testarEscalaPalmvig();