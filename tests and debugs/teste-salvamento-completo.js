// Script de teste completo para o botão Salvar
// Execute no console do navegador na página CalculatedPayroll

console.log('🧪 TESTE COMPLETO DO SALVAMENTO');
console.log('===============================');

async function testarSalvamento() {
    try {
        // 1. Verificar se há folhas carregadas
        const folhas = window.todasFolhas || [];
        console.log('1. ✅ Folhas carregadas:', folhas.length);
        
        if (folhas.length === 0) {
            console.log('❌ Nenhuma folha carregada. Calcule as folhas primeiro.');
            return;
        }
        
        // 2. Verificar usuário e permissões
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.log('❌ Usuário não autenticado:', userError);
            return;
        }
        
        console.log('2. ✅ Usuário logado:', user.email);
        
        // 3. Verificar se é admin
        const { data: funcionarioData, error: adminError } = await supabase
            .from('funcionarios')
            .select('is_admin')
            .eq('email', user.email)
            .single();
            
        if (adminError) {
            console.log('❌ Erro ao verificar admin:', adminError);
            return;
        }
        
        const isAdmin = funcionarioData?.is_admin || false;
        console.log('3. ✅ É admin?', isAdmin);
        
        if (!isAdmin) {
            console.log('❌ PROBLEMA: Usuário não é admin!');
            console.log('💡 SOLUÇÃO: Faça login com blogdoneozinho@gmail.com');
            return;
        }
        
        // 4. Verificar modo de edição
        const activeTab = window.activeTab;
        const modoEdicao = window.modoEdicao || {};
        console.log('4. ✅ Funcionário ativo:', activeTab);
        console.log('4. ✅ Modo edição ativo:', modoEdicao[activeTab]);
        
        if (!modoEdicao[activeTab]) {
            console.log('❌ PROBLEMA: Modo de edição não está ativo!');
            console.log('💡 SOLUÇÃO: Clique no botão "✏️ Editar" primeiro');
            return;
        }
        
        // 5. Verificar botão
        const botoes = document.querySelectorAll('button');
        const botaoSalvar = Array.from(botoes).find(b => b.textContent?.includes('💾 Salvar'));
        
        if (!botaoSalvar) {
            console.log('❌ Botão Salvar não encontrado');
            return;
        }
        
        console.log('5. ✅ Botão Salvar encontrado');
        console.log('5. ✅ Botão habilitado:', !botaoSalvar.disabled);
        
        if (botaoSalvar.disabled) {
            console.log('❌ PROBLEMA: Botão está desabilitado!');
            console.log('💡 Verifique se o modo de edição está ativo');
            return;
        }
        
        console.log('');
        console.log('🎉 TUDO PRONTO PARA SALVAR!');
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. Clique no botão "💾 Salvar"');
        console.log('2. Confirme no popup');
        console.log('3. Observe os logs detalhados no console');
        console.log('4. Verifique se aparece a mensagem de sucesso');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar teste
testarSalvamento();