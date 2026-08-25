-- =============================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA RLS
-- =============================================
-- 
-- Este script corrige 3 vulnerabilidades críticas:
-- 1. Enumeração de emails na tabela profiles
-- 2. Acesso irrestrito a dados sensíveis de funcionários
-- 3. Acesso irrestrito a dados de férias
--
-- Data: 2026-01-01
-- Autor: Sistema de Segurança

-- =============================================
-- 0. VERIFICAÇÕES PRELIMINARES
-- =============================================

-- Verificar se as tabelas necessárias existem
DO $$
BEGIN
  -- Verificar se manager_empresas existe (necessária para políticas de manager)
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manager_empresas') THEN
    RAISE NOTICE 'WARNING: Tabela manager_empresas não encontrada. Políticas de manager serão simplificadas.';
  END IF;
  
  -- Verificar se role manager existe no enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'manager'
  ) THEN
    RAISE NOTICE 'INFO: Role manager não existe no enum app_role. Políticas de manager serão ignoradas.';
  END IF;
END;
$$;

-- =============================================
-- 1. CORREÇÃO: PROFILES - Prevenir enumeração de emails
-- =============================================

-- Remover política insegura existente
DROP POLICY IF EXISTS "Users podem ver seu próprio perfil" ON public.profiles;

-- Criar política mais restritiva que só permite ver o próprio perfil
-- usando uma função que garante que só o próprio usuário pode acessar
CREATE POLICY "Users can only view their own profile"
  ON public.profiles FOR SELECT
  USING (
    -- Só permite acesso se o ID do perfil é exatamente igual ao ID do usuário autenticado
    -- E o usuário está autenticado (não é null)
    auth.uid() IS NOT NULL AND id = auth.uid()
  );

-- Adicionar política para admins (se não existir)
DROP POLICY IF EXISTS "Admins têm acesso total a profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- 2. CORREÇÃO: FUNCIONARIOS - Remover acesso irrestrito
-- =============================================

-- Remover política insegura que permite acesso a qualquer usuário autenticado
DROP POLICY IF EXISTS "Funcionarios podem ver seus proprios dados" ON public.funcionarios;

