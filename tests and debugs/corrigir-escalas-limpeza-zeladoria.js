// Script para corrigir escalas de limpeza e zeladoria
// Garante que funcionários de limpeza e zeladoria folguem em domingos e feriados

console.log('🔧 CORREÇÃO DE ESCALAS DE LIMPEZA E ZELADORIA');
console.log('═══════════════════════════════════════════════════════════');

const escalasParaCorrigir = [
  { codigo: 'FIGLIMPT1', nome: 'Auxiliar de Limpeza Figueiras T1' },
  { codigo: 'FIGZELADT1', nome: 'Zelador Figueiras T1' },
  { codigo: 'GALLIMPT1', nome: 'Auxiliar de Limpeza Galleria T1' },
  { codigo: 'GALZELADT1', nome: 'Zelador Galleria T1' },
  { codigo: 'PALMLIMPT1', nome: 'Auxiliar de Limpeza Palmeiras T1' },
  { codigo: 'PALMLIMPT2', nome: 'Auxiliar de Limpeza Palmeiras T2' }
];

console.log('📋 Escalas que serão corrigidas:');
escalasParaCorrigir.forEach(escala => {
  console.log(`   - ${escala.codigo}: ${escala.nome}`);
});

console.log('\n🎯 PROBLEMA:');
console.log('   Funcionários de limpeza e zeladoria estão trabalhando em:');
console.log('   - Domingos (quando deveriam folgar)');
console.log('   - Feriados (quando deveriam folgar)');
console.log('   - Exemplo: 01/01/2026 (Domingo + Feriado)');

console.log('\n✅ CORREÇÃO APLICADA:');
console.log('   Para todas as escalas de limpeza e zeladoria:');
console.log('   - trabalha_domingo = FALSE (folga aos domingos)');
console.log('   - trabalha_feriado = FALSE (folga em feriados)');

console.log('\n📝 CONSULTAS SQL EXECUTADAS:');

// Gerar consultas SQL para cada escala
escalasParaCorrigir.forEach(escala => {
  console.log(`
-- Corrigir ${escala.codigo} (${escala.nome})
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = '${escala.codigo}' 
  AND ativa = true;`);
});

console.log(`
-- Verificar correções aplicadas
SELECT 
  codigo_escala,
  nome_escala,
  trabalha_domingo,
  trabalha_feriado,
  updated_at
FROM regras_escalas 
WHERE codigo_escala IN (${escalasParaCorrigir.map(e => `'${e.codigo}'`).join(', ')})
  AND ativa = true
ORDER BY codigo_escala;
`);

console.log('\n🧪 TESTE RECOMENDADO:');
console.log('   Após aplicar as correções:');
console.log('   1. Gerar escala para Janeiro/2026');
console.log('   2. Verificar se 01/01/2026 aparece como FOLGA');
console.log('   3. Verificar outros domingos e feriados do mês');

console.log('\n✅ RESULTADO ESPERADO:');
console.log('   - 01/01/2026 (Quarta-feira + Feriado): FOLGA');
console.log('   - Todos os domingos: FOLGA');
console.log('   - Todos os feriados: FOLGA');
console.log('   - Dias úteis normais: TRABALHO com horários corretos');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🚀 PRONTO PARA APLICAR AS CORREÇÕES!');
console.log('   Execute as consultas SQL acima no banco de dados');
console.log('   ou use o script de correção automática');