// Teste completo de geração de escala GALLIMPT1 para verificar se a correção está funcionando

console.log('🧪 TESTE COMPLETO: Geração de Escala GALLIMPT1');
console.log('═══════════════════════════════════════════════════════════');

// Simular regra visual corrigida (como deve estar na interface)
const regraVisualCorrigida = {
    codigo_escala: 'GALLIMPT1',
    nome_escala: 'Auxiliar de Limpeza Galleria T1',
    turno: 'DIURNO',
    data_vigencia: '2024-01-01',
    trabalha_segunda: true,
    trabalha_terca: true,
    trabalha_quarta: true,
    trabalha_quinta: true,
    trabalha_sexta: true,
    trabalha_sabado: true,
    trabalha_domingo: false,
    trabalha_feriado: false,
    tipo_alternancia: 'SEM ALTERNÂNCIA', // ✅ CORRIGIDO
    horarios_segunda: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '13:00', saida: '17:00' },
    horarios_terca: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '13:00', saida: '17:00' },
    horarios_quarta: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '13:00', saida: '17:00' },
    horarios_quinta: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '13:00', saida: '17:00' },
    horarios_sexta: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '13:00', saida: '17:00' },
    horarios_sabado: { entrada: '08:00', inicio_almoco: '12:00', termino_almoco: '12:00', saida: '12:00' },
    horarios_domingo: { entrada: '', inicio_almoco: '', termino_almoco: '', saida: '' },
    horarios_feriado: { entrada: '', inicio_almoco: '', termino_almoco: '', saida: '' }
};

// Função de conversão (copiada do arquivo corrigido)
function converterRegraVisualParaJSON(regraVisual) {
    let tipo = 'PADRAO';
    let alternancia = null;

    if (regraVisual.tipo_alternancia.startsWith('DIAS_ALTERNADOS')) {
        tipo = 'ALTERNANCIA_12X36';
        alternancia = {
            vigencia: regraVisual.data_vigencia,
            turma: regraVisual.tipo_alternancia === 'DIAS_ALTERNADOS_T1' ? 'T1' : 'T2',
            trabalha_primeiro_dia: regraVisual.tipo_alternancia === 'DIAS_ALTERNADOS_T1'
        };
    } else if (regraVisual.tipo_alternancia.startsWith('SABADOS_ALTERNADOS')) {
        tipo = 'SABADOS_ALTERNADOS';
        alternancia = {
            vigencia: regraVisual.data_vigencia,
            turma: regraVisual.tipo_alternancia === 'SABADOS_ALTERNADOS_T1' ? 'T1' : 'T2',
            trabalha_primeiro_sabado: regraVisual.tipo_alternancia === 'SABADOS_ALTERNADOS_T1'
        };
    } else if (regraVisual.tipo_alternancia === 'NENHUMA' || 
               regraVisual.tipo_alternancia === 'Escala Fixa (sem alternância)' ||
               regraVisual.tipo_alternancia === 'SEM_ALTERNANCIA' ||
               regraVisual.tipo_alternancia === 'SEM ALTERNÂNCIA') {
        // Escala fixa - sem alternância
        tipo = 'PADRAO';
    } else if (!regraVisual.trabalha_domingo || !regraVisual.trabalha_feriado) {
        tipo = 'SEM_DOMINGO_FERIADO';
    }

    // Converter horários
    function converterHorarios(horarios) {
        if (!horarios.entrada || !horarios.saida) {
            return null;
        }
        const temIntrajornada = horarios.inicio_almoco !== horarios.termino_almoco;
        return {
            entrada: horarios.entrada,
            saida: horarios.saida,
            refeicao: temIntrajornada ? {
                inicio: horarios.inicio_almoco,
                fim: horarios.termino_almoco
            } : null
        };
    }

    const horarios = {
        util: converterHorarios(regraVisual.horarios_segunda),
        sabado: converterHorarios(regraVisual.horarios_sabado),
        domingo: converterHorarios(regraVisual.horarios_domingo),
        feriado: converterHorarios(regraVisual.horarios_feriado)
    };

    const regrasJSON = {
        tipo,
        trabalha_domingo: regraVisual.trabalha_domingo,
        trabalha_feriado: regraVisual.trabalha_feriado,
        horarios
    };

    if (alternancia) {
        regrasJSON.alternancia = alternancia;
    }

    return regrasJSON;
}

