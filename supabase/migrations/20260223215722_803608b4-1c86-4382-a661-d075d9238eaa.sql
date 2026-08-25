
-- Drop the existing check constraint and recreate with 'rejeitado' included
ALTER TABLE public.folha_ponto_automatica DROP CONSTRAINT folha_ponto_automatica_status_check;

ALTER TABLE public.folha_ponto_automatica ADD CONSTRAINT folha_ponto_automatica_status_check 
  CHECK (status = ANY (ARRAY['aberto'::text, 'finalizado'::text, 'invalido'::text, 'rejeitado'::text]));
