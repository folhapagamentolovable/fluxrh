
-- Fix: Allow employees to change status from 'aberto' to 'finalizado'
-- The current policy uses USING(status='aberto') which also acts as WITH CHECK,
-- blocking the update to status='finalizado'

DROP POLICY "Funcionários podem atualizar seus próprios registros abertos" ON public.folha_ponto_automatica;

CREATE POLICY "Funcionários podem atualizar seus próprios registros abertos"
ON public.folha_ponto_automatica
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.id = folha_ponto_automatica.funcionario_id
    AND f.user_id = auth.uid()
  ))
  AND status = 'aberto'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.id = folha_ponto_automatica.funcionario_id
    AND f.user_id = auth.uid()
  )
);
