
-- ============================================================
-- RONDA QR - Sistema de Controle de Rondas Patrimoniais
-- ============================================================

-- Status enums
CREATE TYPE rq_status_execucao AS ENUM ('pendente', 'em_andamento', 'concluida', 'incompleta', 'nao_realizada');
CREATE TYPE rq_status_leitura AS ENUM ('no_prazo', 'adiantado', 'atrasado', 'fora_de_ordem', 'invalido', 'nao_realizado');
CREATE TYPE rq_tipo_ocorrencia AS ENUM ('fora_de_ordem', 'fora_tolerancia', 'ponto_nao_lido', 'qr_invalido', 'ciclo_incompleto', 'outro');

-- ============================================================
-- 1. Pontos de Ronda (QR Codes)
-- ============================================================
CREATE TABLE public.rq_pontos_ronda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_trabalho_id UUID NOT NULL REFERENCES public.postos_trabalho(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  latitude NUMERIC,
  longitude NUMERIC,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(posto_trabalho_id, codigo)
);

CREATE INDEX idx_rq_pontos_posto ON rq_pontos_ronda(posto_trabalho_id);
CREATE INDEX idx_rq_pontos_ordem ON rq_pontos_ronda(posto_trabalho_id, ordem);

ALTER TABLE rq_pontos_ronda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_pontos_admin_all" ON rq_pontos_ronda FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_pontos_manager_select" ON rq_pontos_ronda FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()) AND posto_trabalho_id IN (
    SELECT pt.id FROM postos_trabalho pt
    JOIN manager_empresas me ON me.empresa_id = pt.empresa_id
    WHERE me.user_id = auth.uid()
  ));

CREATE POLICY "rq_pontos_auth_select" ON rq_pontos_ronda FOR SELECT TO authenticated
  USING (posto_trabalho_id IN (
    SELECT f.posto_trabalho_id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_pontos_client_select" ON rq_pontos_ronda FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client'::text) AND posto_trabalho_id IN (
    SELECT cp.posto_id FROM client_postos cp WHERE cp.user_id = auth.uid()
  ));

-- ============================================================
-- 2. Rotas de Ronda
-- ============================================================
CREATE TABLE public.rq_rotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_trabalho_id UUID NOT NULL REFERENCES public.postos_trabalho(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  hora_inicio TIME NOT NULL DEFAULT '19:00',
  hora_fim TIME NOT NULL DEFAULT '05:00',
  intervalo_pontos_minutos INTEGER NOT NULL DEFAULT 7,
  tolerancia_minutos INTEGER NOT NULL DEFAULT 3,
  bloquear_fora_ordem BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rq_rotas_posto ON rq_rotas(posto_trabalho_id);

ALTER TABLE rq_rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_rotas_admin_all" ON rq_rotas FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_rotas_manager_select" ON rq_rotas FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()) AND posto_trabalho_id IN (
    SELECT pt.id FROM postos_trabalho pt
    JOIN manager_empresas me ON me.empresa_id = pt.empresa_id
    WHERE me.user_id = auth.uid()
  ));

CREATE POLICY "rq_rotas_auth_select" ON rq_rotas FOR SELECT TO authenticated
  USING (posto_trabalho_id IN (
    SELECT f.posto_trabalho_id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_rotas_client_select" ON rq_rotas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client'::text) AND posto_trabalho_id IN (
    SELECT cp.posto_id FROM client_postos cp WHERE cp.user_id = auth.uid()
  ));

-- ============================================================
-- 3. Pontos da Rota (ordem na rota)
-- ============================================================
CREATE TABLE public.rq_rota_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id UUID NOT NULL REFERENCES public.rq_rotas(id) ON DELETE CASCADE,
  ponto_id UUID NOT NULL REFERENCES public.rq_pontos_ronda(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rota_id, ponto_id),
  UNIQUE(rota_id, ordem)
);

CREATE INDEX idx_rq_rota_pontos_rota ON rq_rota_pontos(rota_id);

ALTER TABLE rq_rota_pontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_rota_pontos_admin_all" ON rq_rota_pontos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_rota_pontos_select" ON rq_rota_pontos FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. Ciclos de Ronda (gerados automaticamente)
-- ============================================================
CREATE TABLE public.rq_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id UUID NOT NULL REFERENCES public.rq_rotas(id) ON DELETE CASCADE,
  data_turno DATE NOT NULL,
  hora_inicio TIMESTAMPTZ NOT NULL,
  hora_fim TIMESTAMPTZ NOT NULL,
  numero_ciclo INTEGER NOT NULL,
  total_pontos INTEGER NOT NULL DEFAULT 0,
  grade_horaria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rota_id, data_turno, numero_ciclo)
);

CREATE INDEX idx_rq_ciclos_rota_data ON rq_ciclos(rota_id, data_turno);

