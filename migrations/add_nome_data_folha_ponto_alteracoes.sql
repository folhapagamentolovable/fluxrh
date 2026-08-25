-- Adiciona colunas nome_funcionario e data_registro na tabela folha_ponto_alteracoes
ALTER TABLE folha_ponto_alteracoes
  ADD COLUMN IF NOT EXISTS nome_funcionario TEXT,
  ADD COLUMN IF NOT EXISTS data_registro DATE;

-- Preencher retroativamente os registros existentes
UPDATE folha_ponto_alteracoes alt
SET
  nome_funcionario = fpa.nome_funcionario,
  data_registro    = fpa.data_registro::DATE
FROM folha_ponto_automatica fpa
WHERE fpa.id = alt.registro_ponto_id
  AND alt.nome_funcionario IS NULL;
