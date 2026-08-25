-- Script SQL para remover a role MANAGER e todas as policies relacionadas
-- Execute estas consultas no seu Supabase em produção

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

-- Primeiro, vamos identificar e recriar todas as dependências

-- Criar novo enum sem 'manager'
CREATE TYPE public.app_role_new AS ENUM ('admin', 'user');

-- Atualizar a tabela user_roles para usar o novo enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Recriar a função has_role com o novo enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role_new)
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

-- Remover o enum antigo usando CASCADE para remover dependências
DROP TYPE public.app_role CASCADE;

-- Renomear o novo enum
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Recriar policies que podem ter sido removidas pelo CASCADE
-- Verificar se a policy "Users podem ler funcionários" existe e recriá-la se necessário
DO $$
BEGIN
    -- Recriar a policy se ela não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'funcionarios' 
        AND policyname = 'Users podem ler funcionários'
    ) THEN
        CREATE POLICY "Users podem ler funcionários" 
        ON public.funcionarios 
        FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

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