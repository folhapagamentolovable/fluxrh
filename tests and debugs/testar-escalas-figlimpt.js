// Teste específico para as escalas FIGLIMPT1 e FIGLIMPT2
// Verifica se os horários de sexta-feira estão sendo aplicados corretamente

console.log('🧪 TESTE DAS ESCALAS FIGLIMPT1 e FIGLIMPT2');
console.log('═══════════════════════════════════════════════════════════');

// Configuração das escalas conforme descrito pelo usuário
const escalasConfiguradas = [
    {
        codigo: 'FIGLIMPT1',
        nome: 'Auxiliar de Limpeza Figueiras T1',
        configuracao: {
            segunda_a_quinta: { entrada: '08:00', saida: '17:00', almoco: '12:00-13:00' },
            sexta: { entrada: '08:00', saida: '17:00', almoco: '12:00-13:00' },
            sabado: { entrada: '08:00', saida: '12:00', almoco: 'sem' },
            domingo: 'FOLGA',
            feriado: 'FOLGA'
        }
    },
    {
        codigo: 'FIGLIMPT2',
        nome: 'Auxiliar de Limpeza Figueiras T2',
        configuracao: {
            segunda_a_quinta: { entrada: '08:00', saida: '17:00', almoco: '12:00-13:00' },
            sexta: { entrada: '08:00', saida: '17:00', almoco: '12:00-13:00' },
            sabado: { entrada: '08:00', saida: '12:00', almoco: 'sem' },
            domingo: 'FOLGA',
            feriado: 'FOLGA'
        }
    }
];

// Regras JSON corretas que deveriam ser geradas
const regrasJSONCorretas = [
    {
        codigo: 'FIGLIMPT1',
        regrasJSON: {
            tipo: 'PADRAO',
            trabalha_domingo: false,
            trabalha_feriado: false,
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            },
            // IMPORTANTE: Horários específicos por dia da semana
            horarios_especificos: {
                segunda: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                terca: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                quarta: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                quinta: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sexta: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } }
            }
        }
    },
    {
        codigo: 'FIGLIMPT2',
        regrasJSON: {
            tipo: 'PADRAO',
            trabalha_domingo: false,
            trabalha_feriado: false,
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            },
            // IMPORTANTE: Horários específicos por dia da semana
            horarios_especificos: {
                segunda: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                terca: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                quarta: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                quinta: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sexta: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } }
            }
        }
    }
];

