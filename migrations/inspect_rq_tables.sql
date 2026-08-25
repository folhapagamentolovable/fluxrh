-- ============================================================
-- INSPEÇÃO DAS TABELAS rq_* 
-- Execute no Supabase SQL Editor ANTES de rodar o seed
-- ============================================================

-- 1. Colunas de todas as tabelas rq_*
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'rq_%'
ORDER BY table_name, ordinal_position;

-- 2. Chaves estrangeiras (FK) entre tabelas rq_*
SELECT
    tc.table_name AS tabela_origem,
    kcu.column_name AS coluna_fk,
    ccu.table_name AS tabela_destino,
    ccu.column_name AS coluna_destino
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'rq_%'
ORDER BY tc.table_name, kcu.column_name;

-- 3. ENUMs usados pelas tabelas rq_*
SELECT
    t.typname AS enum_name,
    e.enumlabel AS valor
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE 'rq_%'
ORDER BY t.typname, e.enumsortorder;

-- 4. Índices das tabelas rq_*
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'rq_%'
ORDER BY tablename, indexname;
