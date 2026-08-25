-- =============================================
-- TESTE SIMPLIFICADO DAS CORREÇÕES DE SEGURANÇA
-- =============================================
-- 
-- Este script testa se as vulnerabilidades foram corrigidas
-- Funciona independentemente do estado do sistema de managers

-- =============================================
-- 1. VERIFICAÇÃO DE POLÍTICAS SEGURAS
-- =============================================

SELECT 
  '🔒 SECURITY POLICIES STATUS' as check_type,
  COUNT(CASE WHEN policyname LIKE '%can only view their own profile%' THEN 1 END) as secure_profiles_policies,
  COUNT(CASE WHEN policyname LIKE '%Secure employee data access%' THEN 1 END) as secure_employee_policies,
  COUNT(CASE WHEN policyname LIKE '%can view their own vacation data%' THEN 1 END) as secure_vacation_policies,
  CASE 
    WHEN COUNT(CASE WHEN policyname LIKE '%can only view their own profile%' THEN 1 END) > 0
     AND COUNT(CASE WHEN policyname LIKE '%Secure employee data access%' THEN 1 END) > 0
     AND COUNT(CASE WHEN policyname LIKE '%can view their own vacation data%' THEN 1 END) > 0
    THEN '✅ ALL SECURE POLICIES ACTIVE'
    ELSE '❌ SOME SECURE POLICIES MISSING'
  END as security_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'funcionarios', 'ferias');

-- =============================================
-- 2. VERIFICAÇÃO DE POLÍTICAS VULNERÁVEIS
-- =============================================

SELECT 
  '⚠️ VULNERABLE POLICIES STATUS' as check_type,
  COUNT(CASE WHEN policyname LIKE '%podem ver seu próprio perfil%' THEN 1 END) as vulnerable_profiles,
  COUNT(CASE WHEN policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%' THEN 1 END) as vulnerable_employees,
  COUNT(CASE WHEN policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)' THEN 1 END) as vulnerable_vacations,
  CASE 
    WHEN COUNT(CASE WHEN policyname LIKE '%podem ver seu próprio perfil%' THEN 1 END) = 0
     AND COUNT(CASE WHEN policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%' THEN 1 END) = 0
     AND COUNT(CASE WHEN policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)' THEN 1 END) = 0
    THEN '✅ NO VULNERABLE POLICIES FOUND'
    ELSE '❌ VULNERABLE POLICIES STILL EXIST'
  END as vulnerability_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'funcionarios', 'ferias');

-- =============================================
-- 3. TESTE DE ACESSO BÁSICO
-- =============================================

-- Teste de acesso a profiles (deve retornar 0 ou 1)
SELECT 
  '👤 PROFILES ACCESS TEST' as test_type,
  COUNT(*) as accessible_profiles,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ACCESS (not authenticated or no profile)'
    WHEN COUNT(*) = 1 THEN '✅ LIMITED ACCESS (own profile only)'
    ELSE '❌ EXCESSIVE ACCESS (multiple profiles visible)'
  END as access_status
FROM public.profiles;

-- Teste de acesso a funcionarios (deve retornar 0 ou 1 para usuários comuns)
SELECT 
  '👥 EMPLOYEES ACCESS TEST' as test_type,
  COUNT(*) as accessible_employees,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ACCESS (not authenticated or not an employee)'
    WHEN COUNT(*) = 1 THEN '✅ LIMITED ACCESS (own data only or single employee as admin/manager)'
    ELSE '⚠️ MULTIPLE ACCESS (likely admin or manager with proper access)'
  END as access_status
FROM public.funcionarios;

-- Teste de acesso a ferias (deve retornar 0 ou apenas próprias férias)
SELECT 
  '🏖️ VACATION ACCESS TEST' as test_type,
  COUNT(*) as accessible_vacation_records,
  COUNT(DISTINCT funcionario_id) as accessible_employees,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ACCESS (not authenticated or no vacation data)'
    WHEN COUNT(DISTINCT funcionario_id) = 1 THEN '✅ LIMITED ACCESS (own vacation only or single employee as admin/manager)'
    ELSE '⚠️ MULTIPLE EMPLOYEES ACCESS (likely admin or manager with proper access)'
  END as access_status
FROM public.ferias;

-- =============================================
-- 4. VERIFICAÇÃO DE RLS HABILITADO
-- =============================================

SELECT 
  '🛡️ RLS STATUS' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS_ENABLED'
    ELSE '❌ RLS_DISABLED'
  END as rls_status
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname
WHERE pt.schemaname = 'public'
AND pt.tablename IN ('profiles', 'funcionarios', 'ferias')
ORDER BY pt.tablename;

-- =============================================
-- 5. VERIFICAÇÃO DO SISTEMA DE MANAGERS
-- =============================================

SELECT 
  '👔 MANAGER SYSTEM STATUS' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_empresas') 
    THEN '✅ MANAGER_EMPRESAS_TABLE_EXISTS'
    ELSE '❌ MANAGER_EMPRESAS_TABLE_MISSING'
  END as manager_table_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'app_role' AND e.enumlabel = 'manager'
    ) THEN '✅ MANAGER_ROLE_EXISTS'
    ELSE '❌ MANAGER_ROLE_MISSING'
  END as manager_role_status;

