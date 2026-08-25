-- ============================================
-- POLÍTICAS RLS PARA FLUXPAY
-- ============================================
-- Este script ativa RLS em todas as tabelas e cria políticas para:
-- - Admins: Acesso total (SELECT, INSERT, UPDATE, DELETE)
-- - Users: Apenas leitura (SELECT)
-- ============================================

-- Função auxiliar para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TABELA: profiles
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a profiles"
  ON profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: pode ver apenas seu próprio perfil
CREATE POLICY "Users podem ver seu próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- User: pode atualizar apenas seu próprio perfil
CREATE POLICY "Users podem atualizar seu próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- TABELA: user_roles
-- ============================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a user_roles"
  ON user_roles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: pode ver apenas suas próprias roles
CREATE POLICY "Users podem ver suas próprias roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- TABELA: empresas
-- ============================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a empresas"
  ON empresas FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler empresas"
  ON empresas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: cargos
-- ============================================
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a cargos"
  ON cargos FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler cargos"
  ON cargos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: postos_trabalho
-- ============================================
ALTER TABLE postos_trabalho ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a postos_trabalho"
  ON postos_trabalho FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler postos_trabalho"
  ON postos_trabalho FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: funcionarios
-- ============================================
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a funcionarios"
  ON funcionarios FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler funcionarios"
  ON funcionarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: feriados
-- ============================================
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a feriados"
  ON feriados FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler feriados"
  ON feriados FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: regras_escalas
-- ============================================
ALTER TABLE regras_escalas ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a regras_escalas"
  ON regras_escalas FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler regras_escalas"
  ON regras_escalas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: escala_mensal
-- ============================================
ALTER TABLE escala_mensal ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a escala_mensal"
  ON escala_mensal FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler escala_mensal"
  ON escala_mensal FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: folhas_ponto
-- ============================================
ALTER TABLE folhas_ponto ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a folhas_ponto"
  ON folhas_ponto FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler folhas_ponto"
  ON folhas_ponto FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: folha_calculada
-- ============================================
ALTER TABLE folha_calculada ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a folha_calculada"
  ON folha_calculada FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler folha_calculada"
  ON folha_calculada FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TABELA: parametros_calculo
-- ============================================
ALTER TABLE parametros_calculo ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "Admins têm acesso total a parametros_calculo"
  ON parametros_calculo FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User: apenas leitura
CREATE POLICY "Users podem ler parametros_calculo"
  ON parametros_calculo FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Para verificar se RLS está ativo em todas as tabelas:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Para listar todas as políticas criadas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE schemaname = 'public';
