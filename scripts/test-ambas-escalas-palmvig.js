// Teste comparativo entre PALMVIGDIURNOT1 e PALMVIGDIURNOT2

console.log('🔍 Teste Comparativo: PALMVIGDIURNOT1 vs PALMVIGDIURNOT2\n');

const DATA_INICIO_UNIVERSAL = new Date('2025-01-01');

function checkDiaAlternado(data, trabalhaNodia_zero) {
  const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
  const isTrabalho = trabalhaNodia_zero 
    ? diasDecorridos % 2 === 0 
    : diasDecorridos % 2 !== 0;
  return isTrabalho;
}

function testarAmbasEscalas() {
  console.log('📋 Configurações:');
  console.log('   PALMVIGDIURNOT1 (T1): trabalhaNodia_zero = true');
  console.log('   PALMVIGDIURNOT2 (T2): trabalhaNodia_zero = false');
  console.log('   Data de referência: 01/01/2025 (dia 0)\n');

  const resultadoT1 = { trabalho: [], folga: [] };
  const resultadoT2 = { trabalho: [], folga: [] };

  // Testar primeiros 10 dias de dezembro/2025
  console.log('🗓️ Primeiros 10 dias de Dezembro/2025:');
  console.log('Dia | T1 (PALMVIGDIURNOT1) | T2 (PALMVIGDIURNOT2) | Dias desde 01/01');
  console.log('----|---------------------|---------------------|------------------');

  for (let dia = 1; dia <= 10; dia++) {
    const data = new Date(2025, 11, dia);
    const diasDecorridos = Math.floor((data.getTime() - DATA_INICIO_UNIVERSAL.getTime()) / (1000 * 60 * 60 * 24));
    
    const trabalhaT1 = checkDiaAlternado(data, true);  // PALMVIGDIURNOT1
    const trabalhaT2 = checkDiaAlternado(data, false); // PALMVIGDIURNOT2
    
    const statusT1 = trabalhaT1 ? 'TRABALHA' : 'FOLGA   ';
    const statusT2 = trabalhaT2 ? 'TRABALHA' : 'FOLGA   ';
    
    console.log(`${dia.toString().padStart(2)} | ${statusT1}          | ${statusT2}          | ${diasDecorridos}`);
    
    if (trabalhaT1) resultadoT1.trabalho.push(dia);
    else resultadoT1.folga.push(dia);
    
    if (trabalhaT2) resultadoT2.trabalho.push(dia);
    else resultadoT2.folga.push(dia);
  }

  console.log('\n✅ Resumo dos primeiros 10 dias:');
  console.log(`   T1 trabalha nos dias: ${resultadoT1.trabalho.join(', ')}`);
  console.log(`   T2 trabalha nos dias: ${resultadoT2.trabalho.join(', ')}`);

  // Verificar padrão par/ímpar
  const t1Pares = resultadoT1.trabalho.filter(d => d % 2 === 0);
  const t1Impares = resultadoT1.trabalho.filter(d => d % 2 !== 0);
  const t2Pares = resultadoT2.trabalho.filter(d => d % 2 === 0);
  const t2Impares = resultadoT2.trabalho.filter(d => d % 2 !== 0);

  console.log('\n🎯 Análise Par/Ímpar:');
  console.log(`   T1 - Dias pares: ${t1Pares.join(', ')} | Ímpares: ${t1Impares.join(', ')}`);
  console.log(`   T2 - Dias pares: ${t2Pares.join(', ')} | Ímpares: ${t2Impares.join(', ')}`);

  if (t1Impares.length > 0 && t1Pares.length === 0) {
    console.log('   ✅ T1 trabalha apenas nos dias ÍMPARES');
  }
  if (t2Pares.length > 0 && t2Impares.length === 0) {
    console.log('   ✅ T2 trabalha apenas nos dias PARES');
  }

  console.log('\n🔧 Conclusão:');
  console.log('   Para ter um vigia trabalhando nos dias PARES, use PALMVIGDIURNOT2');
  console.log('   Para ter um vigia trabalhando nos dias ÍMPARES, use PALMVIGDIURNOT1');
}

testarAmbasEscalas();