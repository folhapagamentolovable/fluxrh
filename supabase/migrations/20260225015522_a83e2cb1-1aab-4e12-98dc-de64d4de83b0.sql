
-- Allow managers to update (approve/reject) time records for employees in their companies
CREATE POLICY "Managers podem atualizar registros das suas empresas"
ON public.folha_ponto_automatica
FOR UPDATE
USING (
  is_manager(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.id = folha_ponto_automatica.funcionario_id 
    AND manager_has_empresa_access(auth.uid(), f.empresa_id)
  )
)
WITH CHECK (
  is_manager(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM funcionarios f
    WHERE f.id = folha_ponto_automatica.funcionario_id 
    AND manager_has_empresa_access(auth.uid(), f.empresa_id)
  )
);
