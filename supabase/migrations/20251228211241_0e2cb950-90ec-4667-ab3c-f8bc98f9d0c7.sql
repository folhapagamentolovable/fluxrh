-- Adicionar coluna ano_vigencia à tabela parametros_calculo
ALTER TABLE public.parametros_calculo 
ADD COLUMN ano_vigencia integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Criar índice único para garantir apenas um registro por ano
CREATE UNIQUE INDEX idx_parametros_calculo_ano_vigencia ON public.parametros_calculo(ano_vigencia) WHERE ativo = true;

-- Atualizar o registro existente para 2025
UPDATE public.parametros_calculo SET ano_vigencia = 2025 WHERE ativo = true;

-- Comentário explicativo
COMMENT ON COLUMN public.parametros_calculo.ano_vigencia IS 'Ano de vigência dos parâmetros de cálculo (dissídio anual)';