// Função de interpretação (simplificada)
function interpretarRegraEscala(regraEscala, dia, mes, ano, diaSemana, ehFeriado) {
    if (!regraEscala || typeof regraEscala !== 'object') {
        return null;
    }
    
    const regra = regraEscala;
    let trabalhaHoje = true;
    
    const isDomingo = diaSemana === 'Dom';
    
    // Se é domingo e não trabalha domingo, é folga
    if (isDomingo && !regra.trabalha_domingo) {
        trabalhaHoje = false;
    }
    
    // Se é feriado e não trabalha feriado, é folga
    if (ehFeriado && !regra.trabalha_feriado) {
        trabalhaHoje = false;
    }
    
    // Para escalas com sábados alternados, verificar apenas nos sábados
    if (regra.tipo === 'SABADOS_ALTERNADOS' && regra.alternancia && trabalhaHoje && diaSemana === 'Sáb') {
        const alt = regra.alternancia;
        console.log(`📅 Sábado Alternado - Dia ${dia}/${mes}/${ano}:`, {
            vigencia: alt.vigencia,
            turma: alt.turma,
            trabalha_primeiro: alt.trabalha_primeiro_sabado
        });
        // Aqui seria calculado se trabalha ou não baseado na alternância
        // Para este teste, vamos simular que não trabalha em sábados alternados
        trabalhaHoje = false;
        console.log(`   → Trabalha? ${trabalhaHoje}`);
    }
    
    // Se não trabalha, retornar folga
    if (!trabalhaHoje) {
        return {
            trabalha: false,
            folga: true,
            horarios: { entrada: '', saida: '', inicio_refeicao: '', termino_refeicao: '' }
        };
    }
    
    // Determinar tipo de dia para buscar horários
    let tipoDia = 'util';
    if (ehFeriado) {
        tipoDia = 'feriado';
    } else if (isDomingo) {
        tipoDia = 'domingo';
    } else if (diaSemana === 'Sáb') {
        tipoDia = 'sabado';
    }
    
    // Buscar horários configurados
    const horarioConfig = regra.horarios[tipoDia];
    
    // Se não tem horários configurados para este tipo de dia, é folga
    if (!horarioConfig || !horarioConfig.entrada || !horarioConfig.saida) {
        return {
            trabalha: false,
            folga: true,
            horarios: { entrada: '', saida: '', inicio_refeicao: '', termino_refeicao: '' }
        };
    }
    
    // Retornar com horários
    const temRefeicao = horarioConfig.refeicao !== null && horarioConfig.refeicao !== undefined;
    let horarioAlmocoPadrao = '12:00';
    
    return {
        trabalha: true,
        folga: false,
        horarios: {
            entrada: horarioConfig.entrada,
            saida: horarioConfig.saida,
            inicio_refeicao: temRefeicao ? horarioConfig.refeicao.inicio : horarioAlmocoPadrao,
            termino_refeicao: temRefeicao ? horarioConfig.refeicao.fim : horarioAlmocoPadrao
        }
    };
}

// Executar teste
console.log('🔄 1. Convertendo regra visual para JSON...');
const regrasJSON = converterRegraVisualParaJSON(regraVisualCorrigida);

console.log('\n📋 Regras JSON geradas:');
console.log(JSON.stringify(regrasJSON, null, 2));

console.log('\n🧪 2. Testando interpretação para Janeiro 2025...');
console.log('═══════════════════════════════════════════════════════════');

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Testar todos os dias de janeiro 2025
for (let dia = 1; dia <= 31; dia++) {
    const data = new Date(2025, 0, dia); // Janeiro = mês 0
    const diaSemana = diasSemana[data.getDay()];
    const ehFeriado = dia === 1; // 1º de janeiro é feriado
    
    const resultado = interpretarRegraEscala(regrasJSON, dia, 1, 2025, diaSemana, ehFeriado);
    
    if (diaSemana === 'Sáb') {
        const status = resultado?.trabalha ? '✅ TRABALHA' : '❌ FOLGA';
        const horarios = resultado?.trabalha ? `(${resultado.horarios.entrada}-${resultado.horarios.saida})` : '';
        console.log(`  ${String(dia).padStart(2, '0')}/01/2025 ${diaSemana}: ${status} ${horarios}`);
    }
}

console.log('\n🎯 RESULTADO ESPERADO PARA GALLIMPT1:');
console.log('  - TODOS os sábados devem mostrar: ✅ TRABALHA (08:00-12:00)');
console.log('  - Se algum sábado mostrar ❌ FOLGA, há problema na configuração');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ TESTE CONCLUÍDO!');
console.log('   Verifique se todos os sábados estão marcados como TRABALHA');
console.log('═══════════════════════════════════════════════════════════');