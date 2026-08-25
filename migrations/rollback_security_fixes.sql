-- =============================================
-- ROLLBACK DAS CORREÇÕES DE SEGURANÇA RLS
-- =============================================
-- 
-- ATENÇÃO: Este script reverte as correções de segurança
-- Use apenas em caso de emergência ou para testes
-- 
-- ⚠️ AVISO: Executar este rollback reintroduz vulnerabilidades de segurança!
--
-- Data: 2026-01-01
-- Autor: Sistema de Segurança

-- =============================================
-- CONFIRMAÇÃO DE SEGURANÇA
-- =============================================

-- Verificar se o usuário realmente quer fazer rollback
DO $$
BEGIN
  RAISE NOTICE '⚠️ ATENÇÃO: Você está prestes a reverter correções de segurança críticas!';
  RAISE NOTICE '⚠️ Isso reintroduzirá vulnerabilidades conhecidas no sistema.';
  RAISE NOTICE '⚠️ Continue apenas se você tem certeza do que está fazendo.';
  
  -- Aguardar 5 segundos para dar tempo de cancelar
  PERFORM pg_sleep(5);
  
  RAISE NOTICE '🔄 Iniciando rollback das correções de segurança...';
END;
$$;

-- =============================================
-- 1. ROLLBACK: PROFILES
-- =============================================

-- Remover política segura
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- Restaurar política original (VULNERÁVEL)
CREATE POLICY "Users podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins têm acesso total a profiles"
  ON public.profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

RAISE NOTICE '⚠️ ROLLBACK: Política vulnerável de profiles restaurada';

-- =============================================
-- 2. ROLLBACK: FUNCIONARIOS
-- =============================================

-- Remover política segura
DROP POLICY IF EXISTS "Secure employee data access" ON public.funcionarios;

-- Restaurar política original (VULNERÁVEL)
CREATE POLICY "Funcionarios podem ver seus proprios dados"
  ON public.funcionarios FOR SELECT
  USING (
    is_admin() OR user_id = auth.uid() OR auth.uid() IS NOT NULL
  );

RAISE NOTICE '⚠️ ROLLBACK: Política vulnerável de funcionarios restaurada';

-- =============================================
-- 3. ROLLBACK: FERIAS
-- =============================================

-- Remover políticas seguras
DROP POLICY IF EXISTS "Employees can view their own vacation data" ON public.ferias;
DROP POLICY IF EXISTS "Employees can only request their own vacation" ON public.ferias;
DROP POLICY IF EXISTS "Employees can update their own pending vacation requests" ON public.ferias;

-- Restaurar políticas originais (VULNERÁVEIS)
CREATE POLICY "Users podem ler ferias"
  ON public.ferias FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Funcionarios podem solicitar ferias"
  ON public.ferias FOR INSERT
  WITH CHECK (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

RAISE NOTICE '⚠️ ROLLBACK: Políticas vulneráveis de ferias restauradas';

-- =============================================
-- 4. REMOVER FUNÇÕES DE SEGURANÇA
-- =============================================

-- Remover função de auditoria
DROP FUNCTION IF EXISTS public.audit_rls_security();

RAISE NOTICE '🗑️ ROLLBACK: Função de auditoria de segurança removida';

-- =============================================
-- 5. REMOVER COMENTÁRIOS DE SEGURANÇA
-- =============================================

-- Remover comentários das políticas
COMMENT ON POLICY "Users podem ver seu próprio perfil" ON public.profiles IS NULL;
COMMENT ON POLICY "Funcionarios podem ver seus proprios dados" ON public.funcionarios IS NULL;
COMMENT ON POLICY "Users podem ler ferias" ON public.ferias IS NULL;

-- =============================================
-- 6. LOG DE AUDITORIA DO ROLLBACK
-- =============================================

-- Inserir log do rollback (se tabela de auditoria existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    INSERT INTO public.audit_log (
      action, 
      table_name, 
      description, 
      user_id, 
      created_at
    ) VALUES (
      'SECURITY_ROLLBACK',
      'multiple',
      '⚠️ ROLLBACK: Security fixes reverted - vulnerabilities reintroduced!',
      auth.uid(),
      NOW()
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorar se tabela de auditoria não existir
    NULL;
END;
$$;

-- =============================================
-- 7. VERIFICAÇÃO PÓS-ROLLBACK
-- =============================================

-- Verificar se as políticas vulneráveis foram restauradas
SELECT 
  'POST-ROLLBACK VERIFICATION' as check_type,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%podem ver seu próprio perfil%' THEN '⚠️ VULNERABLE_RESTORED'
    WHEN policyname LIKE '%podem ver seus proprios dados%' THEN '⚠️ VULNERABLE_RESTORED'
    WHEN policyname LIKE '%podem ler ferias%' THEN '⚠️ VULNERABLE_RESTORED'
    ELSE '✅ OTHER_POLICY'
  END as vulnerability_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'funcionarios', 'ferias')
ORDER BY tablename, policyname;

-- =============================================
-- AVISO FINAL
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚨 ============================================';
  RAISE NOTICE '🚨 ROLLBACK CONCLUÍDO - SISTEMA VULNERÁVEL!';
  RAISE NOTICE '🚨 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ As seguintes vulnerabilidades foram REINTRODUZIDAS:';
  RAISE NOTICE '   1. ENUMERAÇÃO DE USUÁRIOS (profiles)';
  RAISE NOTICE '   2. EXPOSIÇÃO DE DADOS SENSÍVEIS (funcionarios)';
  RAISE NOTICE '   3. ACESSO IRRESTRITO A FÉRIAS (ferias)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Para corrigir novamente, execute:';
  RAISE NOTICE '   psql -f migrations/fix_security_vulnerabilities.sql';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Para testar vulnerabilidades, execute:';
  RAISE NOTICE '   psql -f test_security_fixes.sql';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Para mais informações, consulte:';
  RAISE NOTICE '   SECURITY_FIXES_DOCUMENTATION.md';
  RAISE NOTICE '';
  RAISE NOTICE '🚨 ============================================';
END;
$$;

-- =============================================
-- RESUMO DO ROLLBACK
-- =============================================

/*
ROLLBACK EXECUTADO:

❌ VULNERABILIDADES REINTRODUZIDAS:

1. PUBLIC_USER_DATA (profiles):
   ✅ ANTES: auth.uid() IS NOT NULL AND id = auth.uid() (seguro)
   ❌ DEPOIS: auth.uid() = id (vulnerável a enumeração)

2. EXPOSED_SENSITIVE_DATA (funcionarios):
   ✅ ANTES: Apenas próprio funcionário, admin ou manager da empresa
   ❌ DEPOIS: auth.uid() IS NOT NULL (acesso irrestrito)

3. MISSING_RLS_PROTECTION (ferias):
   ✅ ANTES: Apenas próprias férias, admin ou manager da empresa
   ❌ DEPOIS: auth.uid() IS NOT NULL (acesso irrestrito)

🔄 PARA CORRIGIR NOVAMENTE:
   Execute: migrations/fix_security_vulnerabilities.sql

⚠️ IMPORTANTE:
   Este rollback deve ser usado apenas para:
   - Testes de segurança
   - Emergências temporárias
   - Debugging de problemas específicos
   
   NÃO deixe o sistema em produção com essas vulnerabilidades!
*/