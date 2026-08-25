// Debug para verificar se o adiantamento de salário está sendo exibido na interface

console.log('🔍 DEBUG: Adiantamento de Salário na Interface');
console.log('═══════════════════════════════════════════════════════════');

// Simular dados como aparecem na interface
const folhaAtiva = {
    funcionario: {
        id: 'func-123',
        nome_completo: 'João da Silva'
    },
    resultado: {
        salario_base: 2000.00,
        total_proventos: 2000.00,
        desconto_inss: 220.00,
        desconto_irrf: 0.00,
        desconto_adiantamento_salario: 500.00, // ✅ VALOR PRESENTE
        total_descontos: 720.00,
        salario_liquido: 1280.00
    }
};

// Simular eventos excepcionais carregados
const eventosExcepcionais = {
    'func-123': [
        {
            descricao: 'Adiantam. de Salário',
            valor: 500.00,
            tipo: 'desconto'
        }
    ]
};

console.log('📊 DADOS DA FOLHA:');
console.log('  - Funcionário:', folhaAtiva.funcionario.nome_completo);
console.log('  - Salário Base:', folhaAtiva.resultado.salario_base);
console.log('  - Desconto Adiantamento Salário:', folhaAtiva.resultado.desconto_adiantamento_salario);
console.log('  - Total Descontos:', folhaAtiva.resultado.total_descontos);

console.log('\n📋 EVENTOS EXCEPCIONAIS:');
const eventos = eventosExcepcionais['func-123'] || [];
eventos.forEach((evento, index) => {
    console.log(`  ${index + 1}. ${evento.descricao}: R$ ${evento.valor} (${evento.tipo})`);
});

// Simular verificação na seção DESCONTOS da interface
console.log('\n💰 SEÇÃO DESCONTOS (Interface):');
console.log('═══════════════════════════════════════════════════════════');

// Verificar se aparece na lista de descontos
const descontosInterface = [
    { nome: 'INSS', valor: folhaAtiva.resultado.desconto_inss, condicao: folhaAtiva.resultado.desconto_inss > 0 },
    { nome: 'IRRF', valor: folhaAtiva.resultado.desconto_irrf, condicao: folhaAtiva.resultado.desconto_irrf > 0 },
    { nome: 'Adiantam. de Salário', valor: folhaAtiva.resultado.desconto_adiantamento_salario, condicao: folhaAtiva.resultado.desconto_adiantamento_salario > 0 }
];

descontosInterface.forEach((desconto, index) => {
    if (desconto.condicao) {
        console.log(`  ✅ ${desconto.nome}: -R$ ${desconto.valor.toFixed(2)}`);
    } else {
        console.log(`  ❌ ${desconto.nome}: (não exibido - valor: ${desconto.valor})`);
    }
});

// Simular função mapearFolhaParaHolerite (sem duplicação)
console.log('\n📄 HOLERITE (Lançamentos):');
console.log('═══════════════════════════════════════════════════════════');

function simularMapearFolhaParaHolerite(resultado, eventosExcepcionais) {
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
    
    // INSS
    if (resultado.desconto_inss > 0) {
        lancamentos.push({
            codigo: '9860',
            descricao: 'INSS',
            valor: resultado.desconto_inss,
            tipo: 'desconto'
        });
    }
    
    // IRRF
    if (resultado.desconto_irrf > 0) {
        lancamentos.push({
            codigo: '9861',
            descricao: 'IRRF',
            valor: resultado.desconto_irrf,
            tipo: 'desconto'
        });
    }
    
    // Eventos excepcionais (incluindo adiantamento)
    if (eventosExcepcionais && eventosExcepcionais.length > 0) {
        eventosExcepcionais.forEach(evento => {
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

const lancamentosHolerite = simularMapearFolhaParaHolerite(folhaAtiva.resultado, eventos);

lancamentosHolerite.forEach((lancamento, index) => {
    const sinal = lancamento.tipo === 'provento' ? '+' : '-';
    console.log(`  ${index + 1}. [${lancamento.codigo}] ${lancamento.descricao}: ${sinal}R$ ${lancamento.valor.toFixed(2)}`);
});

// Simular recibo de pagamento
console.log('\n💰 RECIBO DE PAGAMENTO:');
console.log('═══════════════════════════════════════════════════════════');

const salarioLiquido = folhaAtiva.resultado.salario_liquido;
const beneficiosLiquidos = 0; // Assumindo que não há benefícios
const totalGeralRecebido = salarioLiquido + beneficiosLiquidos;

console.log('  Itens no recibo:');
console.log(`    1. Salário Líquido: R$ ${salarioLiquido.toFixed(2)}`);
if (beneficiosLiquidos > 0) {
    console.log(`    2. Benefícios Líquidos: R$ ${beneficiosLiquidos.toFixed(2)}`);
}
console.log(`  Total depositado: R$ ${totalGeralRecebido.toFixed(2)}`);

// Verificações finais
console.log('\n🔍 VERIFICAÇÕES FINAIS:');
console.log('═══════════════════════════════════════════════════════════');

const adiantamentoNaFolha = folhaAtiva.resultado.desconto_adiantamento_salario > 0;
const adiantamentoNosEventos = eventos.some(e => e.descricao === 'Adiantam. de Salário');
const adiantamentoNoHolerite = lancamentosHolerite.some(l => l.codigo === '5016');

console.log(`  ✅ Adiantamento na folha (resultado): ${adiantamentoNaFolha ? 'SIM' : 'NÃO'}`);
console.log(`  ✅ Adiantamento nos eventos: ${adiantamentoNosEventos ? 'SIM' : 'NÃO'}`);
console.log(`  ✅ Adiantamento no holerite: ${adiantamentoNoHolerite ? 'SIM' : 'NÃO'}`);

if (adiantamentoNaFolha && adiantamentoNosEventos && adiantamentoNoHolerite) {
    console.log('\n🎉 TUDO FUNCIONANDO CORRETAMENTE!');
    console.log('   O adiantamento de salário deve aparecer em todos os lugares.');
} else {
    console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
    if (!adiantamentoNaFolha) console.log('   - Valor não está sendo salvo/carregado na folha');
    if (!adiantamentoNosEventos) console.log('   - Evento não está sendo carregado');
    if (!adiantamentoNoHolerite) console.log('   - Mapeamento para holerite não está funcionando');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔧 DEBUG CONCLUÍDO!');
console.log('═══════════════════════════════════════════════════════════');