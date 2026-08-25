// Script de debug para adicionar logs na detecção de feriados
// Adiciona console.log detalhados para diagnosticar o problema

console.log('🔧 SCRIPT DE DEBUG PARA DETECÇÃO DE FERIADOS');
console.log('═══════════════════════════════════════════════════════════');

console.log('📋 CÓDIGO DE DEBUG PARA ADICIONAR NO MonthlyYearlySchedule.tsx:');

console.log('\n1. 🔍 DEBUG NO CARREGAMENTO DE FERIADOS:');
console.log(`
// Adicionar após const { data: feriados } = useFeriados();
React.useEffect(() => {
    console.log('🎉 [DEBUG] Feriados carregados:', feriados);
    console.log('🎉 [DEBUG] Quantidade de feriados:', feriados?.length || 0);
    if (feriados && feriados.length > 0) {
        feriados.forEach(f => {
            console.log(\`🎉 [DEBUG] Feriado: \${f.nome_feriado} - \${f.data_feriado} (tipo: \${typeof f.data_feriado})\`);
        });
    }
}, [feriados]);
`);

console.log('\n2. 🔍 DEBUG NA VERIFICAÇÃO DE FERIADO:');
console.log(`
// Substituir a verificação de feriado por:
console.log(\`🔍 [DEBUG] Verificando feriado para dia \${dia}/\${mes}/\${ano}\`);
console.log(\`🔍 [DEBUG] Array de feriados disponível:\`, feriados);

const feriado = feriados?.find(f => {
    console.log(\`🔍 [DEBUG] Testando feriado: \${f.nome_feriado} - \${f.data_feriado}\`);
    
    const dataFeriado = new Date(f.data_feriado + 'T00:00:00');
    console.log(\`🔍 [DEBUG] Data do feriado convertida:\`, dataFeriado);
    console.log(\`🔍 [DEBUG] getDate(): \${dataFeriado.getDate()}, getMonth(): \${dataFeriado.getMonth()}, getFullYear(): \${dataFeriado.getFullYear()}\`);
    console.log(\`🔍 [DEBUG] Comparando com: dia=\${dia}, mes-1=\${mes-1}, ano=\${ano}\`);
    
    const match = dataFeriado.getDate() === dia && 
                  dataFeriado.getMonth() === mes - 1 && 
                  dataFeriado.getFullYear() === ano;
    
    console.log(\`🔍 [DEBUG] Match: \${match}\`);
    return match;
});

const ehFeriado = !!feriado;
console.log(\`🔍 [DEBUG] Resultado final - ehFeriado: \${ehFeriado}\`);
if (feriado) {
    console.log(\`🎉 [DEBUG] Feriado encontrado: \${feriado.nome_feriado}\`);
}
`);

console.log('\n3. 🔍 DEBUG NO INTERPRETADOR:');
console.log(`
// Adicionar antes da chamada do interpretarRegraEscala:
console.log(\`🔧 [DEBUG] Chamando interpretador com ehFeriado: \${ehFeriado}\`);

const interpretacao = interpretarRegraEscala(regrasJSON, dia, mes, ano, diaSemana, ehFeriado);

console.log(\`🔧 [DEBUG] Resultado do interpretador:\`, interpretacao);
`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🧪 TESTE ESPECÍFICO PARA 01/01/2026:');

console.log(`
// Teste manual no console do navegador:
const testarFeriado = (feriados, dia, mes, ano) => {
    console.log('🧪 TESTE DE DETECÇÃO DE FERIADO');
    console.log(\`Testando: \${dia}/\${mes}/\${ano}\`);
    console.log('Feriados disponíveis:', feriados);
    
    if (!feriados || feriados.length === 0) {
        console.log('❌ PROBLEMA: Array de feriados está vazio!');
        return false;
    }
    
    const feriado = feriados.find(f => {
        console.log(\`Testando: \${f.nome_feriado} - \${f.data_feriado}\`);
        const dataFeriado = new Date(f.data_feriado + 'T00:00:00');
        const match = dataFeriado.getDate() === dia && 
                      dataFeriado.getMonth() === mes - 1 && 
                      dataFeriado.getFullYear() === ano;
        console.log(\`Match: \${match}\`);
        return match;
    });
    
    console.log('Resultado:', !!feriado);
    return !!feriado;
};

// Executar teste:
// testarFeriado(feriados, 1, 1, 2026);
`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔧 VERIFICAÇÕES ADICIONAIS:');

console.log('\n1. ✅ VERIFICAR SE FERIADO EXISTE NO BANCO:');
console.log('   SELECT * FROM feriados WHERE data_feriado = \'2026-01-01\';');

console.log('\n2. ✅ VERIFICAR FORMATO DA DATA NO BANCO:');
console.log('   SELECT data_feriado, LENGTH(data_feriado), typeof(data_feriado) FROM feriados;');

console.log('\n3. ✅ VERIFICAR SE HÁ FILTROS NA CONSULTA:');
console.log('   - Verificar implementação do useFeriados()');
console.log('   - Pode haver filtro por ano ou data');

console.log('\n4. ✅ VERIFICAR POLÍTICAS RLS:');
console.log('   - Verificar se há Row Level Security bloqueando feriados');
console.log('   - Testar consulta direta no Supabase');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🚀 COMO USAR ESTE DEBUG:');

console.log('\n1. Copie o código de debug acima');
console.log('2. Cole no arquivo MonthlyYearlySchedule.tsx');
console.log('3. Salve e recarregue a página');
console.log('4. Abra o console do navegador (F12)');
console.log('5. Gere uma escala para Janeiro/2026');
console.log('6. Analise os logs para identificar onde está falhando');

console.log('\n📊 LOGS ESPERADOS PARA 01/01/2026:');
console.log('   ✅ Feriados carregados: [array com pelo menos 1 item]');
console.log('   ✅ Testando feriado: Confraternização Universal - 2026-01-01');
console.log('   ✅ Match: true');
console.log('   ✅ ehFeriado: true');
console.log('   ✅ Resultado do interpretador: { trabalha: false, folga: true }');

console.log('\n❌ LOGS QUE INDICAM PROBLEMA:');
console.log('   ❌ Feriados carregados: [] (array vazio)');
console.log('   ❌ Match: false (para 01/01/2026)');
console.log('   ❌ ehFeriado: false');
console.log('   ❌ Resultado do interpretador: { trabalha: true, folga: false }');