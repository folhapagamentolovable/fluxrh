-- Migração para remover a role MANAGER e todas as policies relacionadas

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

-- 4. Remover o valor 'manager' do enum app_role
-- Nota: PostgreSQL não permite remover valores de enum diretamente
-- Vamos criar um novo enum sem 'manager' e substituir o antigo

-- Criar novo enum sem 'manager'
CREATE TYPE public.app_role_new AS ENUM ('admin', 'user');

-- Atualizar a tabela user_roles para usar o novo enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Remover o enum antigo e renomear o novo
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

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

-- Comentário: A função is_admin_or_manager agora apenas verifica se é admin
-- Isso mantém compatibilidade com código existente que pode estar usando esta função