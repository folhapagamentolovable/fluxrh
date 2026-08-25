-- =============================================
-- VERIFICAÇÃO RÁPIDA DE SEGURANÇA RLS
-- =============================================
-- 
-- Script rápido para verificar se as correções de segurança foram aplicadas
-- Execute este script para confirmar o status de segurança

-- =============================================
-- 1. VERIFICAÇÃO DE POLÍTICAS SEGURAS
-- =============================================

SELECT 
  '🔒 SECURITY POLICIES CHECK' as check_type,
  COUNT(CASE WHEN policyname LIKE '%can only view their own profile%' THEN 1 END) as secure_profiles_policies,
  COUNT(CASE WHEN policyname LIKE '%Secure employee data access%' THEN 1 END) as secure_employee_policies,
  COUNT(CASE WHEN policyname LIKE '%can view their own vacation data%' THEN 1 END) as secure_vacation_policies,
  CASE 
    WHEN COUNT(CASE WHEN policyname LIKE '%can only view their own profile%' THEN 1 END) > 0
     AND COUNT(CASE WHEN policyname LIKE '%Secure employee data access%' THEN 1 END) > 0
     AND COUNT(CASE WHEN policyname LIKE '%can view their own vacation data%' THEN 1 END) > 0
    THEN '✅ SECURE POLICIES ACTIVE'
    ELSE '❌ SECURE POLICIES MISSING'
  END as security_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'funcionarios', 'ferias');

-- =============================================
-- 2. VERIFICAÇÃO DE POLÍTICAS VULNERÁVEIS
-- =============================================

SELECT 
  '⚠️ VULNERABLE POLICIES CHECK' as check_type,
  COUNT(CASE WHEN policyname LIKE '%podem ver seu próprio perfil%' THEN 1 END) as vulnerable_profiles_policies,
  COUNT(CASE WHEN policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%' THEN 1 END) as vulnerable_employee_policies,
  COUNT(CASE WHEN policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)' THEN 1 END) as vulnerable_vacation_policies,
  CASE 
    WHEN COUNT(CASE WHEN policyname LIKE '%podem ver seu próprio perfil%' THEN 1 END) = 0
     AND COUNT(CASE WHEN policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%' THEN 1 END) = 0
     AND COUNT(CASE WHEN policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)' THEN 1 END) = 0
    THEN '✅ NO VULNERABLE POLICIES'
    ELSE '❌ VULNERABLE POLICIES FOUND'
  END as vulnerability_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'funcionarios', 'ferias');

-- =============================================
-- 3. VERIFICAÇÃO DE RLS HABILITADO
-- =============================================

SELECT 
  '🛡️ RLS STATUS CHECK' as check_type,
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
-- 4. VERIFICAÇÃO DE FUNÇÃO DE AUDITORIA
-- =============================================

SELECT 
  '🔍 AUDIT FUNCTION CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'audit_rls_security'
    ) THEN '✅ AUDIT FUNCTION EXISTS'
    ELSE '❌ AUDIT FUNCTION MISSING'
  END as audit_function_status;

-- =============================================
-- 5. TESTE RÁPIDO DE ACESSO (se possível)
-- =============================================

-- Teste básico de acesso a profiles (deve retornar 0 ou 1)
SELECT 
  '👤 PROFILES ACCESS TEST' as test_type,
  COUNT(*) as accessible_profiles,
  CASE 
    WHEN COUNT(*) <= 1 THEN '✅ ACCESS_RESTRICTED'
    ELSE '❌ EXCESSIVE_ACCESS'
  END as access_status
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Teste básico de acesso a funcionarios (deve retornar 0 ou 1 para usuários comuns)
SELECT 
  '👥 EMPLOYEES ACCESS TEST' as test_type,
  COUNT(*) as accessible_employees,
  CASE 
    WHEN COUNT(*) <= 1 THEN '✅ ACCESS_RESTRICTED'
    ELSE '⚠️ MULTIPLE_ACCESS (may be admin/manager)'
  END as access_status
FROM public.funcionarios
WHERE auth.uid() IS NOT NULL;

-- Teste básico de acesso a ferias (deve retornar 0 ou apenas próprias férias)
SELECT 
  '🏖️ VACATION ACCESS TEST' as test_type,
  COUNT(*) as accessible_vacation_records,
  COUNT(DISTINCT funcionario_id) as accessible_employees,
  CASE 
    WHEN COUNT(DISTINCT funcionario_id) <= 1 THEN '✅ ACCESS_RESTRICTED'
    ELSE '⚠️ MULTIPLE_EMPLOYEES (may be admin/manager)'
  END as access_status
FROM public.ferias
WHERE auth.uid() IS NOT NULL;

-- =============================================
-- 6. RESUMO GERAL DE SEGURANÇA
-- =============================================

