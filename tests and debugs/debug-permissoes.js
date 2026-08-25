// Script para verificar permissões do usuário atual
// Execute no console do navegador na página CalculatedPayroll

console.log('🔍 DIAGNÓSTICO DE PERMISSÕES');
console.log('============================');

// Verificar se o Supabase está disponível
if (typeof supabase !== 'undefined') {
    console.log('✅ Supabase disponível');
    
    // Verificar usuário atual
    supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error) {
            console.error('❌ Erro ao obter usuário:', error);
            return;
        }
        
        if (user) {
            console.log('👤 Usuário logado:', user.email);
            console.log('🆔 User ID:', user.id);
            
            // Verificar se é admin
            supabase
                .from('funcionarios')
                .select('is_admin')
                .eq('email', user.email)
                .single()
                .then(({ data, error }) => {
                    if (error) {
                        console.error('❌ Erro ao verificar admin:', error);
                        return;
                    }
                    
                    console.log('🔐 É admin?', data?.is_admin || false);
                    
                    if (!data?.is_admin) {
                        console.log('');
                        console.log('🚨 PROBLEMA ENCONTRADO:');
                        console.log('O usuário não tem permissões de admin!');
                        console.log('Apenas admins podem salvar folhas de pagamento.');
                        console.log('');
                        console.log('💡 SOLUÇÕES:');
                        console.log('1. Fazer login com usuário admin');
                        console.log('2. Ou alterar as políticas RLS no banco');
                    } else {
                        console.log('✅ Usuário tem permissões de admin');
                        console.log('O problema pode estar em outro lugar...');
                    }
                });
        } else {
            console.log('❌ Usuário não está logado');
        }
    });
} else {
    console.log('❌ Supabase não está disponível no contexto global');
    console.log('Execute este script na página do sistema');
}