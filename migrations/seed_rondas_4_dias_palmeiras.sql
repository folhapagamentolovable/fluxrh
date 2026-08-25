-- ============================================================
-- SEED: 4 Dias de Rondas — Residencial das Palmeiras
-- ============================================================
DO $$
DECLARE
  func_ids   UUID[];
  func1_id   UUID; func2_id UUID; func3_id UUID; func4_id UUID;
  ponto_ids  UUID[];
  p_pai UUID; p1 UUID; p2 UUID; p3 UUID; p4 UUID;
  v_rota_id  UUID;
  v_posto_id UUID;
  v_emp_id   UUID;
  ciclo1_id UUID; ciclo2_id UUID; ciclo3_id UUID; ciclo4_id UUID;
  sess1 UUID; sess2 UUID; sess3 UUID; sess4 UUID;
  d1 TIMESTAMP := '2026-04-14 00:00:00';
  d2 TIMESTAMP := '2026-04-15 00:00:00';
  d3 TIMESTAMP := '2026-04-16 00:00:00';
  d4 TIMESTAMP := '2026-04-17 00:00:00';
BEGIN

  -- 1. Posto
  SELECT pt.id, pt.empresa_id INTO v_posto_id, v_emp_id
  FROM postos_trabalho pt
  WHERE pt.nome_posto ILIKE '%Palmeiras%'
    AND (pt.local_area IS NULL OR pt.local_area = '')
    AND (pt.ativo IS NULL OR pt.ativo = true)
  LIMIT 1;
  IF v_posto_id IS NULL THEN RAISE EXCEPTION 'Posto nao encontrado'; END IF;
  RAISE NOTICE 'Posto: %', v_posto_id;

  -- 2. Funcionarios com ronda=true
  SELECT array_agg(f.id ORDER BY f.nome_completo) INTO func_ids
  FROM (
    SELECT id, nome_completo FROM funcionarios
    WHERE posto_trabalho_id = v_posto_id AND ronda = true
      AND ativo = true AND demitido = false LIMIT 4
  ) f;
  IF func_ids IS NULL OR array_length(func_ids,1) < 4 THEN
    RAISE EXCEPTION 'Necessario 4 funcionarios com ronda=true. Encontrados: %',
      COALESCE(array_length(func_ids,1),0);
  END IF;
  func1_id := func_ids[1]; func2_id := func_ids[2];
  func3_id := func_ids[3]; func4_id := func_ids[4];
  RAISE NOTICE 'Funcs: %, %, %, %', func1_id, func2_id, func3_id, func4_id;

  -- 3. Rota
  SELECT r.id INTO v_rota_id FROM rq_rotas r
  WHERE r.posto_trabalho_id = v_posto_id AND r.ativo = true LIMIT 1;
  IF v_rota_id IS NULL THEN
    INSERT INTO rq_rotas (posto_trabalho_id, nome, hora_inicio, hora_fim,
      intervalo_pontos_minutos, tolerancia_minutos, dias_semana, ativo)
    VALUES (v_posto_id, 'Ronda Noturna Palmeiras', '19:00', '06:00', 30, 10,
      ARRAY['seg','ter','qua','qui','sex','sab','dom'], true)
    RETURNING id INTO v_rota_id;
  END IF;
  RAISE NOTICE 'Rota: %', v_rota_id;

  -- 4. Pontos
  SELECT array_agg(p.id ORDER BY p.ordem) INTO ponto_ids
  FROM rq_pontos_ronda p
  WHERE p.posto_trabalho_id = v_posto_id AND p.ativo = true LIMIT 5;
  IF ponto_ids IS NULL OR array_length(ponto_ids,1) < 5 THEN
    INSERT INTO rq_pontos_ronda (posto_trabalho_id, nome, codigo, tipo, ordem, ativo) VALUES
      (v_posto_id,'Portaria Principal','PALM-PAI-01','pai',  1,true),
      (v_posto_id,'Bloco A',           'PALM-P01',  'filho',2,true),
      (v_posto_id,'Bloco B',           'PALM-P02',  'filho',3,true),
      (v_posto_id,'Piscina',           'PALM-P03',  'filho',4,true),
      (v_posto_id,'Estacionamento',    'PALM-P04',  'filho',5,true)
    ON CONFLICT (posto_trabalho_id, codigo) DO NOTHING;
    SELECT array_agg(p.id ORDER BY p.ordem) INTO ponto_ids
    FROM rq_pontos_ronda p
    WHERE p.posto_trabalho_id = v_posto_id AND p.ativo = true LIMIT 5;
  END IF;
  p_pai:=ponto_ids[1]; p1:=ponto_ids[2]; p2:=ponto_ids[3];
  p3:=ponto_ids[4]; p4:=ponto_ids[5];
  RAISE NOTICE 'Pontos OK';

  -- 5. Limpar seed anterior
  DELETE FROM rq_leituras WHERE execucao_id IN (
    SELECT e.id FROM rq_execucoes e JOIN rq_ciclos c ON c.id=e.ciclo_id
    WHERE c.rota_id=v_rota_id AND c.data_turno BETWEEN '2026-04-14' AND '2026-04-17');
  DELETE FROM rq_execucoes WHERE ciclo_id IN (
    SELECT c.id FROM rq_ciclos c
    WHERE c.rota_id=v_rota_id AND c.data_turno BETWEEN '2026-04-14' AND '2026-04-17');
  DELETE FROM rq_ciclos
  WHERE rota_id=v_rota_id AND data_turno BETWEEN '2026-04-14' AND '2026-04-17';

  -- 6. Ciclos
  INSERT INTO rq_ciclos (rota_id,data_turno,hora_inicio,hora_fim,numero_ciclo,total_pontos)
  VALUES (v_rota_id,'2026-04-14', d1+INTERVAL'19 hours', d1+INTERVAL'1 day 6 hours', 1, 5)
  RETURNING id INTO ciclo1_id;

  INSERT INTO rq_ciclos (rota_id,data_turno,hora_inicio,hora_fim,numero_ciclo,total_pontos)
  VALUES (v_rota_id,'2026-04-15', d2+INTERVAL'19 hours', d2+INTERVAL'1 day 6 hours', 1, 5)
  RETURNING id INTO ciclo2_id;

  INSERT INTO rq_ciclos (rota_id,data_turno,hora_inicio,hora_fim,numero_ciclo,total_pontos)
  VALUES (v_rota_id,'2026-04-16', d3+INTERVAL'19 hours', d3+INTERVAL'1 day 6 hours', 1, 5)
  RETURNING id INTO ciclo3_id;

  INSERT INTO rq_ciclos (rota_id,data_turno,hora_inicio,hora_fim,numero_ciclo,total_pontos)
  VALUES (v_rota_id,'2026-04-17', d4+INTERVAL'19 hours', d4+INTERVAL'1 day 6 hours', 1, 5)
  RETURNING id INTO ciclo4_id;

  RAISE NOTICE 'Ciclos: %, %, %, %', ciclo1_id, ciclo2_id, ciclo3_id, ciclo4_id;

  -- ===========================================================
  -- DIA 1: Tudo no prazo
  -- ===========================================================
  INSERT INTO rq_execucoes (ciclo_id,funcionario_id,rota_id,posto_trabalho_id,empresa_id,
    status,iniciada_em,finalizada_em,total_pontos_lidos,total_pontos_esperados,nome_funcionario)
  SELECT ciclo1_id,func1_id,v_rota_id,v_posto_id,v_emp_id,
    'concluida'::rq_status_execucao,
    d1+INTERVAL'19 hours', d1+INTERVAL'21 hours 35 minutes',
    5,5,nome_completo FROM funcionarios WHERE id=func1_id
  RETURNING id INTO sess1;

  INSERT INTO rq_leituras (execucao_id,ponto_id,funcionario_id,ordem_esperada,ordem_lida,
    horario_previsto,horario_leitura,status,diferenca_segundos,nome_funcionario)
  SELECT v.eid,v.pid,v.fid,v.oe,v.ol,v.hp,v.hl,v.st::rq_status_leitura,v.ds,f.nome_completo
  FROM (VALUES
    (sess1,p_pai,func1_id,1,1, d1+INTERVAL'19 hours',           d1+INTERVAL'19 hours',           'no_prazo',    0),
    (sess1,p1,  func1_id,2,2, d1+INTERVAL'19 hours 30 minutes', d1+INTERVAL'19 hours 31 minutes','no_prazo',   60),
    (sess1,p2,  func1_id,3,3, d1+INTERVAL'20 hours 1 minutes',  d1+INTERVAL'20 hours 3 minutes', 'no_prazo',  120),
    (sess1,p3,  func1_id,4,4, d1+INTERVAL'20 hours 33 minutes', d1+INTERVAL'20 hours 34 minutes','no_prazo',   60),
    (sess1,p4,  func1_id,5,5, d1+INTERVAL'21 hours 4 minutes',  d1+INTERVAL'21 hours 5 minutes', 'no_prazo',   60)
  ) AS v(eid,pid,fid,oe,ol,hp,hl,st,ds)
  CROSS JOIN funcionarios f WHERE f.id=func1_id;
  RAISE NOTICE 'Dia 1 OK: %', sess1;

  -- ===========================================================
  -- DIA 2: Atrasos — P1 +20min, P3 +35min
  -- ===========================================================
  INSERT INTO rq_execucoes (ciclo_id,funcionario_id,rota_id,posto_trabalho_id,empresa_id,
    status,iniciada_em,finalizada_em,total_pontos_lidos,total_pontos_esperados,nome_funcionario)
  SELECT ciclo2_id,func2_id,v_rota_id,v_posto_id,v_emp_id,
    'concluida'::rq_status_execucao,
    d2+INTERVAL'19 hours', d2+INTERVAL'22 hours 25 minutes',
    5,5,nome_completo FROM funcionarios WHERE id=func2_id
  RETURNING id INTO sess2;

  INSERT INTO rq_leituras (execucao_id,ponto_id,funcionario_id,ordem_esperada,ordem_lida,
    horario_previsto,horario_leitura,status,diferenca_segundos,nome_funcionario)
  SELECT v.eid,v.pid,v.fid,v.oe,v.ol,v.hp,v.hl,v.st::rq_status_leitura,v.ds,f.nome_completo
  FROM (VALUES
    (sess2,p_pai,func2_id,1,1, d2+INTERVAL'19 hours',           d2+INTERVAL'19 hours',           'no_prazo',     0),
    (sess2,p1,  func2_id,2,2, d2+INTERVAL'19 hours 30 minutes', d2+INTERVAL'19 hours 50 minutes','atrasado',  1200),
    (sess2,p2,  func2_id,3,3, d2+INTERVAL'20 hours 20 minutes', d2+INTERVAL'20 hours 22 minutes','no_prazo',   120),
    (sess2,p3,  func2_id,4,4, d2+INTERVAL'20 hours 52 minutes', d2+INTERVAL'21 hours 27 minutes','atrasado',  2100),
    (sess2,p4,  func2_id,5,5, d2+INTERVAL'21 hours 57 minutes', d2+INTERVAL'21 hours 59 minutes','no_prazo',   120)
  ) AS v(eid,pid,fid,oe,ol,hp,hl,st,ds)
  CROSS JOIN funcionarios f WHERE f.id=func2_id;
  RAISE NOTICE 'Dia 2 OK: %', sess2;

  -- ===========================================================
  -- DIA 3: Antecipacoes + P3 nao lido
  -- ===========================================================
  INSERT INTO rq_execucoes (ciclo_id,funcionario_id,rota_id,posto_trabalho_id,empresa_id,
    status,iniciada_em,finalizada_em,total_pontos_lidos,total_pontos_esperados,nome_funcionario)
  SELECT ciclo3_id,func3_id,v_rota_id,v_posto_id,v_emp_id,
    'em_andamento'::rq_status_execucao,
    d3+INTERVAL'19 hours', d3+INTERVAL'21 hours 20 minutes',
    4,5,nome_completo FROM funcionarios WHERE id=func3_id
  RETURNING id INTO sess3;

  INSERT INTO rq_leituras (execucao_id,ponto_id,funcionario_id,ordem_esperada,ordem_lida,
    horario_previsto,horario_leitura,status,diferenca_segundos,nome_funcionario)
  SELECT v.eid,v.pid,v.fid,v.oe,v.ol,v.hp,v.hl,v.st::rq_status_leitura,v.ds,f.nome_completo
  FROM (VALUES
    (sess3,p_pai,func3_id,1,1, d3+INTERVAL'19 hours',           d3+INTERVAL'19 hours',           'no_prazo',    0),
    (sess3,p1,  func3_id,2,2, d3+INTERVAL'19 hours 30 minutes', d3+INTERVAL'19 hours 31 minutes','no_prazo',   60),
    (sess3,p2,  func3_id,3,3, d3+INTERVAL'20 hours 1 minutes',  d3+INTERVAL'19 hours 49 minutes','adiantado', -720),
    (sess3,p3,  func3_id,4,4, d3+INTERVAL'20 hours 19 minutes', d3+INTERVAL'20 hours 19 minutes','nao_realizado', 0),
    (sess3,p4,  func3_id,5,5, d3+INTERVAL'20 hours 49 minutes', d3+INTERVAL'20 hours 41 minutes','adiantado', -480)
  ) AS v(eid,pid,fid,oe,ol,hp,hl,st,ds)
  CROSS JOIN funcionarios f WHERE f.id=func3_id;
  RAISE NOTICE 'Dia 3 OK: %', sess3;

  -- ===========================================================
  -- DIA 4: Ronda abandonada
  -- ===========================================================
  INSERT INTO rq_execucoes (ciclo_id,funcionario_id,rota_id,posto_trabalho_id,empresa_id,
    status,iniciada_em,finalizada_em,total_pontos_lidos,total_pontos_esperados,nome_funcionario)
  SELECT ciclo4_id,func4_id,v_rota_id,v_posto_id,v_emp_id,
    'em_andamento'::rq_status_execucao,
    d4+INTERVAL'19 hours', d4+INTERVAL'19 hours 45 minutes',
    2,5,nome_completo FROM funcionarios WHERE id=func4_id
  RETURNING id INTO sess4;

  INSERT INTO rq_leituras (execucao_id,ponto_id,funcionario_id,ordem_esperada,ordem_lida,
    horario_previsto,horario_leitura,status,diferenca_segundos,nome_funcionario)
  SELECT v.eid,v.pid,v.fid,v.oe,v.ol,v.hp,v.hl,v.st::rq_status_leitura,v.ds,f.nome_completo
  FROM (VALUES
    (sess4,p_pai,func4_id,1,1,    d4+INTERVAL'19 hours',           d4+INTERVAL'19 hours',           'no_prazo',      0),
    (sess4,p1,  func4_id,2,2,    d4+INTERVAL'19 hours 30 minutes', d4+INTERVAL'19 hours 43 minutes','atrasado',    780),
    (sess4,p2,  func4_id,3,NULL, d4+INTERVAL'20 hours 13 minutes', d4+INTERVAL'20 hours 13 minutes','nao_realizado', 0),
    (sess4,p3,  func4_id,4,NULL, d4+INTERVAL'20 hours 43 minutes', d4+INTERVAL'20 hours 43 minutes','nao_realizado', 0),
    (sess4,p4,  func4_id,5,NULL, d4+INTERVAL'21 hours 13 minutes', d4+INTERVAL'21 hours 13 minutes','nao_realizado', 0)
  ) AS v(eid,pid,fid,oe,ol,hp,hl,st,ds)
  CROSS JOIN funcionarios f WHERE f.id=func4_id;
  RAISE NOTICE 'Dia 4 OK: %', sess4;

  RAISE NOTICE '=== SEED CONCLUIDO ===';
END $$;

-- Verificacao
SELECT
  c.data_turno,
  f.nome_completo,
  e.status,
  e.total_pontos_lidos || '/' || e.total_pontos_esperados AS pontos,
  COUNT(l.id) FILTER (WHERE l.status='no_prazo')       AS prazo,
  COUNT(l.id) FILTER (WHERE l.status='atrasado')       AS atrasados,
  COUNT(l.id) FILTER (WHERE l.status='adiantado')      AS antecipados,
  COUNT(l.id) FILTER (WHERE l.status='nao_realizado')  AS nao_realizados
FROM rq_execucoes e
JOIN rq_ciclos c    ON c.id=e.ciclo_id
JOIN funcionarios f ON f.id=e.funcionario_id
LEFT JOIN rq_leituras l ON l.execucao_id=e.id
WHERE c.data_turno BETWEEN '2026-04-14' AND '2026-04-17'
GROUP BY c.data_turno, f.nome_completo, e.status,
         e.total_pontos_lidos, e.total_pontos_esperados
ORDER BY c.data_turno;
