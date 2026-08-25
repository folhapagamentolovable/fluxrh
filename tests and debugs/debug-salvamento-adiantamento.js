// Debug para verificar o salvamento do adiantamento de salário

console.log('🔍 DEBUG: Salvamento do Adiantamento de Salário');
console.log('═══════════════════════════════════════════════════════════');

// Simular o fluxo de salvamento
console.log('📋 FLUXO DE SALVAMENTO:');
console.log('1. Usuário adiciona evento excepcional "Adiantam. de Salário" = R$ 500');
console.log('2. Evento é adicionado ao estado eventosExcepcionais');
console.log('3. Folha é recalculada (mas desconto_adiantamento_salario permanece 0)');
console.log('4. Dados são salvos na tabela folha_calculada');

console.log('\n🔍 PROBLEMA IDENTIFICADO:');
console.log('═══════════════════════════════════════════════════════════');
console.log('O valor do evento excepcional NÃO está sendo transferido');
console.log('para o campo resultado.desconto_adiantamento_salario');

console.log('\n📊 VALORES ESPERADOS vs REAIS:');
console.log('═══════════════════════════════════════════════════════════');

const eventoExcepcional = {
    descricao: 'Adiantam. de Salário',
    valor: 500.00,
    tipo: 'desconto'
};

const resultadoAtual = {
    desconto_adiantamento_salario: 0 // ❌ PROBLEMA: Sempre 0
};

const resultadoEsperado = {
    desconto_adiantamento_salario: 500.00 // ✅ DEVERIA SER: Valor do evento
};

console.log('Evento Excepcional:', eventoExcepcional);
console.log('Resultado Atual:', resultadoAtual);
console.log('Resultado Esperado:', resultadoEsperado);

console.log('\n🔧 SOLUÇÃO NECESSÁRIA:');
console.log('═══════════════════════════════════════════════════════════');
console.log('1. Modificar a função calcularFolhaPagamento()');
console.log('2. Aplicar eventos excepcionais aos campos específicos');
console.log('3. Transferir valor do evento para resultado.desconto_adiantamento_salario');

console.log('\n📝 CÓDIGO NECESSÁRIO:');
console.log('═══════════════════════════════════════════════════════════');
console.log(`
// Na função calcularFolhaPagamento(), após calcular os valores base:

// Aplicar eventos excepcionais aos campos específicos
let desconto_adiantamento_salario_final = desconto_adiantamento_salario; // Inicialmente 0

if (eventosExcepcionais && eventosExcepcionais.length > 0) {
    eventosExcepcionais.forEach(evento => {
        if (evento.tipo === 'desconto' && evento.descricao === 'Adiantam. de Salário') {
            desconto_adiantamento_salario_final += evento.valor;
        }
    });
}

// Usar o valor final no resultado
return {
    // ... outros campos
    desconto_adiantamento_salario: truncar(desconto_adiantamento_salario_final),
    // ... outros campos
};
`);

console.log('\n🎯 LOCALIZAÇÃO DA CORREÇÃO:');
console.log('═══════════════════════════════════════════════════════════');
console.log('Arquivo: utils/calcularFolhaPagamento.ts');
console.log('Função: calcularFolhaPagamento()');
console.log('Linha aproximada: 1108 (onde desconto_adiantamento_salario = 0)');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔧 DEBUG CONCLUÍDO!');
console.log('   O problema está na função de cálculo');
console.log('   O evento excepcional não está sendo aplicado ao resultado');
console.log('═══════════════════════════════════════════════════════════');