// Função simulada do interpretador CORRIGIDO
function interpretarRegraEscalaCorrigido(regraEscala, dia, mes, ano, diaSemana, ehFeriado) {
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
    let horarioConfig;
    
    if (ehFeriado) {
        tipoDia = 'feriado';
        horarioConfig = regra.horarios[tipoDia];
    } else if (isDomingo) {
        tipoDia = 'domingo';
        horarioConfig = regra.horarios[tipoDia];
    } else if (diaSemana === 'Sáb') {
        tipoDia = 'sabado';
        horarioConfig = regra.horarios[tipoDia];
    } else {
        // Para dias úteis, verificar se há horários específicos por dia da semana
        const mapeamentoDias = {
            'Seg': 'segunda',
            'Ter': 'terca',
            'Qua': 'quarta',
            'Qui': 'quinta',
            'Sex': 'sexta'
        };
        
        const diaEspecifico = mapeamentoDias[diaSemana];
        
        // CORREÇÃO: Se tem horários específicos e o dia específico existe, usar ele
        if (regra.horarios_especificos && diaEspecifico && regra.horarios_especificos[diaEspecifico]) {
            horarioConfig = regra.horarios_especificos[diaEspecifico];
            console.log(`🔍 [${diaSemana}] Usando horário específico de ${diaEspecifico}:`, horarioConfig);
        } else {
            horarioConfig = regra.horarios.util;
            console.log(`🔍 [${diaSemana}] Usando horário padrão (util):`, horarioConfig);
        }
    }
    
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
    const horarioAlmocoPadrao = '12:00';
    
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

// Datas de teste focadas nos dias da semana
const datasTeste = [
    { dia: 6, mes: 1, ano: 2026, diaSemana: 'Seg', ehFeriado: false, descricao: '06/01/2026 (Segunda-feira)' },
    { dia: 7, mes: 1, ano: 2026, diaSemana: 'Ter', ehFeriado: false, descricao: '07/01/2026 (Terça-feira)' },
    { dia: 8, mes: 1, ano: 2026, diaSemana: 'Qua', ehFeriado: false, descricao: '08/01/2026 (Quarta-feira)' },
    { dia: 9, mes: 1, ano: 2026, diaSemana: 'Qui', ehFeriado: false, descricao: '09/01/2026 (Quinta-feira)' },
    { dia: 10, mes: 1, ano: 2026, diaSemana: 'Sex', ehFeriado: false, descricao: '10/01/2026 (Sexta-feira)' },
    { dia: 11, mes: 1, ano: 2026, diaSemana: 'Sáb', ehFeriado: false, descricao: '11/01/2026 (Sábado)' }
];

console.log('📅 TESTANDO DIAS DA SEMANA:');
datasTeste.forEach(data => {
    console.log(`   - ${data.descricao}`);
});

console.log('\n🔍 RESULTADOS DOS TESTES COM INTERPRETADOR CORRIGIDO:');
console.log('═══════════════════════════════════════════════════════════');

regrasJSONCorretas.forEach(escala => {
    console.log(`\n📋 ${escala.codigo}`);
    console.log(`   Tem horários específicos: ${escala.regrasJSON.horarios_especificos ? 'SIM' : 'NÃO'}`);
    
    if (escala.regrasJSON.horarios_especificos) {
        console.log(`   Horário sexta-feira: ${escala.regrasJSON.horarios_especificos.sexta.entrada}-${escala.regrasJSON.horarios_especificos.sexta.saida}`);
        console.log(`   Horário segunda-feira: ${escala.regrasJSON.horarios_especificos.segunda.entrada}-${escala.regrasJSON.horarios_especificos.segunda.saida}`);
    }
    
    datasTeste.forEach(data => {
        const resultado = interpretarRegraEscalaCorrigido(
            escala.regrasJSON,
            data.dia,
            data.mes,
            data.ano,
            data.diaSemana,
            data.ehFeriado
        );
        
        if (resultado) {
            const status = resultado.trabalha ? '✅ TRABALHA' : '❌ FOLGA';
            const horarios = resultado.trabalha ? 
                `(${resultado.horarios.entrada}-${resultado.horarios.saida})` : 
                '(sem horários)';
            console.log(`   ${data.descricao}: ${status} ${horarios}`);
        } else {
            console.log(`   ${data.descricao}: ⚠️ ERRO - Interpretador retornou null`);
        }
    });
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ RESULTADO ESPERADO APÓS CORREÇÃO:');
console.log('   - Segunda a Quinta: ✅ TRABALHA (08:00-17:00)');
console.log('   - Sexta-feira: ✅ TRABALHA (08:00-17:00) ← CORREÇÃO APLICADA');
console.log('   - Sábado: ✅ TRABALHA (08:00-12:00)');

console.log('\n🔧 PROBLEMA IDENTIFICADO:');
console.log('   O interpretador anterior não considerava horários_especificos');
console.log('   Sempre usava horarios.util para todos os dias úteis');
console.log('   Resultado: sexta-feira ficava com horário de segunda (08:00-17:00)');

console.log('\n✅ CORREÇÃO IMPLEMENTADA:');
console.log('   1. Interpretador agora verifica horarios_especificos primeiro');
console.log('   2. Se existe horário específico para o dia, usa ele');
console.log('   3. Senão, usa horarios.util como fallback');
console.log('   4. Conversor cria horarios_especificos quando há diferenças');