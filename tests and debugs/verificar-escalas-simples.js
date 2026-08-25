// Verificação simples das escalas de limpeza e zeladoria
console.log('🔍 Verificando escalas de limpeza e zeladoria...');
console.log('═══════════════════════════════════════════════════════════');

// Simulação das escalas que devem ser verificadas
const escalasParaVerificar = [
  'FIGLIMPT1',   // Auxiliar de Limpeza Figueiras T1
  'FIGZELADT1',  // Zelador Figueiras T1
  'GALLIMPT1',   // Auxiliar de Limpeza Galleria T1
  'GALZELADT1',  // Zelador Galleria T1
  'PALMLIMPT1',  // Auxiliar de Limpeza Palmeiras T1
  'PALMLIMPT2'   // Auxiliar de Limpeza Palmeiras T2
];

console.log('📋 Escalas que devem ser verificadas:');
escalasParaVerificar.forEach(escala => {
  console.log(`   - ${escala}`);
});

console.log('\n🎯 PROBLEMA IDENTIFICADO:');
console.log('   01/01/2026 é FERIADO e DOMINGO');
console.log('   Funcionários de limpeza e zeladoria estão com horários marcados');
console.log('   Quando deveriam estar de FOLGA');

console.log('\n✅ CONFIGURAÇÃO CORRETA NECESSÁRIA:');
console.log('   Para todas as escalas de limpeza e zeladoria:');
console.log('   - trabalha_domingo = FALSE');
console.log('   - trabalha_feriado = FALSE');

console.log('\n🔧 PRÓXIMOS PASSOS:');
console.log('   1. Verificar configuração atual no banco de dados');
console.log('   2. Corrigir escalas que estão com configuração incorreta');
console.log('   3. Testar geração de escala para 01/01/2026');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📝 CONSULTA SQL PARA VERIFICAR:');
console.log(`
SELECT 
  codigo_escala,
  nome_escala,
  trabalha_domingo,
  trabalha_feriado,
  tipo_alternancia,
  ativa
FROM regras_escalas 
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true
ORDER BY codigo_escala;
`);

console.log('\n🔧 CONSULTA SQL PARA CORRIGIR (se necessário):');
console.log(`
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true;
`);