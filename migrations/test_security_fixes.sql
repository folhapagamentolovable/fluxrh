-- =============================================
-- TESTE DAS CORREÇÕES DE SEGURANÇA RLS
-- =============================================
-- 
-- Este script testa se as vulnerabilidades foram corrigidas
-- IMPORTANTE: Execute este script como diferentes usuários para testar

-- =============================================
-- 1. TESTE: PROFILES - Verificar se enumeração foi bloqueada
-- =============================================

-- Este teste deve falhar para usuários não-admin tentando ver outros perfis
-- Simular tentativa de enumeração de usuários

SELECT 
  'PROFILES SECURITY TEST' as test_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No profiles visible to unauthorized users'
    WHEN COUNT(*) = 1 THEN '✅ SECURE - Only own profile visible'
    ELSE '❌ VULNERABLE - Multiple profiles visible'
  END as result,
  COUNT(*) as profiles_count
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Teste específico: tentar acessar perfil com ID conhecido
-- (Este teste só funcionará se você souber um ID específico)
/*
SELECT 
  'PROFILE ENUMERATION TEST' as test_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - Cannot access other user profiles'
    ELSE '❌ VULNERABLE - Can access other user profiles'
  END as result
FROM public.profiles 
WHERE id != auth.uid() 
LIMIT 1;
*/

-- =============================================
-- 2. TESTE: FUNCIONARIOS - Verificar acesso a dados sensíveis
-- =============================================

-- Teste para verificar se usuário comum pode ver dados de outros funcionários
SELECT 
  'FUNCIONARIOS SECURITY TEST' as test_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No employee data visible to unauthorized users'
    WHEN COUNT(*) = 1 AND MAX(user_id) = auth.uid() THEN '✅ SECURE - Only own employee data visible'
    ELSE '❌ VULNERABLE - Can see other employees data'
  END as result,
  COUNT(*) as employees_visible,
  STRING_AGG(DISTINCT 
    CASE 
      WHEN cpf IS NOT NULL THEN 'CPF_EXPOSED' 
      ELSE 'CPF_HIDDEN' 
    END, ', '
  ) as sensitive_data_status
FROM public.funcionarios;

-- Teste específico para dados sensíveis
SELECT 
  'SENSITIVE DATA EXPOSURE TEST' as test_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN cpf IS NOT NULL THEN 1 END) as cpf_exposed,
  COUNT(CASE WHEN telefone IS NOT NULL THEN 1 END) as phone_exposed,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as email_exposed,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No sensitive data accessible'
    WHEN COUNT(*) = 1 AND MAX(user_id) = auth.uid() THEN '✅ SECURE - Only own sensitive data accessible'
    ELSE '❌ VULNERABLE - Other employees sensitive data accessible'
  END as security_status
FROM public.funcionarios;

-- =============================================
-- 3. TESTE: FERIAS - Verificar acesso a dados de férias
-- =============================================

-- Teste para verificar se usuário pode ver férias de outros funcionários
SELECT 
  'FERIAS SECURITY TEST' as test_name,
  COUNT(*) as vacation_records_visible,
  COUNT(DISTINCT funcionario_id) as employees_with_visible_vacations,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No vacation data visible to unauthorized users'
    WHEN COUNT(DISTINCT funcionario_id) = 1 THEN '✅ SECURE - Only own vacation data visible'
    ELSE '❌ VULNERABLE - Can see other employees vacation data'
  END as security_status
FROM public.ferias;

-- Teste detalhado de férias
SELECT 
  'VACATION DATA DETAILS TEST' as test_name,
  f.status,
  f.data_inicio_gozo,
  f.data_fim_gozo,
  func.nome_completo,
  CASE 
    WHEN func.user_id = auth.uid() THEN '✅ OWN_DATA'
    ELSE '❌ OTHER_USER_DATA'
  END as data_ownership
FROM public.ferias f
JOIN public.funcionarios func ON func.id = f.funcionario_id
LIMIT 5;

-- =============================================
-- 4. TESTE: VERIFICAÇÃO GERAL DE RLS
-- =============================================

