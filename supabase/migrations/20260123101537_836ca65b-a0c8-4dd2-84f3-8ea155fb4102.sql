-- Adicionar campo para armazenar inconsistências detectadas no registro de ponto
ALTER TABLE public.folha_ponto_automatica
ADD COLUMN IF NOT EXISTS inconsistencias jsonb DEFAULT '[]'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN public.folha_ponto_automatica.inconsistencias IS 'Array de inconsistências detectadas: [{tipo: "HORARIO_FORA_TOLERANCIA" | "POSTO_DIFERENTE" | "DIA_FOLGA", descricao: string, horario_esperado?: string, horario_registrado?: string}]';