-- ============================================
-- VERIFICAR STATUS DO RLS
-- ============================================
-- Use este script para verificar o estado atual
-- das políticas e RLS no banco de dados
-- ============================================

-- 1. Verificar se RLS está ativo nas tabelas
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ATIVO'
        ELSE '❌ RLS INATIVO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'profiles', 'user_roles', 'empresas', 'cargos', 
    'postos_trabalho', 'funcionarios', 'feriados', 
    'regras_escalas', 'escala_mensal', 'folhas_ponto', 
    'folha_calculada', 'parametros_calculo'
)
ORDER BY tablename;

-- 2. Listar todas as políticas existentes
SELECT 
    tablename,
    policyname,
    cmd as operacao,
    CASE 
        WHEN roles = '{public}' THEN 'Público'
        ELSE 'Autenticado'
    END as acesso
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Contar políticas por tabela
SELECT 
    tablename,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Verificar se a função is_admin() existe
SELECT 
    proname as funcao,
    CASE 
        WHEN proname = 'is_admin' THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM pg_proc 
WHERE proname = 'is_admin';

-- 5. Listar todos os admins
SELECT 
    ur.user_id,
    ur.role,
    au.email,
    p.user_name,
    au.created_at
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY au.created_at;

-- 6. Resumo geral
SELECT 
    'Total de tabelas com RLS' as metrica,
    COUNT(*) as valor
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true

UNION ALL

SELECT 
    'Total de políticas criadas' as metrica,
    COUNT(*) as valor
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Total de admins' as metrica,
    COUNT(*) as valor
FROM user_roles 
WHERE role = 'admin';
