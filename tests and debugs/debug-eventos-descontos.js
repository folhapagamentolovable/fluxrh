// Script para debugar eventos excepcionais de descontos
// Execute no console do navegador na página CalculatedPayroll

console.log('🔍 DEBUG: Eventos Excepcionais de Descontos');
console.log('==========================================');

// Verificar se há folhas carregadas
if (window.todasFolhas && window.todasFolhas.length > 0) {
    console.log(`📊 ${window.todasFolhas.length} folha(s) carregada(s)`);
    
    window.todasFolhas.forEach((folha, index) => {
        console.log(`\n👤 Funcionário ${index + 1}: ${folha.funcionario.nome_completo}`);
        
        // Verificar campo desc_avaria_utilitario na folha
        const avariaFolha = folha.resultado?.desc_avaria_utilitario || 0;
        console.log(`💰 desc_avaria_utilitario (folha): R$ ${avariaFolha.toFixed(2)}`);
        
        // Verificar eventos excepcionais
        const eventos = folha.eventosExcepcionais || [];
        console.log(`📋 ${eventos.length} evento(s) excepcional(is)`);
        
        const eventosDescontos = eventos.filter(e => e.tipo === 'desconto');
        console.log(`📉 ${eventosDescontos.length} evento(s) de desconto:`);
        
        eventosDescontos.forEach(evento => {
            console.log(`  - ${evento.descricao}: R$ ${evento.valor.toFixed(2)}`);
        });
        
        // Verificar especificamente avaria utilitário
        const eventoAvaria = eventos.find(e => 
            e.tipo === 'desconto' && 
            e.descricao === 'Desc. Avaria Utilitário (Parcela)'
        );
        
        if (eventoAvaria) {
            console.log(`✅ Evento Avaria encontrado: R$ ${eventoAvaria.valor.toFixed(2)}`);
        } else if (avariaFolha > 0) {
            console.log(`⚠️ Avaria apenas no campo da folha: R$ ${avariaFolha.toFixed(2)}`);
        } else {
            console.log(`❌ Nenhuma avaria encontrada`);
        }
    });
} else {
    console.log('❌ Nenhuma folha carregada');
}

// Verificar estado dos eventos excepcionais
if (window.eventosExcepcionais) {
    console.log('\n🎯 Estado eventosExcepcionais:');
    Object.keys(window.eventosExcepcionais).forEach(funcionarioId => {
        const eventos = window.eventosExcepcionais[funcionarioId];
        const eventosDescontos = eventos.filter(e => e.tipo === 'desconto');
        console.log(`  Funcionário ${funcionarioId}: ${eventosDescontos.length} desconto(s)`);
        
        eventosDescontos.forEach(evento => {
            console.log(`    - ${evento.descricao}: R$ ${evento.valor.toFixed(2)}`);
        });
    });
} else {
    console.log('❌ Estado eventosExcepcionais não encontrado');
}

console.log('\n🔧 Para testar, execute:');
console.log('1. Abra a página CalculatedPayroll');
console.log('2. Selecione um mês/ano com folhas calculadas');
console.log('3. Execute este script no console');
console.log('4. Verifique se os eventos de desconto aparecem nos containers');