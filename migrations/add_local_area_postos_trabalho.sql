-- Adicionar campo local_area à tabela postos_trabalho
ALTER TABLE postos_trabalho
ADD COLUMN IF NOT EXISTS local_area TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_postos_trabalho_local_area ON postos_trabalho(local_area);

-- Corrigir RLS: permitir que managers também gerenciem postos_trabalho
-- A política atual só permite admin. Adicionamos uma política para manager.
DROP POLICY IF EXISTS "Managers podem gerenciar postos_trabalho" ON postos_trabalho;

CREATE POLICY "Managers podem gerenciar postos_trabalho"
  ON postos_trabalho FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
  );