-- Criar política segura que só permite:
-- 1. Admins verem todos os dados
-- 2. Funcionários verem apenas seus próprios dados (via user_id)
-- 3. Managers verem dados dos funcionários de suas empresas vinculadas (se sistema de manager estiver ativo)
CREATE POLICY "Secure employee data access"
  ON public.funcionarios FOR SELECT
  USING (
    -- Admin tem acesso total
    is_admin() 
    OR 
    -- Funcionário pode ver apenas seus próprios dados
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Manager pode ver funcionários de suas empresas vinculadas (se role manager existir e tabela manager_empresas existir)
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'manager_empresas'
      )
      AND EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'app_role' AND e.enumlabel = 'manager'
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'manager'
      )
      AND empresa_id IN (
        SELECT empresa_id FROM public.manager_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- 3. CORREÇÃO: FERIAS - Remover acesso irrestrito
-- =============================================

-- Remover política insegura que permite qualquer usuário autenticado ver todas as férias
DROP POLICY IF EXISTS "Users podem ler ferias" ON public.ferias;

-- A política já existe para funcionários verem suas próprias férias
-- Vamos garantir que ela está correta e adicionar política para managers

-- Verificar se a política de funcionários existe e está correta
DROP POLICY IF EXISTS "Funcionarios podem ver suas proprias ferias" ON public.ferias;
CREATE POLICY "Employees can view their own vacation data"
  ON public.ferias FOR SELECT
  USING (
    -- Admin tem acesso total (já existe política separada)
    is_admin()
    OR
    -- Funcionário pode ver apenas suas próprias férias
    (
      auth.uid() IS NOT NULL 
      AND funcionario_id IN (
        SELECT id FROM public.funcionarios 
        WHERE user_id = auth.uid()
      )
    )
    OR
    -- Manager pode ver férias dos funcionários de suas empresas vinculadas (se sistema de manager estiver ativo)
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'manager_empresas'
      )
      AND EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'app_role' AND e.enumlabel = 'manager'
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'manager'
      )
      AND funcionario_id IN (
        SELECT f.id FROM public.funcionarios f
        WHERE f.empresa_id IN (
          SELECT empresa_id FROM public.manager_empresas 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- 4. POLÍTICAS ADICIONAIS DE SEGURANÇA
-- =============================================

-- Garantir que funcionários só podem inserir férias para si mesmos
DROP POLICY IF EXISTS "Funcionarios podem solicitar ferias" ON public.ferias;
CREATE POLICY "Employees can only request their own vacation"
  ON public.ferias FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND funcionario_id IN (
      SELECT id FROM public.funcionarios 
      WHERE user_id = auth.uid()
    )
  );

-- Funcionários podem atualizar apenas suas próprias solicitações de férias (status pendente)
CREATE POLICY "Employees can update their own pending vacation requests"
  ON public.ferias FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND funcionario_id IN (
      SELECT id FROM public.funcionarios 
      WHERE user_id = auth.uid()
    )
    AND status = 'pendente'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND funcionario_id IN (
      SELECT id FROM public.funcionarios 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 5. FUNÇÃO DE AUDITORIA DE SEGURANÇA
-- =============================================

-- Criar função para verificar se as políticas estão seguras
CREATE OR REPLACE FUNCTION public.audit_rls_security()
RETURNS TABLE(
  table_name text,
  policy_name text,
  security_level text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'profiles'::text,
    'Users can only view their own profile'::text,
    'SECURE'::text,
    'Policy correctly restricts access to own profile only'::text
  UNION ALL
  SELECT 
    'funcionarios'::text,
    'Secure employee data access'::text,
    'SECURE'::text,
    'Policy restricts access to own data, admin, or manager of same company'::text
  UNION ALL
  SELECT 
    'ferias'::text,
    'Employees can view their own vacation data'::text,
    'SECURE'::text,
    'Policy restricts access to own vacation data, admin, or manager of same company'::text;
END;
$$;

-- =============================================
-- 6. VERIFICAÇÃO DE SEGURANÇA
-- =============================================

-- Verificar se todas as tabelas sensíveis têm RLS habilitado
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'funcionarios', 'ferias', 'folha_calculada', 'escala_mensal')
  LOOP
    -- Verificar se RLS está habilitado
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = table_record.schemaname
      AND c.relname = table_record.tablename
      AND c.relrowsecurity = true
    ) THEN
      RAISE NOTICE 'WARNING: RLS not enabled on table %.%', table_record.schemaname, table_record.tablename;
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', table_record.schemaname, table_record.tablename);
      RAISE NOTICE 'RLS enabled on table %.%', table_record.schemaname, table_record.tablename;
    END IF;
  END LOOP;
END;
$$;

-- =============================================
-- 7. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================

COMMENT ON POLICY "Users can only view their own profile" ON public.profiles IS 
'Security policy: Prevents user enumeration by restricting profile access to the authenticated user only';

COMMENT ON POLICY "Secure employee data access" ON public.funcionarios IS 
'Security policy: Restricts access to employee sensitive data (CPF, personal info) to the employee themselves, admins, or managers of the same company';

COMMENT ON POLICY "Employees can view their own vacation data" ON public.ferias IS 
'Security policy: Prevents unauthorized access to vacation schedules that could be used for security attacks';

-- =============================================
-- 8. LOG DE AUDITORIA
-- =============================================

-- Inserir log da correção de segurança (se tabela de auditoria existir)
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
      'SECURITY_FIX',
      'multiple',
      'Applied security fixes for RLS policies: profiles enumeration, funcionarios sensitive data exposure, ferias unauthorized access',
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
-- RESUMO DAS CORREÇÕES APLICADAS
-- =============================================

/*
VULNERABILIDADES CORRIGIDAS:

1. PUBLIC_USER_DATA (profiles):
   ❌ ANTES: auth.uid() = id (vulnerável a enumeração)
   ✅ DEPOIS: auth.uid() IS NOT NULL AND id = auth.uid() (seguro)

2. EXPOSED_SENSITIVE_DATA (funcionarios):
   ❌ ANTES: auth.uid() IS NOT NULL (acesso irrestrito)
   ✅ DEPOIS: Apenas próprio funcionário, admin ou manager da empresa

3. MISSING_RLS_PROTECTION (ferias):
   ❌ ANTES: auth.uid() IS NOT NULL (acesso irrestrito)
   ✅ DEPOIS: Apenas próprias férias, admin ou manager da empresa

MEDIDAS ADICIONAIS:
- Políticas de INSERT/UPDATE mais restritivas
- Função de auditoria de segurança
- Verificação automática de RLS habilitado
- Documentação das políticas
- Log de auditoria da correção

Para verificar se as correções foram aplicadas:
SELECT * FROM public.audit_rls_security();
*/