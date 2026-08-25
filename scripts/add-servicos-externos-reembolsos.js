/**
 * Script para adicionar campos de Serviços Externos e Reembolsos
 * 
 * Este script adiciona os novos campos necessários para suportar:
 * - Serviços Externos (Folhas de Pagamento, Controle de Rondas)
 * - Supervisão Palmeiras
 * - Folga Trabalhada
 * - Reembolsos
 * - 13º Salário (parcelas e vantagens)
 * - INSS 13º e Férias
 * - Adiantamentos
 * - Eventos excepcionais personalizados (JSON)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarMigration() {
  console.log('🚀 Iniciando migration: Adicionar Serviços Externos e Reembolsos');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add_servicos_externos_reembolsos.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Arquivo SQL carregado:', sqlPath);
    console.log('');
    
    // Dividir em comandos individuais
    const comandos = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    console.log(`📋 Total de comandos a executar: ${comandos.length}`);
    console.log('');
    
    // Executar cada comando
    let sucessos = 0;
    let erros = 0;
    
    for (let i = 0; i < comandos.length; i++) {
      const comando = comandos[i];
      
      // Extrair nome da coluna do comando ALTER TABLE
      let nomeColuna = 'N/A';
      const matchColuna = comando.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
      if (matchColuna) {
        nomeColuna = matchColuna[1];
      }
      
      console.log(`[${i + 1}/${comandos.length}] Executando: ${nomeColuna}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: comando + ';' });
        
        if (error) {
          // Ignorar erro se coluna já existe
          if (error.message && error.message.includes('already exists')) {
            console.log(`  ⚠️  Coluna já existe: ${nomeColuna}`);
            sucessos++;
          } else {
            console.error(`  ❌ Erro: ${error.message}`);
            erros++;
          }
        } else {
          console.log(`  ✅ Sucesso`);
          sucessos++;
        }
      } catch (err) {
        console.error(`  ❌ Exceção: ${err.message}`);
        erros++;
      }
      
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMO DA MIGRATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📋 Total: ${comandos.length}`);
    console.log('');
    
    if (erros === 0) {
      console.log('🎉 Migration concluída com sucesso!');
    } else {
      console.log('⚠️  Migration concluída com alguns erros. Verifique os logs acima.');
    }
    
    // Verificar colunas criadas
    console.log('');
    console.log('🔍 Verificando colunas criadas...');
    console.log('');
    
    const { data: colunas, error: erroVerificacao } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'folha_calculada')
      .in('column_name', [
        'servicos_externos_folhas_pagamento',
        'servicos_externos_controle_rondas',
        'supervisao_palmeiras',
        'folga_trabalhada',
        'reembolsos_uber',
        'decimo_terceiro_primeira_parcela',
        'decimo_terceiro_segunda_parcela',
        'decimo_terceiro_vantagens_primeira_parcela',
        'decimo_terceiro_vantagens_segunda_parcela',
        'decimo_terceiro_integral',
        'vantagens_13',
        'inss_13',
        'inss_ferias',
        'adiantamento_13_salario',
        'adiantamento_vantagens_13',
        'eventos_excepcionais'
      ])
      .order('column_name');
    
    if (erroVerificacao) {
      console.error('❌ Erro ao verificar colunas:', erroVerificacao.message);
    } else if (colunas && colunas.length > 0) {
      console.log('✅ Colunas encontradas:');
      colunas.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  Nenhuma coluna encontrada. Verifique se a migration foi executada corretamente.');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal ao executar migration:', error);
    process.exit(1);
  }
}

// Executar
executarMigration()
  .then(() => {
    console.log('');
    console.log('✅ Script finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
