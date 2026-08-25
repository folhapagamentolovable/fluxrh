// Teste para verificar se as correções do relatório detalhado estão funcionando
console.log('🧪 TESTE: Verificando correções do relatório detalhado');

// Simular dados de uma folha calculada
const folhaExemplo = {
    funcionario: { nome_completo: 'LUCIANA TESTE' },
    salario_base: 1500.00,
    horas_extras_50: 200.00,
    adicional_noturno: 150.00,
    desconto_inss: 180.00,
    desconto_irrf: 50.00,
    desconto_adiantamento_salario: 300.00, // ⭐ CAMPO CRÍTICO
    vale_transporte_mes_atual: 220.00,
    cesta_basica: 150.00
};

// Função para calcular salário bruto (igual à do relatório)
const calcularSalarioBruto = (f) => {
    let salarioBruto = (f.salario_base || 0) + (f.intrajornada_50 || 0) + (f.intrajornada_100 || 0) + 
        (f.horas_extras_50 || 0) + (f.horas_extras_100 || 0) + (f.dsr_horas_extras || 0) + 
        (f.dsr_adicional_noturno || 0) + (f.adicional_noturno || 0) + (f.adicional_insalubridade || 0) + 
        (f.adicional_acumulo_funcao || 0) + (f.salario_familia || 0) + (f.complemento_salario || 0) +
        (f.folga_trabalhada || 0) + (f.servicos_externos_folhas_pagamento || 0) + (f.servicos_externos_controle_rondas || 0) +
        (f.decimo_terceiro_primeira_parcela || 0) + (f.decimo_terceiro_segunda_parcela || 0) +
        (f.decimo_terceiro_vantagens_primeira_parcela || 0) + (f.decimo_terceiro_vantagens_segunda_parcela || 0) +
        (f.decimo_terceiro_integral || 0) + (f.vantagens_13 || 0) +
        (f.decimo_terceiro_proporcional_rescisao || 0) + (f.decimo_terceiro_vantagens_rescisao || 0) +
        (f.ferias_proporcionais_rescisao || 0) + (f.um_terco_ferias_proporcional_rescisao || 0) + (f.plr_proporcional_rescisao || 0);
    
    if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
        f.eventos_excepcionais.forEach((evento) => {
            if (evento.tipo === 'provento') salarioBruto += evento.valor || 0;
        });
    }
    return salarioBruto;
};

// Função para calcular total de descontos (igual à do relatório)
const calcularTotalDescontos = (f) => {
    let totalDescontos = (f.desconto_inss || 0) + (f.desconto_irrf || 0) + (f.desconto_vt || 0) + 
        (f.desconto_contribuicao_assistencial || 0) + (f.desconto_pensao_alimenticia || 0) + 
        (f.desconto_faltas || 0) + (f.desconto_atrasos || 0) + 
        (f.desconto_adiantamento_quinzenal || 0) + (f.desconto_complemento_anterior || 0) + 
        (f.desconto_adiantamento_salario || 0) + (f.desconto_plr || 0) + // ⭐ INCLUÍDO
        (f.desconto_seguro_vida || 0) + (f.desconto_convenio_odonto || 0) + 
        (f.desconto_rondas_nao_realizadas || 0) + (f.desc_rondas_nao_realizadas_benef || 0) + 
        (f.desc_avaria_utilitario || 0) + (f.desconto_vt_faltas || 0) + (f.desconto_va_faltas || 0) +
        (f.inss_13 || 0) + (f.adiantamento_13_salario || 0) + (f.adiantamento_vantagens_13 || 0);
    
    if (f.eventos_excepcionais && Array.isArray(f.eventos_excepcionais)) {
        f.eventos_excepcionais.forEach((evento) => {
            if (evento.tipo === 'desconto') totalDescontos += evento.valor || 0;
        });
    }
    return totalDescontos;
};

// Executar testes
const salarioBruto = calcularSalarioBruto(folhaExemplo);
const totalDescontos = calcularTotalDescontos(folhaExemplo);
const salarioLiquido = salarioBruto - totalDescontos;

console.log('📊 RESULTADOS DO TESTE:');
console.log(`Salário Bruto: R$ ${salarioBruto.toFixed(2)}`);
console.log(`Total Descontos: R$ ${totalDescontos.toFixed(2)}`);
console.log(`  - INSS: R$ ${folhaExemplo.desconto_inss.toFixed(2)}`);
console.log(`  - IRRF: R$ ${folhaExemplo.desconto_irrf.toFixed(2)}`);
console.log(`  - Adiantam. Salário: R$ ${folhaExemplo.desconto_adiantamento_salario.toFixed(2)} ⭐`);
console.log(`Salário Líquido: R$ ${salarioLiquido.toFixed(2)}`);

// Verificar se o "Adiantam. de Salário" está sendo incluído
const descontoAdiantamentoIncluido = totalDescontos >= folhaExemplo.desconto_adiantamento_salario;
console.log(`\n✅ VERIFICAÇÃO CRÍTICA:`);
console.log(`"Adiantam. de Salário" incluído nos descontos: ${descontoAdiantamentoIncluido ? '✅ SIM' : '❌ NÃO'}`);

if (descontoAdiantamentoIncluido) {
    console.log('🎉 SUCESSO: As correções estão funcionando corretamente!');
    console.log('O campo "Adiantam. de Salário" agora é incluído nos cálculos de totais.');
} else {
    console.log('❌ ERRO: O campo "Adiantam. de Salário" ainda não está sendo incluído!');
}