ALTER TABLE rq_ciclos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_ciclos_admin_all" ON rq_ciclos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_ciclos_select" ON rq_ciclos FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. Execuções de Ronda
-- ============================================================
CREATE TABLE public.rq_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.rq_ciclos(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  rota_id UUID NOT NULL REFERENCES public.rq_rotas(id) ON DELETE CASCADE,
  posto_trabalho_id UUID NOT NULL REFERENCES public.postos_trabalho(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  status rq_status_execucao NOT NULL DEFAULT 'pendente',
  iniciada_em TIMESTAMPTZ,
  finalizada_em TIMESTAMPTZ,
  total_pontos_lidos INTEGER NOT NULL DEFAULT 0,
  total_pontos_esperados INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rq_execucoes_ciclo ON rq_execucoes(ciclo_id);
CREATE INDEX idx_rq_execucoes_func ON rq_execucoes(funcionario_id);
CREATE INDEX idx_rq_execucoes_posto ON rq_execucoes(posto_trabalho_id);

ALTER TABLE rq_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_execucoes_admin_all" ON rq_execucoes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_execucoes_func_select" ON rq_execucoes FOR SELECT TO authenticated
  USING (funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_execucoes_func_insert" ON rq_execucoes FOR INSERT TO authenticated
  WITH CHECK (funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_execucoes_func_update" ON rq_execucoes FOR UPDATE TO authenticated
  USING (funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_execucoes_manager_select" ON rq_execucoes FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()) AND empresa_id IN (
    SELECT me.empresa_id FROM manager_empresas me WHERE me.user_id = auth.uid()
  ));

CREATE POLICY "rq_execucoes_client_select" ON rq_execucoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client'::text) AND posto_trabalho_id IN (
    SELECT cp.posto_id FROM client_postos cp WHERE cp.user_id = auth.uid()
  ));

-- ============================================================
-- 6. Leituras de QR Code
-- ============================================================
CREATE TABLE public.rq_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id UUID NOT NULL REFERENCES public.rq_execucoes(id) ON DELETE CASCADE,
  ponto_id UUID NOT NULL REFERENCES public.rq_pontos_ronda(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ordem_esperada INTEGER,
  ordem_lida INTEGER,
  horario_previsto TIMESTAMPTZ,
  horario_minimo TIMESTAMPTZ,
  horario_maximo TIMESTAMPTZ,
  horario_leitura TIMESTAMPTZ NOT NULL DEFAULT now(),
  status rq_status_leitura NOT NULL DEFAULT 'no_prazo',
  diferenca_segundos INTEGER DEFAULT 0,
  codigo_lido TEXT,
  dispositivo TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rq_leituras_exec ON rq_leituras(execucao_id);
CREATE INDEX idx_rq_leituras_func ON rq_leituras(funcionario_id);
CREATE INDEX idx_rq_leituras_horario ON rq_leituras(horario_leitura);

ALTER TABLE rq_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_leituras_admin_all" ON rq_leituras FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_leituras_func_select" ON rq_leituras FOR SELECT TO authenticated
  USING (funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_leituras_func_insert" ON rq_leituras FOR INSERT TO authenticated
  WITH CHECK (funcionario_id IN (
    SELECT f.id FROM funcionarios f WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_leituras_manager_select" ON rq_leituras FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()) AND execucao_id IN (
    SELECT e.id FROM rq_execucoes e WHERE e.empresa_id IN (
      SELECT me.empresa_id FROM manager_empresas me WHERE me.user_id = auth.uid()
    )
  ));

CREATE POLICY "rq_leituras_client_select" ON rq_leituras FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'client'::text) AND execucao_id IN (
    SELECT e.id FROM rq_execucoes e WHERE e.posto_trabalho_id IN (
      SELECT cp.posto_id FROM client_postos cp WHERE cp.user_id = auth.uid()
    )
  ));

-- ============================================================
-- 7. Ocorrências de Ronda
-- ============================================================
CREATE TABLE public.rq_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id UUID NOT NULL REFERENCES public.rq_execucoes(id) ON DELETE CASCADE,
  leitura_id UUID REFERENCES public.rq_leituras(id),
  tipo rq_tipo_ocorrencia NOT NULL,
  descricao TEXT NOT NULL,
  justificativa TEXT,
  resolvida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rq_ocorrencias_exec ON rq_ocorrencias(execucao_id);

ALTER TABLE rq_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_ocorrencias_admin_all" ON rq_ocorrencias FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_ocorrencias_func_select" ON rq_ocorrencias FOR SELECT TO authenticated
  USING (execucao_id IN (
    SELECT e.id FROM rq_execucoes e
    JOIN funcionarios f ON f.id = e.funcionario_id
    WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_ocorrencias_func_insert" ON rq_ocorrencias FOR INSERT TO authenticated
  WITH CHECK (execucao_id IN (
    SELECT e.id FROM rq_execucoes e
    JOIN funcionarios f ON f.id = e.funcionario_id
    WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "rq_ocorrencias_manager_select" ON rq_ocorrencias FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()) AND execucao_id IN (
    SELECT e.id FROM rq_execucoes e WHERE e.empresa_id IN (
      SELECT me.empresa_id FROM manager_empresas me WHERE me.user_id = auth.uid()
    )
  ));

-- ============================================================
-- 8. Audit Logs
-- ============================================================
CREATE TABLE public.rq_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  tabela TEXT,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip TEXT,
  dispositivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rq_audit_user ON rq_audit_logs(user_id);
CREATE INDEX idx_rq_audit_created ON rq_audit_logs(created_at);

ALTER TABLE rq_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_audit_admin_all" ON rq_audit_logs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "rq_audit_insert" ON rq_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger para updated_at
-- ============================================================
CREATE TRIGGER rq_pontos_updated_at BEFORE UPDATE ON rq_pontos_ronda
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER rq_rotas_updated_at BEFORE UPDATE ON rq_rotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER rq_execucoes_updated_at BEFORE UPDATE ON rq_execucoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
