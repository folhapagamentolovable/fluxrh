// Script de diagnóstico para testar o salvamento individual
// Execute no console do navegador na página CalculatedPayroll

console.log('🔍 DIAGNÓSTICO DO BOTÃO SALVAR');
console.log('================================');

// 1. Verificar se há folhas carregadas
console.log('1. Folhas carregadas:', window.todasFolhas?.length || 'Não encontrado');

// 2. Verificar modo de edição
console.log('2. Modo de edição:', window.modoEdicao || 'Não encontrado');

// 3. Verificar se há funcionário ativo
console.log('3. Funcionário ativo:', window.activeTab || 'Não encontrado');

// 4. Verificar se o botão está habilitado
const botaoSalvar = document.querySelector('button[onclick*="handleSalvarIndividual"]');
console.log('4. Botão Salvar encontrado:', !!botaoSalvar);
console.log('4. Botão Salvar desabilitado:', botaoSalvar?.disabled);

// 5. Verificar se há erros no console
console.log('5. Verifique se há erros vermelhos no console acima');

// 6. Instruções
console.log('');
console.log('📋 INSTRUÇÕES PARA TESTAR:');
console.log('1. Clique em "✏️ Editar" primeiro');
console.log('2. Depois clique em "💾 Salvar"');
console.log('3. Observe se aparece algum erro no console');
console.log('4. Verifique se aparece a mensagem de sucesso');