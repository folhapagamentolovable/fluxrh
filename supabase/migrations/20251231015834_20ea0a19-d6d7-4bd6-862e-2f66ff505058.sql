-- =====================================================
-- 1. Criar tabela para vincular managers às empresas
-- =====================================================
CREATE TABLE public.manager_empresas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, empresa_id)
);

-- Habilitar RLS
ALTER TABLE public.manager_empresas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins têm acesso total a manager_empresas"
ON public.manager_empresas
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers podem ver seus próprios vínculos"
ON public.manager_empresas
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_manager_empresas_updated_at
    BEFORE UPDATE ON public.manager_empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. Corrigir função is_manager
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'manager'
  )
$$;

-- =====================================================
-- 3. Corrigir função is_admin_or_manager
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- =====================================================
-- 4. Função para obter empresas do manager
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_manager_empresas(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.manager_empresas
  WHERE user_id = _user_id
$$;

-- =====================================================
-- 5. Função para verificar se manager tem acesso à empresa
-- =====================================================
CREATE OR REPLACE FUNCTION public.manager_has_empresa_access(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manager_empresas
    WHERE user_id = _user_id
      AND empresa_id = _empresa_id
  )
$$;

-- =====================================================
-- 6. Atualizar RLS para managers verem dados das suas empresas
-- =====================================================

-- EMPRESAS: Manager pode ver suas empresas vinculadas
CREATE POLICY "Managers podem ver suas empresas vinculadas"
ON public.empresas
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
);

-- FUNCIONARIOS: Manager pode ver funcionários das suas empresas
CREATE POLICY "Managers podem ver funcionários das suas empresas"
ON public.funcionarios
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
);

-- FOLHA_CALCULADA: Manager pode ver folhas das suas empresas
CREATE POLICY "Managers podem ver folhas das suas empresas"
ON public.folha_calculada
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
);

-- ESCALA_MENSAL: Manager pode ver escalas das suas empresas
CREATE POLICY "Managers podem ver escalas das suas empresas"
ON public.escala_mensal
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
);

-- POSTOS_TRABALHO: Manager pode ver postos das suas empresas
CREATE POLICY "Managers podem ver postos das suas empresas"
ON public.postos_trabalho
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
);

-- FOLHAS_PONTO: Manager pode ver folhas de ponto das suas empresas
CREATE POLICY "Managers podem ver folhas_ponto das suas empresas"
ON public.folhas_ponto
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
);

-- FERIAS: Manager pode ver férias dos funcionários das suas empresas
CREATE POLICY "Managers podem ver ferias das suas empresas"
ON public.ferias
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND funcionario_id IN (
    SELECT id FROM public.funcionarios 
    WHERE empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
  )
);

-- SUGESTOES_RECLAMACOES: Manager pode ver sugestões dos funcionários das suas empresas
CREATE POLICY "Managers podem ver sugestoes das suas empresas"
ON public.sugestoes_reclamacoes
FOR SELECT
USING (
  is_manager(auth.uid()) 
  AND funcionario_id IN (
    SELECT id FROM public.funcionarios 
    WHERE empresa_id IN (SELECT empresa_id FROM public.manager_empresas WHERE user_id = auth.uid())
  )
);