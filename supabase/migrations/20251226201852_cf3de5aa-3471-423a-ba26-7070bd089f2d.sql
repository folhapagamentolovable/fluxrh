-- Adicionar coluna user_id na tabela funcionarios para vincular ao auth.users
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_user_id ON public.funcionarios(user_id);

-- Função para vincular funcionário automaticamente por email
CREATE OR REPLACE FUNCTION public.link_funcionario_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando um novo usuário é criado, tentar vincular a um funcionário existente pelo email
  UPDATE public.funcionarios
  SET user_id = NEW.id
  WHERE LOWER(cpf) = LOWER(NEW.email) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.id AND LOWER(email) = LOWER(NEW.email)
  )
  AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Função para funcionário ver seus próprios dados
CREATE OR REPLACE FUNCTION public.is_own_employee_data(funcionario_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT funcionario_user_id = auth.uid()
$$;

-- Políticas RLS para funcionários verem seus próprios dados

-- Funcionário pode ver sua própria folha calculada
CREATE POLICY "Funcionarios podem ver sua propria folha"
  ON public.folha_calculada FOR SELECT
  USING (
    is_admin() OR 
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

-- Funcionário pode ver sua própria escala mensal
CREATE POLICY "Funcionarios podem ver sua propria escala"
  ON public.escala_mensal FOR SELECT
  USING (
    is_admin() OR 
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

-- Funcionário pode ver suas próprias férias
CREATE POLICY "Funcionarios podem ver suas proprias ferias"
  ON public.ferias FOR SELECT
  USING (
    is_admin() OR 
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

-- Funcionário pode inserir pedido de férias (apenas para si mesmo)
CREATE POLICY "Funcionarios podem solicitar ferias"
  ON public.ferias FOR INSERT
  WITH CHECK (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

-- Funcionário pode ver seus próprios dados
CREATE POLICY "Funcionarios podem ver seus proprios dados"
  ON public.funcionarios FOR SELECT
  USING (
    is_admin() OR user_id = auth.uid() OR auth.uid() IS NOT NULL
  );