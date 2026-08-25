// Teste da nova função gerarEscalaComEstadoInicial

import { gerarEscalaComEstadoInicial } from '../utils/escalaGenerator.js';

console.log('🔍 Teste da Nova Função gerarEscalaComEstadoInicial\n');

function testarNovaFuncao() {
  const startDate = new Date(2025, 11, 1); // 1º dezembro 2025
  const endDate = new Date(2025, 11, 10);   // 10 dezembro 2025

  console.log('📋 Testando PALMVIGDIURNOT1 com diferentes estados iniciais:\n');

  // Teste 1: Estado inicial = 'trabalha' (deve trabalhar nos dias pares)
  console.log('1️⃣ Estado inicial = "trabalha":');
  const escalaTrabalha = gerarEscalaComEstadoInicial(
    'PALMVIGDIURNOT1',
    startDate,
    endDate,
    'trabalha'
  );

  const diasTrabalhaTrabalha = escalaTrabalha
    .filter(item => item.status === 'TRABALHO')
    .map(item => item.data.getDate());

  console.log(`   Dias de trabalho: ${diasTrabalhaTrabalha.join(', ')}`);

  // Teste 2: Estado inicial = 'folga' (deve trabalhar nos dias ímpares)
  console.log('\n2️⃣ Estado inicial = "folga":');
  const escalaFolga = gerarEscalaComEstadoInicial(
    'PALMVIGDIURNOT1',
    startDate,
    endDate,
    'folga'
  );

  const diasTrabalhaFolga = escalaFolga
    .filter(item => item.status === 'TRABALHO')
    .map(item => item.data.getDate());

  console.log(`   Dias de trabalho: ${diasTrabalhaFolga.join(', ')}`);

  // Teste 3: Estado inicial = null (deve usar lógica antiga)
  console.log('\n3️⃣ Estado inicial = null (lógica antiga):');
  const escalaNull = gerarEscalaComEstadoInicial(
    'PALMVIGDIURNOT1',
    startDate,
    endDate,
    null
  );

  const diasTrabalhaNull = escalaNull
    .filter(item => item.status === 'TRABALHO')
    .map(item => item.data.getDate());

  console.log(`   Dias de trabalho: ${diasTrabalhaNull.join(', ')}`);

  // Análise dos resultados
  console.log('\n🎯 Análise dos Resultados:');
  
  const paresTrabalha = diasTrabalhaTrabalha.filter(d => d % 2 === 0);
  const imparesTrabalha = diasTrabalhaTrabalha.filter(d => d % 2 !== 0);
  
  const paresFolga = diasTrabalhaFolga.filter(d => d % 2 === 0);
  const imparesFolga = diasTrabalhaFolga.filter(d => d % 2 !== 0);

  console.log(`   Estado "trabalha": Pares=${paresTrabalha.length}, Ímpares=${imparesTrabalha.length}`);
  console.log(`   Estado "folga": Pares=${paresFolga.length}, Ímpares=${imparesFolga.length}`);

  // Validações
  if (paresTrabalha.length > 0 && imparesTrabalha.length === 0) {
    console.log('   ✅ Estado "trabalha" funciona corretamente (trabalha nos pares)');
  } else {
    console.log('   ❌ Estado "trabalha" não está funcionando corretamente');
  }

  if (imparesFolga.length > 0 && paresFolga.length === 0) {
    console.log('   ✅ Estado "folga" funciona corretamente (trabalha nos ímpares)');
  } else {
    console.log('   ❌ Estado "folga" não está funcionando corretamente');
  }

  console.log('\n🔧 Conclusão:');
  console.log('   A nova coluna estado_inicial_01_01 permite controlar explicitamente');
  console.log('   se a escala inicia trabalhando ou folgando em 01/01/2025');
  console.log('   Isso elimina a ambiguidade dos códigos T1/T2!');
}

testarNovaFuncao();