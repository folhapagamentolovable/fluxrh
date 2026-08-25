-- Client pode ler registros de ponto dos seus postos vinculados
CREATE POLICY "Clients read folha_ponto_automatica dos seus postos"
ON public.folha_ponto_automatica
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'client')
    AND posto_trabalho_id IN (SELECT posto_id FROM public.client_postos WHERE user_id = auth.uid())
);