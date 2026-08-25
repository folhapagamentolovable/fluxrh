-- ============================================================
-- MÓDULO RONDAS - FluxPay
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Pontos de QR Code para rondas
CREATE TABLE IF NOT EXISTS rondas_pontos_qrcode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  numero_sequencial INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL DEFAULT 'filho' CHECK (tipo IN ('pai', 'filho')),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Horários de ronda
CREATE TABLE IF NOT EXISTS rondas_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  intervalo_entre_qrcodes_minutos INTEGER NOT NULL DEFAULT 15,
  tolerancia_minutos_antes INTEGER NOT NULL DEFAULT 5,
  tolerancia_minutos_depois INTEGER NOT NULL DEFAULT 10,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  pontos_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pausas (refeições)
CREATE TABLE IF NOT EXISTS rondas_pausas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Sessões de ronda
CREATE TABLE IF NOT EXISTS rondas_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  horario_id UUID REFERENCES rondas_horarios(id),
  data_ronda DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluida','incompleta')),
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizada_em TIMESTAMPTZ
);

-- Leituras individuais de pontos
CREATE TABLE IF NOT EXISTS rondas_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES rondas_sessoes(id),
  ponto_id UUID NOT NULL REFERENCES rondas_pontos_qrcode(id),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  lido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  previsto_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'no_prazo' CHECK (status IN ('no_prazo','antecipado','atrasado','nao_realizado')),
  diferenca_minutos INTEGER DEFAULT 0,
  observacao TEXT
);

-- Rondas não realizadas
CREATE TABLE IF NOT EXISTS rondas_nao_realizadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_id UUID REFERENCES rondas_horarios(id),
  data_ronda DATE NOT NULL,
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  minutos_nao_realizados INTEGER NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rondas_sessoes_funcionario ON rondas_sessoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_rondas_sessoes_data ON rondas_sessoes(data_ronda);
CREATE INDEX IF NOT EXISTS idx_rondas_leituras_sessao ON rondas_leituras(sessao_id);
CREATE INDEX IF NOT EXISTS idx_rondas_leituras_funcionario ON rondas_leituras(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_rondas_leituras_lido_em ON rondas_leituras(lido_em);

-- RLS
ALTER TABLE rondas_pontos_qrcode ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_pausas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_nao_realizadas ENABLE ROW LEVEL SECURITY;

-- Políticas: admin e manager gerenciam, autenticados leem
CREATE POLICY "rondas_pontos_admin" ON rondas_pontos_qrcode FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "rondas_pontos_read" ON rondas_pontos_qrcode FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "rondas_horarios_admin" ON rondas_horarios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "rondas_horarios_read" ON rondas_horarios FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "rondas_pausas_admin" ON rondas_pausas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY "rondas_pausas_read" ON rondas_pausas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "rondas_sessoes_all" ON rondas_sessoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "rondas_leituras_all" ON rondas_leituras FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "rondas_nao_realizadas_all" ON rondas_nao_realizadas FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
