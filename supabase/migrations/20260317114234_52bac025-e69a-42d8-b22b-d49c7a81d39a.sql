-- Allow admins to DELETE from mensagens_broadcast_lidas
CREATE POLICY "Admins podem excluir leituras de broadcast"
ON public.mensagens_broadcast_lidas
FOR DELETE
TO public
USING (is_admin(auth.uid()));