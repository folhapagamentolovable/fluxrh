-- Script SQL SIMPLES para desabilitar a role MANAGER
-- Esta abordagem é mais segura e não quebra dependências existentes

-- 1. Remover todas as policies que usam is_manager()
DROP POLICY IF EXISTS "Managers têm acesso CRUD a escala_mensal" ON public.escala_mensal;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a ferias" ON public.ferias;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a folha_calculada" ON public.folha_calculada;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a sugestoes_reclamacoes" ON public.sugestoes_reclamacoes;
DROP POLICY IF EXISTS "Managers têm acesso CRUD a portal_visibility_config" ON public.portal_visibility_config;

-- 2. Remover as funções relacionadas ao manager
DROP FUNCTION IF EXISTS public.is_manager(uuid);

-- 3. Atualizar todos os usuários que têm role 'manager' para 'user'
UPDATE public.user_roles 
SET role = 'user' 
WHERE role = 'manager';

-- 4. Modificar a função is_admin_or_manager para apenas verificar admin
-- (mantemos o nome para compatibilidade, mas agora só verifica admin)
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- 5. Criar uma função is_manager que sempre retorna false
-- (para compatibilidade caso algo ainda tente usá-la)
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false
$$;

-- NOTA: O valor 'manager' ainda existe no enum app_role, mas:
-- - Nenhum usuário tem essa role (todos foram convertidos para 'user')
-- - Nenhuma policy usa essa role
-- - A função is_manager sempre retorna false
-- - A função is_admin_or_manager só verifica admin
-- 
-- Isso garante que a role manager está efetivamente desabilitada
-- sem quebrar dependências existentes no banco de dados.