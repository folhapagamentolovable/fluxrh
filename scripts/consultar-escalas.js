// Script para consultar todas as escalas existentes no sistema
const { createClient } = require('@supabase/supabase-js');

// Configurar Supabase (substitua pelas suas credenciais)
const supabaseUrl = 'https://ixqjqjqjqjqjqjqj.supabase.co'; // Placeholder
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Placeholder

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function consultarEscalas() {
  try {
    console.log('🔍 Consultando todas as escalas cadastradas...\n');
    
    // Buscar todas as escalas
    const { data: escalas, error } = await supabase
      .from('regras_escalas')
      .select('*')
      .order('codigo_escala');
    
    if (error) {
      console.error('❌ Erro ao consultar escalas:', error);
      return;
    }
    
    if (!escalas || escalas.length === 0) {
      console.log('⚠️ Nenhuma escala encontrada no sistema');
      return;
    }
    
    console.log(`📊 Total de escalas encontradas: ${escalas.length}\n`);
    
    // Analisar cada escala
    escalas.forEach((escala, index) => {
      console.log(`${index + 1}. 📋 ESCALA: ${escala.codigo_escala}`);
      console.log(`   Nome: ${escala.nome_escala}`);
      console.log(`   Ativa: ${escala.ativa ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   Turno: ${escala.turno || 'Não especificado'}`);
      console.log(`   Data Vigência: ${escala.data_vigencia || 'Não especificada'}`);
      
      // Verificar dias de trabalho
      const diasTrabalho = [];
      if (escala.trabalha_segunda) diasTrabalho.push('SEG');
      if (escala.trabalha_terca) diasTrabalho.push('TER');
      if (escala.trabalha_quarta) diasTrabalho.push('QUA');
      if (escala.trabalha_quinta) diasTrabalho.push('QUI');
      if (escala.trabalha_sexta) diasTrabalho.push('SEX');
      if (escala.trabalha_sabado) diasTrabalho.push('SAB');
      if (escala.trabalha_domingo) diasTrabalho.push('DOM');
      if (escala.trabalha_feriado) diasTrabalho.push('FERIADO');
      
      console.log(`   Dias de Trabalho: ${diasTrabalho.join(', ') || 'Nenhum especificado'}`);
      
      // Analisar horários
      const horarios = {
        segunda: escala.horarios_segunda,
        terca: escala.horarios_terca,
        quarta: escala.horarios_quarta,
        quinta: escala.horarios_quinta,
        sexta: escala.horarios_sexta,
        sabado: escala.horarios_sabado,
        domingo: escala.horarios_domingo,
        feriado: escala.horarios_feriado
      };
      
      // Calcular jornada baseada nos horários
      let jornadaCalculada = null;
      
      // Tentar calcular da segunda-feira (dia mais comum)
      if (horarios.segunda) {
        try {
          const h = typeof horarios.segunda === 'string' ? JSON.parse(horarios.segunda) : horarios.segunda;
          if (h.entrada && h.saida) {
            const entrada = h.entrada.split(':').map(Number);
            const saida = h.saida.split(':').map(Number);
            const inicioAlmoco = h.inicio_almoco ? h.inicio_almoco.split(':').map(Number) : null;
            const terminoAlmoco = h.termino_almoco ? h.termino_almoco.split(':').map(Number) : null;
            
            let minutosEntrada = entrada[0] * 60 + entrada[1];
            let minutosSaida = saida[0] * 60 + saida[1];
            
            // Ajustar se passou da meia-noite
            if (minutosSaida < minutosEntrada) {
              minutosSaida += 24 * 60;
            }
            
            let jornadaMinutos = minutosSaida - minutosEntrada;
            
            // Descontar almoço se houver
            if (inicioAlmoco && terminoAlmoco) {
              const minutosAlmoco = (terminoAlmoco[0] * 60 + terminoAlmoco[1]) - (inicioAlmoco[0] * 60 + inicioAlmoco[1]);
              jornadaMinutos -= minutosAlmoco;
            }
            
            jornadaCalculada = jornadaMinutos / 60;
          }
        } catch (e) {
          console.log(`   ⚠️ Erro ao calcular jornada: ${e.message}`);
        }
      }
      
      console.log(`   Jornada Calculada: ${jornadaCalculada ? jornadaCalculada.toFixed(1) + 'h' : 'Não calculável'}`);
      
      // Mostrar horários detalhados
      Object.entries(horarios).forEach(([dia, horario]) => {
        if (horario) {
          try {
            const h = typeof horario === 'string' ? JSON.parse(horario) : horario;
            console.log(`   ${dia.toUpperCase()}: ${h.entrada || '--'} às ${h.saida || '--'} (almoço: ${h.inicio_almoco || '--'} às ${h.termino_almoco || '--'})`);
          } catch (e) {
            console.log(`   ${dia.toUpperCase()}: Formato inválido`);
          }
        }
      });
      
      if (escala.observacoes) {
        console.log(`   Observações: ${escala.observacoes}`);
      }
      
      console.log(''); // Linha em branco
    });
    
    // Resumo por jornada
    console.log('📈 RESUMO POR JORNADA:');
    const resumoJornadas = {};
    
    escalas.forEach(escala => {
      if (!escala.ativa) return;
      
      let jornada = 'Não calculável';
      
      if (escala.horarios_segunda) {
        try {
          const h = typeof escala.horarios_segunda === 'string' ? JSON.parse(escala.horarios_segunda) : escala.horarios_segunda;
          if (h.entrada && h.saida) {
            const entrada = h.entrada.split(':').map(Number);
            const saida = h.saida.split(':').map(Number);
            const inicioAlmoco = h.inicio_almoco ? h.inicio_almoco.split(':').map(Number) : null;
            const terminoAlmoco = h.termino_almoco ? h.termino_almoco.split(':').map(Number) : null;
            
            let minutosEntrada = entrada[0] * 60 + entrada[1];
            let minutosSaida = saida[0] * 60 + saida[1];
            
            if (minutosSaida < minutosEntrada) {
              minutosSaida += 24 * 60;
            }
            
            let jornadaMinutos = minutosSaida - minutosEntrada;
            
            if (inicioAlmoco && terminoAlmoco) {
              const minutosAlmoco = (terminoAlmoco[0] * 60 + terminoAlmoco[1]) - (inicioAlmoco[0] * 60 + inicioAlmoco[1]);
              jornadaMinutos -= minutosAlmoco;
            }
            
            const jornadaHoras = jornadaMinutos / 60;
            jornada = `${jornadaHoras.toFixed(1)}h`;
          }
        } catch (e) {
          // Manter como 'Não calculável'
        }
      }
      
      if (!resumoJornadas[jornada]) {
        resumoJornadas[jornada] = [];
      }
      resumoJornadas[jornada].push(escala.codigo_escala);
    });
    
    Object.entries(resumoJornadas).forEach(([jornada, escalas]) => {
      console.log(`   ${jornada}: ${escalas.join(', ')} (${escalas.length} escala${escalas.length > 1 ? 's' : ''})`);
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar consulta
consultarEscalas();