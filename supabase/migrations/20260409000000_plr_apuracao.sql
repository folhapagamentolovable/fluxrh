-- Tabela de apuração de PLR por funcionário/semestre
CREATE TABLE IF NOT EXISTS public.plr_apuracao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    semestre INTEGER NOT NULL CHECK (semestre IN (1, 2)),
    meses_trabalhados NUMERIC(4,2) NOT NULL DEFAULT 0,
    faltas_justificadas INTEGER NOT NULL DEFAULT 0,
    faltas_injustificadas INTEGER NOT NULL DEFAULT 0,
    suspensoes INTEGER NOT NULL DEFAULT 0,
    advertencias INTEGER NOT NULL DEFAULT 0,
    valor_bruto NUMERIC(10,2) NOT NULL DEFAULT 0,
    desconto_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_final NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'calculado' CHECK (status IN ('calculado', 'aprovado', 'pago', 'cancelado')),
    data_pagamento_efetivo DATE,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (funcionario_id, ano, semestre)
);

-- RLS
ALTER TABLE public.plr_apuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins têm acesso total a plr_apuracao"
ON public.plr_apuracao FOR ALL
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Managers podem ver plr_apuracao"
ON public.plr_apuracao FOR SELECT
USING (is_manager(auth.uid()));
