// Script para aplicar a migração do campo 'demitido'
// Execute: node scripts/apply_demitido_migration.js

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Para obter __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do arquivo .env
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/"/g, '');
            }
        });
    } catch (error) {
        console.warn('⚠️ Não foi possível carregar .env:', error.message);
    }
}

// Carregar .env
loadEnv();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

try {
    console.log('🚀 Aplicando migração: add_demitido_column.sql');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, '../migrations/add_demitido_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migração
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
        console.error('❌ Erro ao executar migração:', error);
        process.exit(1);
    }
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('📋 Resultado:', data);
    
    // Verificar se a coluna foi criada
    const { data: columns, error: checkError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'funcionarios')
        .eq('column_name', 'demitido');
        
    if (checkError) {
        console.warn('⚠️ Não foi possível verificar a coluna:', checkError);
    } else if (columns && columns.length > 0) {
        console.log('✅ Coluna "demitido" criada com sucesso:', columns[0]);
    } else {
        console.warn('⚠️ Coluna "demitido" não encontrada após migração');
    }
    
} catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
}