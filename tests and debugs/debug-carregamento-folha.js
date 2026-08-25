// Debug para verificar o carregamento dos dados da tabela folha_calculada

console.log('🔍 DEBUG: Carregamento da Tabela folha_calculada');
console.log('═══════════════════════════════════════════════════════════');

// Simular a consulta que está sendo feita no CalculatedPayroll.tsx
const consultaSQL = `
SELECT 
    funcionario_id,
    nome_funcionario,
    mes,
    ano,
    salario_base,
    desconto_adiantamento_salario,
    total_proventos,
    total_descontos,
    salario_liquido,
    funcionario:funcionarios!inner(*,cargo:cargos(*),empresa:empresas(*)),
    empresa:empresas(*),
    posto_trabalho:postos_trabalho(*)
FROM folha_calculada
WHERE funcionario.demitido = false
  AND mes = ?
  AND ano = ?
`;

console.log('📋 CONSULTA SQL EXECUTADA:');
console.log(consultaSQL);

console.log('\n🔍 POSSÍVEIS PROBLEMAS:');
console.log('═══════════════════════════════════════════════════════════');

const problemasComuns = [
    {
        problema: 'Filtro funcionario.demitido = false',
        descricao: 'Se todos os funcionários estão marcados como demitidos, nenhum dado será retornado',
        solucao: 'Verificar campo demitido na tabela funcionarios'
    },
    {
        problema: 'JOIN com funcionarios!inner',
        descricao: 'Se não há funcionários correspondentes, o JOIN inner pode falhar',
        solucao: 'Verificar se funcionario_id existe na tabela funcionarios'
    },
    {
        problema: 'Mês/Ano não encontrados',
        descricao: 'Se não há dados para o mês/ano selecionado, retorna vazio',
        solucao: 'Verificar se existem registros na folha_calculada para o período'
    },
    {
        problema: 'Erro de permissão RLS',
        descricao: 'Row Level Security pode estar bloqueando o acesso',
        solucao: 'Verificar políticas RLS na tabela folha_calculada'
    },
    {
        problema: 'Campo demitido não existe',
        descricao: 'Se o campo demitido não existe na tabela funcionarios',
        solucao: 'Verificar estrutura da tabela funcionarios'
    }
];

problemasComuns.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.problema}`);
    console.log(`     Descrição: ${item.descricao}`);
    console.log(`     Solução: ${item.solucao}`);
    console.log('');
});

console.log('🔧 PASSOS PARA DEBUG:');
console.log('═══════════════════════════════════════════════════════════');

const passosDebug = [
    'Verificar se existem registros na tabela folha_calculada',
    'Verificar se o campo demitido existe na tabela funcionarios',
    'Verificar se funcionario_id na folha_calculada corresponde a IDs válidos',
    'Testar a consulta sem o filtro demitido = false',
    'Verificar logs de erro no console do navegador',
    'Verificar se as políticas RLS estão corretas'
];

passosDebug.forEach((passo, index) => {
    console.log(`  ${index + 1}. ${passo}`);
});

console.log('\n📊 CONSULTAS DE VERIFICAÇÃO:');
console.log('═══════════════════════════════════════════════════════════');

const consultasVerificacao = [
    'SELECT COUNT(*) FROM folha_calculada;',
    'SELECT COUNT(*) FROM funcionarios WHERE demitido = false;',
    'SELECT funcionario_id, nome_funcionario FROM folha_calculada LIMIT 5;',
    'SELECT id, nome_completo, demitido FROM funcionarios LIMIT 5;',
    'SELECT * FROM folha_calculada WHERE mes = [MES] AND ano = [ANO] LIMIT 3;'
];

consultasVerificacao.forEach((consulta, index) => {
    console.log(`  ${index + 1}. ${consulta}`);
});

console.log('\n🎯 SOLUÇÃO TEMPORÁRIA:');
console.log('═══════════════════════════════════════════════════════════');
console.log('Se o problema persistir, remover temporariamente o filtro:');
console.log('  .eq("funcionario.demitido", false)');
console.log('');
console.log('E verificar se os dados são carregados sem o filtro.');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔧 DEBUG CONCLUÍDO!');
console.log('   Execute as consultas de verificação no Supabase');
console.log('═══════════════════════════════════════════════════════════');