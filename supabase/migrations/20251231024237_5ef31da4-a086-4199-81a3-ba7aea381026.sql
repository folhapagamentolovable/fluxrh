-- Adicionar política para managers atualizarem sugestões das suas empresas
CREATE POLICY "Managers podem atualizar sugestoes das suas empresas"
ON public.sugestoes_reclamacoes
FOR UPDATE
TO authenticated
USING (
  public.is_manager(auth.uid()) 
  AND funcionario_id IN (
    SELECT id FROM public.funcionarios 
    WHERE empresa_id IN (
      SELECT empresa_id FROM public.manager_empresas 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_manager(auth.uid()) 
  AND funcionario_id IN (
    SELECT id FROM public.funcionarios 
    WHERE empresa_id IN (
      SELECT empresa_id FROM public.manager_empresas 
      WHERE user_id = auth.uid()
    )
  )
);