-- Adicionar campo observacoes na tabela folha_calculada
-- Data: 2026-01-06
-- Descrição: Campo para observações gerais da folha de pagamento

ALTER TABLE folha_calculada 
ADD COLUMN observacoes TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN folha_calculada.observacoes IS 'Observações gerais sobre a folha de pagamento do funcionário';