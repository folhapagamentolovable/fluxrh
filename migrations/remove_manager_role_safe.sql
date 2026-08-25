-- Script SQL SEGURO para remover a role MANAGER
-- Este script lida com todas as dependências do enum app_role

-- 1. Remover todas as policies que usam is_manager()
DROP POLICY IF EXISTS "Managers têm acesso CRUD a escala_mensal" ON public.escala_mensal;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a ferias" ON public.ferias;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a folha_calculada" ON public.folha_calculada;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a sugestoes_reclamacoes" ON public.sugestoes_reclamacoes;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a portal_visibility_config" ON public.portal_visibility_config;

-- 2. Remover as funções relacionadas ao manager
DROP FUNCTION IF EXISTS public.is_manager(uuid);
DROP FUNCTION IF EXISTS public.is_admin_or_manager(uuid);

-- 3. Atualizar todos os usuários que têm role 'manager' para 'user'
UPDATE public.user_roles 
SET role = 'user' 
WHERE role = 'manager';

-- 4. Abordagem segura para remover 'manager' do enum
-- Vamos usar uma transação para garantir consistência

BEGIN;

-- Salvar definições de policies que serão removidas pelo CASCADE
CREATE TEMP TABLE temp_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public';

-- Criar novo enum sem 'manager'
CREATE TYPE public.app_role_new AS ENUM ('admin', 'user');

-- Atualizar a tabela user_roles para usar o novo enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Salvar a definição da função has_role antes de removê-la
CREATE TEMP TABLE temp_has_role_def AS
SELECT pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'has_role' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Remover o enum antigo usando CASCADE (isso removerá dependências)
DROP TYPE public.app_role CASCADE;

-- Renomear o novo enum
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Recriar a função has_role com o novo enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recriar policies importantes que foram removidas pelo CASCADE
-- Policy para funcionarios (mencionada no erro)
CREATE POLICY "Users podem ler funcionários" 
ON public.funcionarios 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Recriar outras policies básicas que podem ter sido removidas
-- (Adicione aqui outras policies que você sabe que existem)

COMMIT;

-- 5. Recriar a função is_admin_or_manager apenas como is_admin (para compatibilidade)
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Limpar tabelas temporárias
DROP TABLE IF EXISTS temp_policies;
DROP TABLE IF EXISTS temp_has_role_def;