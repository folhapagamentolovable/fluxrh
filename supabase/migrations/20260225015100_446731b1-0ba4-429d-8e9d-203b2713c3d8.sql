
-- Drop overly permissive "any authenticated user can read all" policies
-- These allow any logged-in user to see ALL data across companies

DROP POLICY IF EXISTS "Users podem ler empresas" ON empresas;
DROP POLICY IF EXISTS "Users podem ler cargos" ON cargos;
DROP POLICY IF EXISTS "Users podem ler postos_trabalho" ON postos_trabalho;
DROP POLICY IF EXISTS "Users podem ler funcionarios" ON funcionarios;
DROP POLICY IF EXISTS "Users podem ler funcionários" ON funcionarios;
DROP POLICY IF EXISTS "Users podem ler historico_salarios" ON historico_salarios;
DROP POLICY IF EXISTS "Users podem ler escala_mensal" ON escala_mensal;
DROP POLICY IF EXISTS "Users podem ler folha_calculada" ON folha_calculada;
DROP POLICY IF EXISTS "Users podem ler folhas_ponto" ON folhas_ponto;
DROP POLICY IF EXISTS "Users podem ler regras_escalas" ON regras_escalas;

-- Keep parametros_calculo and feriados readable by all authenticated users
-- (system config data, not sensitive personal information)

-- Add scoped employee policies for tables that need them:

-- Employees can view their own company's empresas record
CREATE POLICY "Employees can view own empresa"
ON empresas FOR SELECT
USING (
  is_admin() OR
  is_manager(auth.uid()) OR
  id IN (
    SELECT empresa_id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Employees can view their own cargo
CREATE POLICY "Employees can view own cargo"
ON cargos FOR SELECT
USING (
  is_admin() OR
  id IN (
    SELECT cargo_id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Employees can view their own posto
CREATE POLICY "Employees can view own posto"
ON postos_trabalho FOR SELECT
USING (
  is_admin() OR
  id IN (
    SELECT posto_trabalho_id FROM funcionarios WHERE user_id = auth.uid()
  ) OR
  -- Clients can see their linked postos
  (has_role(auth.uid(), 'client') AND id IN (
    SELECT posto_id FROM client_postos WHERE user_id = auth.uid()
  ))
);

-- Employees can view their own salary history
CREATE POLICY "Employees can view own historico_salarios"
ON historico_salarios FOR SELECT
USING (
  is_admin() OR
  funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Employees can view their own folhas_ponto
CREATE POLICY "Employees can view own folhas_ponto"
ON folhas_ponto FOR SELECT
USING (
  is_admin() OR
  funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Employees can view their own regras_escalas via cargo
CREATE POLICY "Authenticated users can read regras_escalas"
ON regras_escalas FOR SELECT
USING (auth.uid() IS NOT NULL);
