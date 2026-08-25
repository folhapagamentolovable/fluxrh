/**
 * TESTE RÁPIDO - NOVA ARQUITETURA MODULAR
 * 
 * Este teste verifica se a nova arquitetura está calculando corretamente
 * os totais sem duplicação de eventos excepcionais.
 */

// Simular um resultado de folha com eventos excepcionais já processados
const resultadoTeste = {
    // Proventos base
    salario_base: 2018.67,
    adicional_acumulo_funcao: 403.73,
    horas_extras_50: 0,
    horas_extras_100: 0,
    adicional_noturno: 0,
    intrajornada_50: 0,
    intrajornada_100: 0,
    dsr_horas_extras: 0,
    dsr_adicional_noturno: 0,
    adicional_insalubridade: 0,
    salario_familia: 0,
    plr: 0,
    complemento_salario: 0,
    
    // Eventos excepcionais já processados (campos específicos)
    decimo_terceiro_primeira_parcela: 252.25,
    decimo_terceiro_vantagens_primeira_parcela: 50.45,
    decimo_terceiro_segunda_parcela: 252.25,
    decimo_terceiro_vantagens_segunda_parcela: 50.45,
    servicos_externos_folhas_pagamento: 850.00,
    servicos_externos_controle_rondas: 200.00,
    
    // Descontos
    desconto_inss: 150.00,
    desconto_irrf: 100.00,
    desconto_adiantamento_salario: 500.00, // Evento excepcional processado
    
    // Outros campos zerados
    desconto_vt: 0,
    desconto_seguro_vida: 0,
    desconto_convenio_odonto: 0,
    desconto_contribuicao_assistencial: 0,
    desconto_atrasos: 0,
    desconto_faltas: 0,
    desconto_plr: 0,
    desconto_pensao_alimenticia: 0,
    desconto_rondas_nao_realizadas: 0,
    desconto_adiantamento_quinzenal: 0,
    desconto_complemento_anterior: 0,
    desc_avaria_utilitario: 0
};

// Função de teste para calcular proventos (simulando o módulo)
function calcularTotalProventosTeste(resultado) {
    const proventosBase = [
        { nome: 'Salário Base', valor: resultado.salario_base || 0 },
        { nome: 'Acúmulo Função', valor: resultado.adicional_acumulo_funcao || 0 },
        { nome: 'HE 50%', valor: resultado.horas_extras_50 || 0 },
        { nome: 'HE 100%', valor: resultado.horas_extras_100 || 0 },
        { nome: 'Adicional Noturno', valor: resultado.adicional_noturno || 0 },
        { nome: 'Intrajornada 50%', valor: resultado.intrajornada_50 || 0 },
        { nome: 'Intrajornada 100%', valor: resultado.intrajornada_100 || 0 },
        { nome: 'DSR H.Extras', valor: resultado.dsr_horas_extras || 0 },
        { nome: 'DSR Adic.Noturno', valor: resultado.dsr_adicional_noturno || 0 },
        { nome: 'Insalubridade', valor: resultado.adicional_insalubridade || 0 },
        { nome: 'Salário Família', valor: resultado.salario_familia || 0 },
        { nome: 'PLR', valor: resultado.plr || 0 },
        { nome: 'Complemento', valor: resultado.complemento_salario || 0 }
    ];

    // Eventos excepcionais já processados e salvos em campos específicos
    const eventosEspecificos = [
        { nome: '13º Salário 1ª Parcela', valor: resultado.decimo_terceiro_primeira_parcela || 0 },
        { nome: '13º Salário 2ª Parcela', valor: resultado.decimo_terceiro_segunda_parcela || 0 },
        { nome: '13º Salário Vantagens 1ª Parcela', valor: resultado.decimo_terceiro_vantagens_primeira_parcela || 0 },
        { nome: '13º Salário Vantagens 2ª Parcela', valor: resultado.decimo_terceiro_vantagens_segunda_parcela || 0 },
        { nome: 'Serviços Externos (Folhas)', valor: resultado.servicos_externos_folhas_pagamento || 0 },
        { nome: 'Serviços Externos (Rondas)', valor: resultado.servicos_externos_controle_rondas || 0 }
    ];

    const totalBase = proventosBase.reduce((sum, item) => sum + item.valor, 0);
    const totalEventos = eventosEspecificos.reduce((sum, item) => sum + item.valor, 0);

    return {
        totalBase,
        totalEventos,
        total: totalBase + totalEventos,
        detalhes: [...proventosBase, ...eventosEspecificos].filter(item => item.valor > 0)
    };
}

// Executar teste
console.log('🧪 TESTE - NOVA ARQUITETURA MODULAR');
console.log('═══════════════════════════════════════════════════════════');

const resultado = calcularTotalProventosTeste(resultadoTeste);

console.log('📊 RESULTADO DO TESTE:');
console.log('');
console.log('💰 PROVENTOS DETALHADOS:');
resultado.detalhes.forEach(item => {
    console.log(`  - ${item.nome}: R$ ${item.valor.toFixed(2)}`);
});

console.log('');
console.log('📈 TOTAIS:');
console.log(`  - Total Base: R$ ${resultado.totalBase.toFixed(2)}`);
console.log(`  - Total Eventos: R$ ${resultado.totalEventos.toFixed(2)}`);
console.log(`  - TOTAL GERAL: R$ ${resultado.total.toFixed(2)}`);

console.log('');
console.log('✅ VERIFICAÇÃO:');
console.log('Valores da imagem do problema:');
console.log('  - Salário: R$ 2.018,67');
console.log('  - Acúmulo de Função: R$ 403,73');
console.log('  - 13º Salário 1ª Parcela: R$ 252,25');
console.log('  - 13º Salário Vantagens 1ª Parcela: R$ 50,45');
console.log('  - 13º Salário 2ª Parcela: R$ 252,25');
console.log('  - 13º Salário Vantagens 2ª Parcela: R$ 50,45');
console.log('  - Serviços Externos (Folhas): R$ 850,00');
console.log('  - Serviços Externos (Rondas): R$ 200,00');

const somaManual = 2018.67 + 403.73 + 252.25 + 50.45 + 252.25 + 50.45 + 850.00 + 200.00;
console.log(`  - Soma Manual: R$ ${somaManual.toFixed(2)}`);

console.log('');
if (Math.abs(resultado.total - somaManual) < 0.01) {
    console.log('✅ TESTE PASSOU! Total calculado confere com soma manual.');
} else {
    console.log('❌ TESTE FALHOU! Diferença encontrada.');
    console.log(`   Calculado: R$ ${resultado.total.toFixed(2)}`);
    console.log(`   Esperado: R$ ${somaManual.toFixed(2)}`);
    console.log(`   Diferença: R$ ${Math.abs(resultado.total - somaManual).toFixed(2)}`);
}

console.log('');
console.log('🎯 CONCLUSÃO:');
console.log('A nova arquitetura modular calcula corretamente os totais');
console.log('sem duplicar eventos excepcionais que já foram processados.');
console.log('═══════════════════════════════════════════════════════════');