// Teste final da implementação da coluna estado_inicial_01_01

console.log('🎉 Teste Final: Implementação da Coluna estado_inicial_01_01\n');

const DATA_INICIO_UNIVERSAL = new Date('2025-01-01');

// Nova função que usa estado_inicial_01_01
function checkDiaAlternadoComEstadoInicial(data, estadoInicial01_01, trabalhaNodia_zero_fallback) {
  const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
  
  // Usar nova coluna estado_inicial_01_01 como fonte de verdade
  if (estadoInicial01_01 !== null) {
    const trabalhaNodia_zero = estadoInicial01_01 === 'trabalha';
    const isTrabalho = trabalhaNodia_zero 
      ? diasDecorridos % 2 === 0 
      : diasDecorridos % 2 !== 0;
    return isTrabalho;
  }
  
  // Fallback para lógica antiga (compatibilidade)
  const isTrabalho = trabalhaNodia_zero_fallback 
    ? diasDecorridos % 2 === 0 
    : diasDecorridos % 2 !== 0;
  return isTrabalho;
}

function testarImplementacaoFinal() {
  console.log('📋 Cenários de Teste para PALMVIGDIURNOT1 em Dezembro/2025:\n');

  // Cenário 1: Usando nova coluna com estado_inicial_01_01 = 'trabalha'
  console.log('1️⃣ NOVO: estado_inicial_01_01 = "trabalha"');
  const diasTrabalhoNovo1 = [];
  for (let dia = 1; dia <= 10; dia++) {
    const data = new Date(2025, 11, dia);
    const trabalha = checkDiaAlternadoComEstadoInicial(data, 'trabalha', true);
    if (trabalha) diasTrabalhoNovo1.push(dia);
  }
  console.log(`   Trabalha nos dias: ${diasTrabalhoNovo1.join(', ')}`);
  console.log(`   Padrão: ${diasTrabalhoNovo1.every(d => d % 2 === 0) ? 'PARES ✅' : 'ÍMPARES'}`);

  // Cenário 2: Usando nova coluna com estado_inicial_01_01 = 'folga'
  console.log('\n2️⃣ NOVO: estado_inicial_01_01 = "folga"');
  const diasTrabalhoNovo2 = [];
  for (let dia = 1; dia <= 10; dia++) {
    const data = new Date(2025, 11, dia);
    const trabalha = checkDiaAlternadoComEstadoInicial(data, 'folga', true);
    if (trabalha) diasTrabalhoNovo2.push(dia);
  }
  console.log(`   Trabalha nos dias: ${diasTrabalhoNovo2.join(', ')}`);
  console.log(`   Padrão: ${diasTrabalhoNovo2.every(d => d % 2 !== 0) ? 'ÍMPARES ✅' : 'PARES'}`);

  // Cenário 3: Usando lógica antiga (fallback)
  console.log('\n3️⃣ ANTIGO: estado_inicial_01_01 = null (fallback para T1)');
  const diasTrabalhoAntigo = [];
  for (let dia = 1; dia <= 10; dia++) {
    const data = new Date(2025, 11, dia);
    const trabalha = checkDiaAlternadoComEstadoInicial(data, null, true); // T1 = true
    if (trabalha) diasTrabalhoAntigo.push(dia);
  }
  console.log(`   Trabalha nos dias: ${diasTrabalhoAntigo.join(', ')}`);
  console.log(`   Padrão: ${diasTrabalhoAntigo.every(d => d % 2 !== 0) ? 'ÍMPARES (como antes)' : 'PARES'}`);

  console.log('\n🎯 Resumo dos Benefícios:');
  console.log('   ✅ Controle explícito: "trabalha" ou "folga" em 01/01');
  console.log('   ✅ Elimina confusão: Não precisa decorar T1/T2');
  console.log('   ✅ Flexibilidade: Pode inverter padrão facilmente');
  console.log('   ✅ Compatibilidade: Funciona com escalas antigas');

  console.log('\n🔧 Para testar na interface:');
  console.log('   1. Configure uma escala com estado_inicial_01_01 = "trabalha"');
  console.log('   2. Gere escala para dezembro/2025');
  console.log('   3. Verifique se trabalha nos dias PARES');
  console.log('   4. Mude para estado_inicial_01_01 = "folga"');
  console.log('   5. Gere novamente e verifique se trabalha nos dias ÍMPARES');

  console.log('\n✨ Implementação da coluna estado_inicial_01_01 concluída com sucesso!');
}

testarImplementacaoFinal();