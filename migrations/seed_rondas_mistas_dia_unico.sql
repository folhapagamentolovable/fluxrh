-- ============================================================
-- SEED: Ronda mista em um único dia (Robinson Marcelino Roque)
-- Posto: Residencial das Palmeiras  |  Data: 2026-04-15
--
-- Schema verificado em 2026-04-16:
--   • rq_status_leitura: no_prazo | adiantado | atrasado | fora_de_ordem | invalido | nao_realizado
--   • rq_status_execucao: pendente | em_andamento | concluida | incompleta | nao_realizada
--   • rondas_nao_conformidades.recomendacao_gerencial é NOT NULL
--   • rondas_nao_conformidades.descricao / nivel / tipo são NOT NULL
-- ============================================================

DO $$
DECLARE
  v_funcionario_id   UUID := '43e50b29-387c-49c7-b82e-22d40c826651';
  v_funcionario_nome TEXT := 'Robinson Marcelino Roque';
  v_posto_id         UUID := 'e1d1f461-b090-4c3d-90e4-a38e25aeb585';
  v_empresa_id       UUID;
  v_rota_id          UUID;
  v_data             DATE := '2026-04-16';
  v_pontos           UUID[];
  v_ciclo1 UUID; v_ciclo2 UUID; v_ciclo3 UUID; v_ciclo4 UUID; v_ciclo5 UUID;
  v_exec1 UUID;  v_exec2 UUID;  v_exec3 UUID;  v_exec4 UUID;  v_exec5 UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM funcionarios WHERE id = v_funcionario_id;

  SELECT ARRAY_AGG(id ORDER BY ordem)
    INTO v_pontos
    FROM (SELECT id, ordem FROM rq_pontos_ronda WHERE posto_trabalho_id = v_posto_id ORDER BY ordem LIMIT 5) sub;

  IF v_pontos IS NULL OR array_length(v_pontos, 1) < 5 THEN
    RAISE EXCEPTION 'Pontos insuficientes no posto. Execute primeiro o seed seed_rondas_4_dias_palmeiras.sql.';
  END IF;

  SELECT id INTO v_rota_id FROM rq_rotas WHERE posto_trabalho_id = v_posto_id LIMIT 1;
  IF v_rota_id IS NULL THEN
    RAISE EXCEPTION 'Rota não encontrada. Execute primeiro o seed inicial.';
  END IF;

  -- ── Limpar dados anteriores do dia (idempotente) ────────────
  DELETE FROM rondas_nao_conformidades
  WHERE funcionario_id = v_funcionario_id AND data_ronda = v_data;

  DELETE FROM rq_leituras WHERE execucao_id IN (
    SELECT e.id FROM rq_execucoes e
    JOIN rq_ciclos c ON c.id = e.ciclo_id
    WHERE c.rota_id = v_rota_id AND c.data_turno = v_data
  );
  DELETE FROM rq_execucoes WHERE ciclo_id IN (
    SELECT c.id FROM rq_ciclos c
    WHERE c.rota_id = v_rota_id AND c.data_turno = v_data
  );
  DELETE FROM rq_ciclos
  WHERE rota_id = v_rota_id AND data_turno = v_data;

  -- ── CICLO 1: 19:00 → 20:00 — TUDO NO PRAZO
  INSERT INTO rq_ciclos (id, rota_id, data_turno, hora_inicio, hora_fim, numero_ciclo, total_pontos)
  VALUES (gen_random_uuid(), v_rota_id, v_data, (v_data||' 19:00:00')::timestamptz, (v_data||' 20:00:00')::timestamptz, 1, 5)
  RETURNING id INTO v_ciclo1;

  v_exec1 := gen_random_uuid();
  INSERT INTO rq_execucoes (id, ciclo_id, funcionario_id, nome_funcionario, posto_trabalho_id, empresa_id, rota_id,
                            status, iniciada_em, finalizada_em, total_pontos_lidos, total_pontos_esperados)
  VALUES (v_exec1, v_ciclo1, v_funcionario_id, v_funcionario_nome, v_posto_id, v_empresa_id, v_rota_id, 'concluida',
          (v_data||' 19:00:00')::timestamptz, (v_data||' 20:00:00')::timestamptz, 5, 5);

  INSERT INTO rq_leituras (execucao_id, ponto_id, funcionario_id, nome_funcionario, ordem_esperada, ordem_lida,
                           horario_leitura, horario_previsto, status, diferenca_segundos) VALUES
    (v_exec1, v_pontos[1], v_funcionario_id, v_funcionario_nome, 0, 0, (v_data||' 19:00:00')::timestamptz, (v_data||' 19:00:00')::timestamptz, 'no_prazo', 0),
    (v_exec1, v_pontos[2], v_funcionario_id, v_funcionario_nome, 1, 1, (v_data||' 19:15:30')::timestamptz, (v_data||' 19:15:00')::timestamptz, 'no_prazo', 30),
    (v_exec1, v_pontos[3], v_funcionario_id, v_funcionario_nome, 2, 2, (v_data||' 19:30:00')::timestamptz, (v_data||' 19:30:00')::timestamptz, 'no_prazo', 0),
    (v_exec1, v_pontos[4], v_funcionario_id, v_funcionario_nome, 3, 3, (v_data||' 19:45:15')::timestamptz, (v_data||' 19:45:00')::timestamptz, 'no_prazo', 15),
    (v_exec1, v_pontos[5], v_funcionario_id, v_funcionario_nome, 4, 4, (v_data||' 20:00:00')::timestamptz, (v_data||' 20:00:00')::timestamptz, 'no_prazo', 0);

  -- ── CICLO 2: 20:30 → 21:30 — MISTO (no prazo + adiantado + atrasado)
  INSERT INTO rq_ciclos (id, rota_id, data_turno, hora_inicio, hora_fim, numero_ciclo, total_pontos)
  VALUES (gen_random_uuid(), v_rota_id, v_data, (v_data||' 20:30:00')::timestamptz, (v_data||' 21:30:00')::timestamptz, 2, 5)
  RETURNING id INTO v_ciclo2;

  v_exec2 := gen_random_uuid();
  INSERT INTO rq_execucoes (id, ciclo_id, funcionario_id, nome_funcionario, posto_trabalho_id, empresa_id, rota_id,
                            status, iniciada_em, finalizada_em, total_pontos_lidos, total_pontos_esperados)
  VALUES (v_exec2, v_ciclo2, v_funcionario_id, v_funcionario_nome, v_posto_id, v_empresa_id, v_rota_id, 'concluida',
          (v_data||' 20:30:00')::timestamptz, (v_data||' 21:35:00')::timestamptz, 5, 5);

  INSERT INTO rq_leituras (execucao_id, ponto_id, funcionario_id, nome_funcionario, ordem_esperada, ordem_lida,
                           horario_leitura, horario_previsto, status, diferenca_segundos) VALUES
    (v_exec2, v_pontos[1], v_funcionario_id, v_funcionario_nome, 0, 0, (v_data||' 20:30:00')::timestamptz, (v_data||' 20:30:00')::timestamptz, 'no_prazo',   0),
    (v_exec2, v_pontos[2], v_funcionario_id, v_funcionario_nome, 1, 1, (v_data||' 20:38:00')::timestamptz, (v_data||' 20:45:00')::timestamptz, 'adiantado', -420),
    (v_exec2, v_pontos[3], v_funcionario_id, v_funcionario_nome, 2, 2, (v_data||' 21:00:00')::timestamptz, (v_data||' 21:00:00')::timestamptz, 'no_prazo',   0),
    (v_exec2, v_pontos[4], v_funcionario_id, v_funcionario_nome, 3, 3, (v_data||' 21:23:00')::timestamptz, (v_data||' 21:15:00')::timestamptz, 'atrasado',   480),
    (v_exec2, v_pontos[5], v_funcionario_id, v_funcionario_nome, 4, 4, (v_data||' 21:35:00')::timestamptz, (v_data||' 21:30:00')::timestamptz, 'atrasado',   300);

  INSERT INTO rondas_nao_conformidades (sessao_id, funcionario_id, nome_funcionario, data_ronda, ciclo_numero, nivel, tipo, diferenca_minutos, descricao, ponto_nome, recomendacao_gerencial) VALUES
    (v_exec2, v_funcionario_id, v_funcionario_nome, v_data, 2, 'leve', 'atraso', 8, 'Atraso de 8 min no ponto 4 (ciclo 2)', 'Salão de Festas', 'Reforçar pontualidade no início do ciclo.'),
    (v_exec2, v_funcionario_id, v_funcionario_nome, v_data, 2, 'leve', 'atraso', 5, 'Atraso de 5 min no ponto 5 (ciclo 2)', 'Piscina/Lazer',  'Monitorar próximos ciclos e orientar verbalmente.');

  -- ── CICLO 3: 23:30 → 00:30 — 2 PONTOS NÃO REALIZADOS
  INSERT INTO rq_ciclos (id, rota_id, data_turno, hora_inicio, hora_fim, numero_ciclo, total_pontos)
  VALUES (gen_random_uuid(), v_rota_id, v_data, (v_data||' 23:30:00')::timestamptz, ((v_data+1)||' 00:30:00')::timestamptz, 3, 5)
  RETURNING id INTO v_ciclo3;

  v_exec3 := gen_random_uuid();
  INSERT INTO rq_execucoes (id, ciclo_id, funcionario_id, nome_funcionario, posto_trabalho_id, empresa_id, rota_id,
                            status, iniciada_em, finalizada_em, total_pontos_lidos, total_pontos_esperados)
  VALUES (v_exec3, v_ciclo3, v_funcionario_id, v_funcionario_nome, v_posto_id, v_empresa_id, v_rota_id, 'incompleta',
          (v_data||' 23:30:00')::timestamptz, ((v_data+1)||' 00:30:00')::timestamptz, 3, 5);

  -- Pontos não lidos (3 e 4) NÃO geram linha em rq_leituras (horario_leitura é NOT NULL).
  INSERT INTO rq_leituras (execucao_id, ponto_id, funcionario_id, nome_funcionario, ordem_esperada, ordem_lida,
                           horario_leitura, horario_previsto, status, diferenca_segundos) VALUES
    (v_exec3, v_pontos[1], v_funcionario_id, v_funcionario_nome, 0, 0, (v_data||' 23:30:00')::timestamptz,    (v_data||' 23:30:00')::timestamptz,    'no_prazo', 0),
    (v_exec3, v_pontos[2], v_funcionario_id, v_funcionario_nome, 1, 1, (v_data||' 23:45:00')::timestamptz,    (v_data||' 23:45:00')::timestamptz,    'no_prazo', 0),
    (v_exec3, v_pontos[5], v_funcionario_id, v_funcionario_nome, 4, 2, ((v_data+1)||' 00:30:00')::timestamptz,((v_data+1)||' 00:30:00')::timestamptz,'no_prazo', 0);

  INSERT INTO rondas_nao_conformidades (sessao_id, funcionario_id, nome_funcionario, data_ronda, ciclo_numero, nivel, tipo, descricao, ponto_nome, recomendacao_gerencial) VALUES
    (v_exec3, v_funcionario_id, v_funcionario_nome, v_data, 3, 'media', 'ausencia_leitura', 'Ponto 3 não lido no ciclo 3 (23:30-00:30)', 'Bloco B - Garagem', 'Verificar acesso ao ponto e instruir colaborador.'),
    (v_exec3, v_funcionario_id, v_funcionario_nome, v_data, 3, 'media', 'ausencia_leitura', 'Ponto 4 não lido no ciclo 3 (23:30-00:30)', 'Salão de Festas',   'Conferir leitor de QR e reforçar rota completa.');

  -- ── CICLO 4: 02:00 → 03:00 — RONDA NÃO REALIZADA
  INSERT INTO rq_ciclos (id, rota_id, data_turno, hora_inicio, hora_fim, numero_ciclo, total_pontos)
  VALUES (gen_random_uuid(), v_rota_id, v_data, ((v_data+1)||' 02:00:00')::timestamptz, ((v_data+1)||' 03:00:00')::timestamptz, 4, 5)
  RETURNING id INTO v_ciclo4;

  v_exec4 := gen_random_uuid();
  INSERT INTO rq_execucoes (id, ciclo_id, funcionario_id, nome_funcionario, posto_trabalho_id, empresa_id, rota_id,
                            status, iniciada_em, finalizada_em, total_pontos_lidos, total_pontos_esperados, observacoes)
  VALUES (v_exec4, v_ciclo4, v_funcionario_id, v_funcionario_nome, v_posto_id, v_empresa_id, v_rota_id, 'nao_realizada',
          ((v_data+1)||' 02:00:00')::timestamptz, ((v_data+1)||' 03:00:00')::timestamptz, 0, 5,
          'Ciclo 4 não executado — nenhum ponto lido');

  INSERT INTO rondas_nao_conformidades (sessao_id, funcionario_id, nome_funcionario, data_ronda, ciclo_numero, nivel, tipo, diferenca_minutos, descricao, ponto_nome, recomendacao_gerencial) VALUES
    (v_exec4, v_funcionario_id, v_funcionario_nome, v_data, 4, 'gravissima', 'ronda_nao_realizada', 60,
     'Ciclo 4 (02:00-03:00) não executado — nenhum ponto lido', 'Todos os pontos',
     'Investigar abandono de posto, auditar câmeras e aplicar medida disciplinar conforme política interna.');

  -- ── CICLO 5: 04:30 → 05:30 — atrasos crescentes + 1 não realizado
  INSERT INTO rq_ciclos (id, rota_id, data_turno, hora_inicio, hora_fim, numero_ciclo, total_pontos)
  VALUES (gen_random_uuid(), v_rota_id, v_data, ((v_data+1)||' 04:30:00')::timestamptz, ((v_data+1)||' 05:30:00')::timestamptz, 5, 5)
  RETURNING id INTO v_ciclo5;

  v_exec5 := gen_random_uuid();
  INSERT INTO rq_execucoes (id, ciclo_id, funcionario_id, nome_funcionario, posto_trabalho_id, empresa_id, rota_id,
                            status, iniciada_em, finalizada_em, total_pontos_lidos, total_pontos_esperados)
  VALUES (v_exec5, v_ciclo5, v_funcionario_id, v_funcionario_nome, v_posto_id, v_empresa_id, v_rota_id, 'incompleta',
          ((v_data+1)||' 04:30:00')::timestamptz, ((v_data+1)||' 05:48:00')::timestamptz, 4, 5);

  -- Ponto 3 não lido NÃO gera linha em rq_leituras.
  INSERT INTO rq_leituras (execucao_id, ponto_id, funcionario_id, nome_funcionario, ordem_esperada, ordem_lida,
                           horario_leitura, horario_previsto, status, diferenca_segundos) VALUES
    (v_exec5, v_pontos[1], v_funcionario_id, v_funcionario_nome, 0, 0, ((v_data+1)||' 04:34:00')::timestamptz, ((v_data+1)||' 04:30:00')::timestamptz, 'atrasado', 240),
    (v_exec5, v_pontos[2], v_funcionario_id, v_funcionario_nome, 1, 1, ((v_data+1)||' 04:53:00')::timestamptz, ((v_data+1)||' 04:45:00')::timestamptz, 'atrasado', 480),
    (v_exec5, v_pontos[4], v_funcionario_id, v_funcionario_nome, 3, 2, ((v_data+1)||' 05:28:00')::timestamptz, ((v_data+1)||' 05:15:00')::timestamptz, 'atrasado', 780),
    (v_exec5, v_pontos[5], v_funcionario_id, v_funcionario_nome, 4, 3, ((v_data+1)||' 05:48:00')::timestamptz, ((v_data+1)||' 05:30:00')::timestamptz, 'atrasado', 1080);

  INSERT INTO rondas_nao_conformidades (sessao_id, funcionario_id, nome_funcionario, data_ronda, ciclo_numero, nivel, tipo, diferenca_minutos, descricao, ponto_nome, recomendacao_gerencial) VALUES
    (v_exec5, v_funcionario_id, v_funcionario_nome, v_data, 5, 'media', 'ausencia_leitura', NULL, 'Ponto 3 não lido no ciclo 5 (04:30-05:30)', 'Bloco B - Garagem', 'Verificar fadiga do colaborador no fim do turno.'),
    (v_exec5, v_funcionario_id, v_funcionario_nome, v_data, 5, 'media', 'atraso',          13,   'Atraso de 13 min no ponto 4 (ciclo 5)',     'Salão de Festas',   'Orientar sobre gestão do tempo no fim do turno.'),
    (v_exec5, v_funcionario_id, v_funcionario_nome, v_data, 5, 'grave', 'atraso',          18,   'Atraso de 18 min no ponto 5 (ciclo 5)',     'Piscina/Lazer',     'Aplicar advertência verbal e revisar escala.');

  RAISE NOTICE 'Seed misto criado para % em %', v_funcionario_nome, v_data;
END $$;
