
-- =============================================
-- FIX: Admin CRUD policies - ensure all have WITH CHECK
-- =============================================

-- 1. FERIADOS - remove duplicate, fix missing WITH CHECK
DROP POLICY IF EXISTS "Admins podem gerenciar feriados" ON feriados;

-- 2. FOLHA_PONTO_ALTERACOES - fix missing WITH CHECK
DROP POLICY IF EXISTS "Admins têm acesso total ao histórico de alterações" ON folha_ponto_alteracoes;
CREATE POLICY "Admins têm acesso total ao histórico de alterações"
  ON folha_ponto_alteracoes FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 3. FOLHA_PONTO_AUTOMATICA - fix missing WITH CHECK
DROP POLICY IF EXISTS "Admins têm acesso total à folha ponto automática" ON folha_ponto_automatica;
CREATE POLICY "Admins têm acesso total à folha ponto automática"
  ON folha_ponto_automatica FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 4. FUNCIONARIOS - remove duplicate policy without WITH CHECK
DROP POLICY IF EXISTS "Admins têm acesso total a funcionários" ON funcionarios;

-- 5. HISTORICO_SALARIOS_CARGO - fix missing WITH CHECK
DROP POLICY IF EXISTS "Admins can manage cargo salary history" ON historico_salarios_cargo;
CREATE POLICY "Admins can manage cargo salary history"
  ON historico_salarios_cargo FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. MENSAGENS_BROADCAST - fix missing WITH CHECK
DROP POLICY IF EXISTS "Admins podem gerenciar mensagens broadcast" ON mensagens_broadcast;
CREATE POLICY "Admins podem gerenciar mensagens broadcast"
  ON mensagens_broadcast FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 7. MENSAGENS_BROADCAST_LIDAS - ADD missing admin ALL policy
DROP POLICY IF EXISTS "Admins podem ver todas as leituras" ON mensagens_broadcast_lidas;
DROP POLICY IF EXISTS "Admins podem excluir leituras de broadcast" ON mensagens_broadcast_lidas;
CREATE POLICY "Admins têm acesso total a mensagens_broadcast_lidas"
  ON mensagens_broadcast_lidas FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 8. PROFILES - remove duplicate policy without WITH CHECK
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- 9. USER_ROLES - remove duplicate policy without WITH CHECK
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- 10. FUNCIONARIO_DOCUMENTOS - consolidate into single ALL policy
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON funcionario_documentos;
DROP POLICY IF EXISTS "Admins podem inserir documentos" ON funcionario_documentos;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON funcionario_documentos;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON funcionario_documentos;
CREATE POLICY "Admins têm acesso total a funcionario_documentos"
  ON funcionario_documentos FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Also add manager access for documents (they had it before via separate policies)
CREATE POLICY "Managers podem gerenciar documentos das suas empresas"
  ON funcionario_documentos FOR ALL
  TO public
  USING (
    is_manager(auth.uid()) AND 
    funcionario_id IN (
      SELECT f.id FROM funcionarios f 
      WHERE f.empresa_id IN (
        SELECT me.empresa_id FROM manager_empresas me WHERE me.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_manager(auth.uid()) AND 
    funcionario_id IN (
      SELECT f.id FROM funcionarios f 
      WHERE f.empresa_id IN (
        SELECT me.empresa_id FROM manager_empresas me WHERE me.user_id = auth.uid()
      )
    )
  );
