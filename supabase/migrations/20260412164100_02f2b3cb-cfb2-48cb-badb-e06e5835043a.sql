
-- 1. Create non-conformity table
CREATE TABLE public.rondas_nao_conformidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id uuid REFERENCES public.rondas_sessoes(id) ON DELETE SET NULL,
  leitura_id uuid REFERENCES public.rondas_leituras(id) ON DELETE SET NULL,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data_ronda date NOT NULL DEFAULT CURRENT_DATE,
  ciclo_numero integer,
  nivel text NOT NULL CHECK (nivel IN ('leve', 'media', 'grave', 'gravissima')),
  tipo text NOT NULL CHECK (tipo IN ('antecipacao', 'atraso', 'sequencia_incorreta', 'ausencia_leitura', 'ronda_nao_realizada', 'sequencia_repetida')),
  diferenca_minutos numeric DEFAULT 0,
  descricao text NOT NULL,
  recomendacao_gerencial text NOT NULL,
  ponto_nome text,
  alerta_exibido boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.rondas_nao_conformidades ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Admins full access nao_conformidades"
ON public.rondas_nao_conformidades FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Managers view nao_conformidades of their companies"
ON public.rondas_nao_conformidades FOR SELECT
USING (
  is_manager(auth.uid()) AND
  funcionario_id IN (
    SELECT f.id FROM funcionarios f
    WHERE f.empresa_id IN (
      SELECT me.empresa_id FROM manager_empresas me WHERE me.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Employees view own nao_conformidades"
ON public.rondas_nao_conformidades FOR SELECT
USING (
  funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can insert own nao_conformidades"
ON public.rondas_nao_conformidades FOR INSERT
WITH CHECK (
  funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Clients view nao_conformidades of their postos"
ON public.rondas_nao_conformidades FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'client') AND
  funcionario_id IN (
    SELECT f.id FROM funcionarios f
    WHERE f.posto_trabalho_id IN (
      SELECT cp.posto_id FROM client_postos cp WHERE cp.user_id = auth.uid()
    )
  )
);

-- 4. Index for performance
CREATE INDEX idx_nao_conformidades_data ON public.rondas_nao_conformidades (data_ronda);
CREATE INDEX idx_nao_conformidades_func ON public.rondas_nao_conformidades (funcionario_id);
CREATE INDEX idx_nao_conformidades_nivel ON public.rondas_nao_conformidades (nivel);

-- 5. Cleanup function (deletes records older than 2 months, run on 1st of month)
CREATE OR REPLACE FUNCTION public.limpar_nao_conformidades_antigas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.rondas_nao_conformidades
  WHERE data_ronda < (date_trunc('month', CURRENT_DATE) - interval '2 months')::date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 6. Security fix: enable RLS on backup table
ALTER TABLE public.folha_calculada_backup_eventos_20260301 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins access backup table"
ON public.folha_calculada_backup_eventos_20260301 FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
