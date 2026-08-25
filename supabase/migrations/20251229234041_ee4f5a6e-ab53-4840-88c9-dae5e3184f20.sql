-- 1. Habilitar RLS na tabela portal_visibility_config
ALTER TABLE public.portal_visibility_config ENABLE ROW LEVEL SECURITY;

-- 2. Política de leitura para usuários autenticados
CREATE POLICY "Users podem ler portal_visibility_config" 
ON public.portal_visibility_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Política de CRUD para admins
CREATE POLICY "Admins têm acesso total a portal_visibility_config" 
ON public.portal_visibility_config 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- 4. Criar função para verificar se é manager
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'manager')
$$;

-- 5. Criar função para verificar se é admin OU manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager')
$$;

-- 6. Políticas para ESCALA_MENSAL - Manager com CRUD
CREATE POLICY "Managers têm acesso CRUD a escala_mensal" 
ON public.escala_mensal 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- 7. Políticas para FERIAS - Manager com CRUD
CREATE POLICY "Managers têm acesso CRUD a ferias" 
ON public.ferias 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- 8. Políticas para FOLHA_CALCULADA - Manager com CRUD
CREATE POLICY "Managers têm acesso CRUD a folha_calculada" 
ON public.folha_calculada 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- 9. Políticas para SUGESTOES_RECLAMACOES - Manager com CRUD
CREATE POLICY "Managers têm acesso CRUD a sugestoes_reclamacoes" 
ON public.sugestoes_reclamacoes 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- 10. Política para manager gerenciar portal_visibility_config
CREATE POLICY "Managers têm acesso CRUD a portal_visibility_config" 
ON public.portal_visibility_config 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));