WITH security_summary AS (
  SELECT 
    -- Verificar políticas seguras
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname LIKE '%can only view their own profile%') as secure_profiles,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'funcionarios' AND policyname LIKE '%Secure employee data access%') as secure_employees,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ferias' AND policyname LIKE '%can view their own vacation data%') as secure_vacations,
    
    -- Verificar políticas vulneráveis
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname LIKE '%podem ver seu próprio perfil%') as vulnerable_profiles,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'funcionarios' AND policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%') as vulnerable_employees,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ferias' AND policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)') as vulnerable_vacations,
    
    -- Verificar RLS habilitado
    (SELECT COUNT(*) FROM pg_tables pt JOIN pg_class pc ON pc.relname = pt.tablename JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname WHERE pt.schemaname = 'public' AND pt.tablename IN ('profiles', 'funcionarios', 'ferias') AND pc.relrowsecurity = true) as rls_enabled_count,
    
    -- Verificar função de auditoria
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'audit_rls_security') as audit_function_exists
)
SELECT 
  '📊 OVERALL SECURITY SUMMARY' as summary_type,
  CASE 
    WHEN secure_profiles > 0 AND secure_employees > 0 AND secure_vacations > 0 
     AND vulnerable_profiles = 0 AND vulnerable_employees = 0 AND vulnerable_vacations = 0
     AND rls_enabled_count = 3 AND audit_function_exists > 0
    THEN '🟢 FULLY SECURE'
    WHEN secure_profiles > 0 AND secure_employees > 0 AND secure_vacations > 0 
     AND rls_enabled_count = 3
    THEN '🟡 MOSTLY SECURE'
    WHEN vulnerable_profiles > 0 OR vulnerable_employees > 0 OR vulnerable_vacations > 0
    THEN '🔴 VULNERABLE'
    ELSE '🟠 UNKNOWN STATUS'
  END as overall_security_status,
  
  -- Detalhes
  secure_profiles as secure_policies_count,
  vulnerable_profiles + vulnerable_employees + vulnerable_vacations as vulnerable_policies_count,
  rls_enabled_count as tables_with_rls,
  audit_function_exists as audit_function_available
FROM security_summary;

-- =============================================
-- 7. RECOMENDAÇÕES BASEADAS NO STATUS
-- =============================================

DO $$
DECLARE
  secure_count INTEGER;
  vulnerable_count INTEGER;
  rls_count INTEGER;
BEGIN
  -- Contar políticas seguras
  SELECT COUNT(*) INTO secure_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'funcionarios', 'ferias')
  AND (policyname LIKE '%can only view their own profile%' 
       OR policyname LIKE '%Secure employee data access%' 
       OR policyname LIKE '%can view their own vacation data%');
  
  -- Contar políticas vulneráveis
  SELECT COUNT(*) INTO vulnerable_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'funcionarios', 'ferias')
  AND (policyname LIKE '%podem ver seu próprio perfil%' 
       OR (policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%')
       OR (policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)'));
  
  -- Contar tabelas com RLS
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables pt 
  JOIN pg_class pc ON pc.relname = pt.tablename 
  JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname
  WHERE pt.schemaname = 'public' 
  AND pt.tablename IN ('profiles', 'funcionarios', 'ferias') 
  AND pc.relrowsecurity = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 SECURITY RECOMMENDATIONS:';
  RAISE NOTICE '================================';
  
  IF secure_count >= 3 AND vulnerable_count = 0 AND rls_count = 3 THEN
    RAISE NOTICE '✅ System is SECURE - all fixes applied correctly';
    RAISE NOTICE '   - Continue monitoring with regular security checks';
    RAISE NOTICE '   - Consider implementing additional audit logging';
  ELSIF vulnerable_count > 0 THEN
    RAISE NOTICE '❌ VULNERABILITIES DETECTED - immediate action required!';
    RAISE NOTICE '   - Execute: migrations/fix_security_vulnerabilities.sql';
    RAISE NOTICE '   - Test with: test_security_fixes.sql';
    RAISE NOTICE '   - Review: SECURITY_FIXES_DOCUMENTATION.md';
  ELSIF secure_count < 3 THEN
    RAISE NOTICE '⚠️ INCOMPLETE SECURITY - some fixes missing';
    RAISE NOTICE '   - Execute: migrations/fix_security_vulnerabilities.sql';
    RAISE NOTICE '   - Verify all policies were created correctly';
  ELSIF rls_count < 3 THEN
    RAISE NOTICE '⚠️ RLS NOT ENABLED on some tables';
    RAISE NOTICE '   - Enable RLS: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;';
  ELSE
    RAISE NOTICE '🟡 System appears secure but needs verification';
    RAISE NOTICE '   - Run full test suite: test_security_fixes.sql';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current Status:';
  RAISE NOTICE '  - Secure policies: %', secure_count;
  RAISE NOTICE '  - Vulnerable policies: %', vulnerable_count;
  RAISE NOTICE '  - Tables with RLS: %/3', rls_count;
  RAISE NOTICE '';
END;
$$;