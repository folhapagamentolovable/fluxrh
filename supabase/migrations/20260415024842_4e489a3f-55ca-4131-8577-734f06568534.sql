-- Fix: require authentication to read broadcast messages
DROP POLICY IF EXISTS "Funcionários podem ver mensagens ativas" ON public.mensagens_broadcast;

CREATE POLICY "Funcionários autenticados podem ver mensagens ativas"
ON public.mensagens_broadcast
FOR SELECT
TO public
USING (ativo = true AND auth.uid() IS NOT NULL);