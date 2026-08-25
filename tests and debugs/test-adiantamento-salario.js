// Teste para verificar se o "Adiantam. de Salário" está sendo exibido corretamente

console.log('🧪 TESTE: Verificação do Adiantam. de Salário');
console.log('═══════════════════════════════════════════════════════════');

// Simular resultado de folha com adiantamento de salário
const resultadoFolha = {
    salario_base: 2000.00,
    total_proventos: 2000.00,
    desconto_inss: 220.00,
    desconto_irrf: 0.00,
    desconto_adiantamento_salario: 500.00, // ✅ ADIANTAMENTO DE SALÁRIO
    total_descontos: 720.00,
    salario_liquido: 1280.00
};

// Simular eventos excepcionais (como seria carregado do banco)
const eventosExcepcionais = [
    {
        descricao: 'Adiantam. de Salário',
        valor: 500.00,
        tipo: 'desconto'
    }
];

console.log('📋 Resultado da Folha:');
console.log('  - Salário Base:', resultadoFolha.salario_base);
console.log('  - Desconto Adiantamento Salário:', resultadoFolha.desconto_adiantamento_salario);
console.log('  - Total Descontos:', resultadoFolha.total_descontos);

console.log('\n📋 Eventos Excepcionais:');
eventosExcepcionais.forEach((evento, index) => {
    console.log(`  ${index + 1}. ${evento.descricao}: ${evento.valor} (${evento.tipo})`);
});

// Simular função mapearFolhaParaHolerite
function testarMapeamentoHolerite(resultado, eventos) {
    const lancamentos = [];
    
    // Salário Base
    if (resultado.salario_base > 0) {
        lancamentos.push({
            codigo: '0001',
            descricao: 'Salário',
            valor: resultado.salario_base,
            tipo: 'provento'
        });
    }
    
    // Desconto Adiantamento de Salário (do resultado)
    if (resultado.desconto_adiantamento_salario > 0) {
        lancamentos.push({
            codigo: '5016',
            descricao: 'Adiantam. de Salário',
            valor: resultado.desconto_adiantamento_salario,
            tipo: 'desconto'
        });
    }
    
    // INSS
    if (resultado.desconto_inss > 0) {
        lancamentos.push({
            codigo: '9860',
            descricao: 'INSS',
            valor: resultado.desconto_inss,
            tipo: 'desconto'
        });
    }
    
    // Eventos excepcionais
    if (eventos && eventos.length > 0) {
        eventos.forEach(evento => {
            // Ignorar benefícios (vão para o Recibo de Benefícios)
            if (evento.tipo === 'beneficio') return;
            
            let codigo = evento.tipo === 'provento' ? '0002' : '5005';
            
            // Mapear descrição para código contábil específico
            if (evento.tipo === 'desconto') {
                if (evento.descricao === 'Adiantam. de Salário') codigo = '5016';
            }
            
            lancamentos.push({
                codigo,
                descricao: evento.descricao,
                valor: Math.abs(evento.valor),
                tipo: evento.tipo
            });
        });
    }
    
    return lancamentos;
}

const lancamentosHolerite = testarMapeamentoHolerite(resultadoFolha, eventosExcepcionais);

console.log('\n📄 LANÇAMENTOS NO HOLERITE:');
console.log('═══════════════════════════════════════════════════════════');
lancamentosHolerite.forEach((lancamento, index) => {
    const sinal = lancamento.tipo === 'provento' ? '+' : '-';
    console.log(`  ${index + 1}. [${lancamento.codigo}] ${lancamento.descricao}: ${sinal}R$ ${lancamento.valor.toFixed(2)}`);
});

// Verificar se o adiantamento aparece
const adiantamentoEncontrado = lancamentosHolerite.find(l => l.codigo === '5016');

console.log('\n🔍 VERIFICAÇÃO:');
console.log('═══════════════════════════════════════════════════════════');
if (adiantamentoEncontrado) {
    console.log('✅ SUCESSO: Adiantam. de Salário encontrado no holerite!');
    console.log(`   - Código: ${adiantamentoEncontrado.codigo}`);
    console.log(`   - Descrição: ${adiantamentoEncontrado.descricao}`);
    console.log(`   - Valor: R$ ${adiantamentoEncontrado.valor.toFixed(2)}`);
    console.log(`   - Tipo: ${adiantamentoEncontrado.tipo}`);
} else {
    console.log('❌ ERRO: Adiantam. de Salário NÃO encontrado no holerite!');
}

// Testar recibo de pagamento
console.log('\n💰 RECIBO DE PAGAMENTO:');
console.log('═══════════════════════════════════════════════════════════');

const salarioLiquido = resultadoFolha.salario_liquido;
const beneficiosLiquidos = 0; // Assumindo que não há benefícios neste teste
const totalGeralRecebido = salarioLiquido + beneficiosLiquidos;

console.log('  - Salário Líquido: R$', salarioLiquido.toFixed(2));
console.log('  - Benefícios Líquidos: R$', beneficiosLiquidos.toFixed(2));
console.log('  - Total Geral Recebido: R$', totalGeralRecebido.toFixed(2));

console.log('\n📋 ITENS NO RECIBO DE PAGAMENTO:');
console.log('  1. Salário Líquido: R$', salarioLiquido.toFixed(2));
if (beneficiosLiquidos > 0) {
    console.log('  2. [Benefícios seriam listados aqui]');
}

console.log('\n🎯 RESULTADO ESPERADO:');
console.log('═══════════════════════════════════════════════════════════');
console.log('✅ HOLERITE deve mostrar:');
console.log('   - [0001] Salário: +R$ 2000.00');
console.log('   - [5016] Adiantam. de Salário: -R$ 500.00');
console.log('   - [9860] INSS: -R$ 220.00');
console.log('   - Total Líquido: R$ 1280.00');

console.log('\n✅ RECIBO DE PAGAMENTO deve mostrar:');
console.log('   - Salário Líquido: R$ 1280.00');
console.log('   - [Benefícios se houver]');
console.log('   - Total depositado: R$ 1280.00');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔧 TESTE CONCLUÍDO!');
console.log('   Se o adiantamento não aparecer, verificar:');
console.log('   1. Se o valor está sendo salvo no banco');
console.log('   2. Se está sendo carregado corretamente');
console.log('   3. Se o mapeamento está funcionando');
console.log('═══════════════════════════════════════════════════════════');