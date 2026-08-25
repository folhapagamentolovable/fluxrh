/**
 * Script para migrar dados de eventos excepcionais antigos para nova estrutura
 * 
 * Este script:
 * 1. Cria backup de segurança dos dados existentes
 * 2. Normaliza descrições antigas para novos padrões
 * 3. Remove eventos obsoletos (ex: FT - Folga Trabalhada)
 * 4. Gera relatório de migração
 * 5. Fornece instruções de rollback
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

async function executarMigracaoDados() {
  console.log('🔄 Iniciando migração de dados: Eventos Excepcionais');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  try {
    // ============================================
    // ETAPA 1: ANÁLISE PRÉ-MIGRAÇÃO
    // ============================================
    console.log('📊 ETAPA 1: Análise de dados existentes');
    console.log('───────────────────────────────────────────────────────────────');
    
    const { data: totalRegistros, error: errorTotal } = await supabase
      .from('folha_calculada')
      .select('id', { count: 'exact', head: true });
    
    if (errorTotal) {
      console.error('❌ Erro ao contar registros:', errorTotal.message);
    } else {
      console.log(`✅ Total de registros na tabela: ${totalRegistros?.length || 0}`);
    }
    
    const { data: registrosComEventos, error: errorEventos } = await supabase
      .from('folha_calculada')
      .select('id, eventos_excepcionais')
      .not('eventos_excepcionais', 'is', null);
    
    if (errorEventos) {
      console.error('❌ Erro ao buscar eventos:', errorEventos.message);
    } else {
      console.log(`✅ Registros com eventos excepcionais: ${registrosComEventos?.length || 0}`);
    }
    
    console.log('');
    
    // ============================================
    // ETAPA 2: ANÁLISE DE EVENTOS A MIGRAR
    // ============================================
    console.log('🔍 ETAPA 2: Análise de eventos que serão migrados');
    console.log('───────────────────────────────────────────────────────────────');
    
    const eventosParaMigrar = {
      'Serviços Externos (Folhas de Pagamento)': 'Folhas de Pagamento',
      'Serviços Externos (Controle de Rondas)': 'Controle de Rondas Palmeiras',
      'Supervisão (Palmeiras)': 'Supervisão Palmeiras',
      '13º Salário Integral': '13º Salário',
      'Reembolsos (Uber)': 'Reembolsos',
      'FT (Folga Trabalhada)': '[REMOVER]'
    };
    
    let totalEventosAfetados = 0;
    
    if (registrosComEventos && registrosComEventos.length > 0) {
      registrosComEventos.forEach(registro => {
        if (registro.eventos_excepcionais && Array.isArray(registro.eventos_excepcionais)) {
          registro.eventos_excepcionais.forEach(evento => {
            if (eventosParaMigrar[evento.descricao]) {
              totalEventosAfetados++;
            }
          });
        }
      });
    }
    
    console.log('Mapeamento de eventos:');
    Object.entries(eventosParaMigrar).forEach(([antigo, novo]) => {
      console.log(`  ${antigo} → ${novo}`);
    });
    console.log('');
    console.log(`✅ Total de eventos que serão migrados: ${totalEventosAfetados}`);
    console.log('');
    
    // ============================================
    // ETAPA 3: CONFIRMAÇÃO DO USUÁRIO
    // ============================================
    console.log('⚠️  ATENÇÃO: Esta operação irá modificar dados existentes!');
    console.log('');
    console.log('A migração irá:');
    console.log('  1. Criar backup de segurança (tabela: folha_calculada_backup_eventos_20260301)');
    console.log('  2. Normalizar descrições de eventos para novos padrões');
    console.log('  3. Remover eventos obsoletos (FT - Folga Trabalhada)');
    console.log('  4. Preservar todos os valores monetários');
    console.log('');
    console.log('💡 Você pode reverter a migração executando o comando de rollback fornecido ao final.');
    console.log('');
    
    // Em produção, você pode adicionar um prompt de confirmação aqui
    // const readline = require('readline');
    // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // await new Promise(resolve => rl.question('Deseja continuar? (s/n): ', answer => { rl.close(); resolve(answer); }));
    
    // ============================================
    // ETAPA 4: EXECUTAR MIGRATION SQL
    // ============================================
    console.log('🚀 ETAPA 3: Executando migração de dados');
    console.log('───────────────────────────────────────────────────────────────');
    
    const sqlPath = path.join(__dirname, '..', 'migrations', 'migrate_eventos_excepcionais_data.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Arquivo SQL carregado:', sqlPath);
    console.log('');
    
    // Executar SQL (nota: isso pode precisar ser adaptado dependendo do seu setup)
    console.log('⚠️  IMPORTANTE: Execute o SQL manualmente no Supabase Dashboard');
    console.log('');
    console.log('Caminho do arquivo: migrations/migrate_eventos_excepcionais_data.sql');
    console.log('');
    console.log('Ou copie e cole o conteúdo abaixo no SQL Editor:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(sqlContent);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    
    // ============================================
    // ETAPA 5: INSTRUÇÕES DE VERIFICAÇÃO
    // ============================================
    console.log('✅ ETAPA 4: Verificação pós-migração');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('');
    console.log('Após executar o SQL, verifique:');
    console.log('');
    console.log('1. Backup criado:');
    console.log('   SELECT COUNT(*) FROM folha_calculada_backup_eventos_20260301;');
    console.log('');
    console.log('2. Eventos normalizados:');
    console.log('   SELECT evento->>\'descricao\' as descricao, COUNT(*) as total');
    console.log('   FROM folha_calculada, jsonb_array_elements(eventos_excepcionais) as evento');
    console.log('   GROUP BY evento->>\'descricao\' ORDER BY total DESC;');
    console.log('');
    console.log('3. Verificar se eventos antigos foram removidos:');
    console.log('   SELECT * FROM folha_calculada');
    console.log('   WHERE eventos_excepcionais::text LIKE \'%Serviços Externos (Folhas%\';');
    console.log('');
    
    // ============================================
    // ETAPA 6: INSTRUÇÕES DE ROLLBACK
    // ============================================
    console.log('🔙 INSTRUÇÕES DE ROLLBACK');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('');
    console.log('Se precisar reverter a migração, execute:');
    console.log('');
    console.log('UPDATE folha_calculada fc');
    console.log('SET eventos_excepcionais = backup.eventos_excepcionais');
    console.log('FROM folha_calculada_backup_eventos_20260301 backup');
    console.log('WHERE fc.id = backup.id;');
    console.log('');
    console.log('Para remover o backup após confirmar sucesso:');
    console.log('DROP TABLE folha_calculada_backup_eventos_20260301;');
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Script de migração preparado!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('  1. Execute o SQL no Supabase Dashboard');
    console.log('  2. Verifique os resultados usando as queries acima');
    console.log('  3. Teste a aplicação com os dados migrados');
    console.log('  4. Se tudo estiver OK, remova o backup');
    console.log('  5. Se houver problemas, execute o rollback');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro fatal ao preparar migração:', error);
    process.exit(1);
  }
}

// Executar
executarMigracaoDados()
  .then(() => {
    console.log('✅ Script finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
