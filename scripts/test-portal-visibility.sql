-- Script para testar a configuração de visibilidade do portal

-- Verificar se a tabela existe
SELECT 
    table_name, 
    table_schema 
FROM information_schema.tables 
WHERE table_name = 'portal_visibility_config';

-- Verificar dados na tabela
SELECT * FROM portal_visibility_config ORDER BY tipo_documento;

-- Verificar se a função existe
SELECT 
    routine_name, 
    routine_type 
FROM information_schema.routines 
WHERE routine_name = 'update_updated_at_column';

-- Verificar se o trigger existe
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'update_portal_visibility_config_updated_at';

-- Testar uma atualização
UPDATE portal_visibility_config 
SET observacoes = 'Teste de atualização - ' || NOW()::text 
WHERE tipo_documento = 'holerites';

-- Verificar se o updated_at foi atualizado
SELECT 
    tipo_documento, 
    mes_limite, 
    ano_limite, 
    meses_retroativos, 
    ativo, 
    created_at, 
    updated_at 
FROM portal_visibility_config 
ORDER BY tipo_documento;