
-- ============================================================
-- ADAPTAÇÃO: rq_rotas ganha campos para compatibilidade com a UX
-- antiga das telas /rondas/* que usavam rondas_horarios
-- ============================================================
ALTER TABLE public.rq_rotas
  ADD COLUMN IF NOT EXISTS dias_semana TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex','sab','dom'],
  ADD COLUMN IF NOT EXISTS funcionarios_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS pontos_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_rq_rotas_funcionarios ON public.rq_rotas USING GIN (funcionarios_ids);
CREATE INDEX IF NOT EXISTS idx_rq_rotas_pontos ON public.rq_rotas USING GIN (pontos_ids);

-- Coluna numero_sequencial em rq_pontos_ronda (alias para 'ordem' já existente,
-- mas mantemos compatibilidade do código legado se já não houver)
-- 'ordem' já existe — apenas garantimos default
ALTER TABLE public.rq_pontos_ronda
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'filho' CHECK (tipo IN ('pai','filho'));

-- Tabela de pausas (refeições) — compatível com a UX antiga
CREATE TABLE IF NOT EXISTS public.rq_pausas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rq_pausas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rq_pausas_admin_all" ON public.rq_pausas;
CREATE POLICY "rq_pausas_admin_all" ON public.rq_pausas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::text) OR is_manager(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::text) OR is_manager(auth.uid()));

DROP POLICY IF EXISTS "rq_pausas_read" ON public.rq_pausas;
CREATE POLICY "rq_pausas_read" ON public.rq_pausas
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