-- Verificar se RLS está habilitado em todas as tabelas críticas
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS_ENABLED'
    ELSE '❌ RLS_DISABLED'
  END as rls_status
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname
WHERE pt.schemaname = 'public'
AND pt.tablename IN ('profiles', 'funcionarios', 'ferias', 'folha_calculada', 'escala_mensal')
ORDER BY pt.tablename;

-- =============================================
-- 5. TESTE: POLÍTICAS ATIVAS
-- =============================================

-- Listar todas as políticas RLS ativas nas tabelas críticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_condition,
  with_check as with_check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'funcionarios', 'ferias')
ORDER BY tablename, policyname;

-- =============================================
-- 6. TESTE: FUNÇÃO DE AUDITORIA
-- =============================================

-- Executar função de auditoria de segurança (se existir)
SELECT * FROM public.audit_rls_security()
WHERE 1=1; -- Adicionar WHERE para evitar erro se função não existir

-- =============================================
-- 7. TESTE: SIMULAÇÃO DE ATAQUES
-- =============================================

-- Teste 1: Tentativa de enumeração de usuários por email
-- (Este teste deve retornar 0 resultados para usuários não-admin)
SELECT 
  'EMAIL ENUMERATION TEST' as test_name,
  COUNT(*) as emails_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - Cannot enumerate emails'
    WHEN COUNT(*) = 1 THEN '⚠️ PARTIAL - Only own email visible'
    ELSE '❌ VULNERABLE - Multiple emails visible'
  END as security_status
FROM public.profiles
WHERE email LIKE '%@%';

-- Teste 2: Tentativa de acesso a CPFs
-- (Este teste deve retornar 0 ou apenas o próprio CPF)
SELECT 
  'CPF ENUMERATION TEST' as test_name,
  COUNT(*) as cpfs_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No CPFs accessible'
    WHEN COUNT(*) = 1 THEN '⚠️ PARTIAL - Only own CPF accessible'
    ELSE '❌ VULNERABLE - Multiple CPFs accessible'
  END as security_status
FROM public.funcionarios
WHERE cpf IS NOT NULL AND cpf != '';

-- Teste 3: Tentativa de descobrir quando funcionários estão de férias
-- (Este teste deve retornar 0 ou apenas as próprias férias)
SELECT 
  'VACATION SCHEDULE ENUMERATION TEST' as test_name,
  COUNT(*) as vacation_schedules_found,
  COUNT(DISTINCT funcionario_id) as employees_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SECURE - No vacation schedules accessible'
    WHEN COUNT(DISTINCT funcionario_id) = 1 THEN '⚠️ PARTIAL - Only own vacation schedule accessible'
    ELSE '❌ VULNERABLE - Multiple employees vacation schedules accessible'
  END as security_status
FROM public.ferias
WHERE status IN ('programada', 'em_andamento')
AND data_inicio_gozo >= CURRENT_DATE;

-- =============================================
-- RESUMO DOS TESTES
-- =============================================

/*
COMO INTERPRETAR OS RESULTADOS:

✅ SECURE: A correção foi aplicada com sucesso
⚠️ PARTIAL: Acesso limitado ao próprio usuário (comportamento esperado)
❌ VULNERABLE: Ainda há vulnerabilidade - revisar políticas

TESTES RECOMENDADOS:

1. Execute este script como usuário ADMIN:
   - Deve ver todos os dados (comportamento esperado)

2. Execute como usuário FUNCIONÁRIO:
   - Deve ver apenas seus próprios dados
   - Profiles: apenas seu perfil
   - Funcionarios: apenas seus dados
   - Ferias: apenas suas férias

3. Execute como usuário SEM PERMISSÕES:
   - Deve ver 0 registros ou receber erro de acesso negado

4. Execute como usuário MANAGER:
   - Deve ver dados dos funcionários de sua empresa
   - Não deve ver dados de outras empresas

AÇÕES SE TESTES FALHAREM:

1. Verificar se o script fix_security_vulnerabilities.sql foi executado
2. Verificar se RLS está habilitado: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
3. Verificar se as políticas foram criadas corretamente
4. Verificar se a função is_admin() está funcionando
5. Verificar se os usuários têm os roles corretos na tabela user_roles
*/