-- =============================================
-- 6. RESUMO GERAL
-- =============================================

WITH security_check AS (
  SELECT 
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname LIKE '%can only view their own profile%') as secure_profiles,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'funcionarios' AND policyname LIKE '%Secure employee data access%') as secure_employees,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ferias' AND policyname LIKE '%can view their own vacation data%') as secure_vacations,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname LIKE '%podem ver seu próprio perfil%') as vulnerable_profiles,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'funcionarios' AND policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%') as vulnerable_employees,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ferias' AND policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)') as vulnerable_vacations,
    (SELECT COUNT(*) FROM pg_tables pt JOIN pg_class pc ON pc.relname = pt.tablename JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname WHERE pt.schemaname = 'public' AND pt.tablename IN ('profiles', 'funcionarios', 'ferias') AND pc.relrowsecurity = true) as rls_enabled
)
SELECT 
  '📊 OVERALL SECURITY STATUS' as summary_type,
  CASE 
    WHEN secure_profiles > 0 AND secure_employees > 0 AND secure_vacations > 0 
     AND vulnerable_profiles = 0 AND vulnerable_employees = 0 AND vulnerable_vacations = 0
     AND rls_enabled = 3
    THEN '🟢 FULLY SECURE - All vulnerabilities fixed'
    WHEN secure_profiles > 0 AND secure_employees > 0 AND secure_vacations > 0 
     AND rls_enabled = 3
    THEN '🟡 MOSTLY SECURE - Secure policies active, check for remaining vulnerable policies'
    WHEN vulnerable_profiles > 0 OR vulnerable_employees > 0 OR vulnerable_vacations > 0
    THEN '🔴 VULNERABLE - Old vulnerable policies still active'
    WHEN rls_enabled < 3
    THEN '🟠 RLS_ISSUES - Some tables missing RLS'
    ELSE '🟠 UNKNOWN - Manual verification needed'
  END as overall_status,
  secure_profiles + secure_employees + secure_vacations as secure_policies_count,
  vulnerable_profiles + vulnerable_employees + vulnerable_vacations as vulnerable_policies_count,
  rls_enabled as tables_with_rls_enabled
FROM security_check;

-- =============================================
-- 7. RECOMENDAÇÕES
-- =============================================

DO $$
DECLARE
  secure_count INTEGER;
  vulnerable_count INTEGER;
  rls_count INTEGER;
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'funcionarios', 'ferias') AND (policyname LIKE '%can only view their own profile%' OR policyname LIKE '%Secure employee data access%' OR policyname LIKE '%can view their own vacation data%')),
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'funcionarios', 'ferias') AND (policyname LIKE '%podem ver seu próprio perfil%' OR (policyname LIKE '%podem ver seus proprios dados%' AND qual LIKE '%auth.uid() IS NOT NULL%') OR (policyname LIKE '%podem ler ferias%' AND qual = '(auth.uid() IS NOT NULL)'))),
    (SELECT COUNT(*) FROM pg_tables pt JOIN pg_class pc ON pc.relname = pt.tablename JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname WHERE pt.schemaname = 'public' AND pt.tablename IN ('profiles', 'funcionarios', 'ferias') AND pc.relrowsecurity = true)
  INTO secure_count, vulnerable_count, rls_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔧 SECURITY RECOMMENDATIONS:';
  RAISE NOTICE '================================';
  
  IF secure_count >= 3 AND vulnerable_count = 0 AND rls_count = 3 THEN
    RAISE NOTICE '✅ SYSTEM IS SECURE';
    RAISE NOTICE '   All security fixes have been applied successfully';
    RAISE NOTICE '   Continue with regular security monitoring';
  ELSIF vulnerable_count > 0 THEN
    RAISE NOTICE '❌ VULNERABILITIES DETECTED';
    RAISE NOTICE '   Execute: migrations/fix_security_vulnerabilities.sql';
    RAISE NOTICE '   Then run this test again to verify fixes';
  ELSIF secure_count < 3 THEN
    RAISE NOTICE '⚠️ INCOMPLETE SECURITY FIXES';
    RAISE NOTICE '   Some secure policies are missing';
    RAISE NOTICE '   Execute: migrations/fix_security_vulnerabilities.sql';
  ELSIF rls_count < 3 THEN
    RAISE NOTICE '⚠️ RLS NOT ENABLED';
    RAISE NOTICE '   Enable RLS on missing tables:';
    RAISE NOTICE '   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;';
  ELSE
    RAISE NOTICE '🟡 VERIFICATION NEEDED';
    RAISE NOTICE '   Run full security tests with different user types';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current Status Summary:';
  RAISE NOTICE '  Secure policies: % / 3', secure_count;
  RAISE NOTICE '  Vulnerable policies: %', vulnerable_count;
  RAISE NOTICE '  Tables with RLS: % / 3', rls_count;
  RAISE NOTICE '';
  
  IF vulnerable_count > 0 THEN
    RAISE NOTICE '⚠️ CRITICAL: Vulnerable policies detected!';
    RAISE NOTICE '   This means the original security vulnerabilities are still present.';
    RAISE NOTICE '   Apply fixes immediately: migrations/fix_security_vulnerabilities.sql';
  END IF;
END;
$$;