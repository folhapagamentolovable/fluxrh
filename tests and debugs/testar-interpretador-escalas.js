// Teste específico do interpretador de escalas para as escalas de limpeza e zeladoria
// Verifica se está interpretando corretamente domingos e feriados

console.log('🧪 TESTE DO INTERPRETADOR DE ESCALAS');
console.log('═══════════════════════════════════════════════════════════');

// Simular as regras JSON das escalas conforme configuradas no banco
const escalasParaTeste = [
    {
        codigo: 'FIGLIMPT1',
        nome: 'Auxiliar de Limpeza Figueiras T1',
        regrasJSON: {
            tipo: 'SEM_DOMINGO_FERIADO',
            trabalha_domingo: false,
            trabalha_feriado: false,
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            }
        }
    },
    {
        codigo: 'FIGZELADT1',
        nome: 'Zelador Figueiras T1',
        regrasJSON: {
            tipo: 'SEM_DOMINGO_FERIADO',
            trabalha_domingo: false,
            trabalha_feriado: false,
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            }
        }
    },
    {
        codigo: 'GALLIMPT1',
        nome: 'Auxiliar de Limpeza Galleria T1',
        regrasJSON: {
            tipo: 'SEM_DOMINGO_FERIADO',
            trabalha_domingo: false,
            trabalha_feriado: false,
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            }
        }
    },
    {
        codigo: 'GALZELADT1',
        nome: 'Zelador Galleria T1',
        regrasJSON: {
            tipo: 'SEM_DOMINGO_FERIADO',
            trabalha_domingo: false,
            trabalha_feriado: false,
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            }
        }
    },
    {
        codigo: 'PALMLIMPT1',
        nome: 'Auxiliar de Limpeza Palmeiras T1',
        regrasJSON: {
            tipo: 'SABADOS_ALTERNADOS',
            trabalha_domingo: false,
            trabalha_feriado: false,
            alternancia: {
                vigencia: '2024-01-06', // Primeiro sábado de 2024
                turma: 'T1',
                trabalha_primeiro_sabado: true
            },
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            }
        }
    },
    {
        codigo: 'PALMLIMPT2',
        nome: 'Auxiliar de Limpeza Palmeiras T2',
        regrasJSON: {
            tipo: 'SABADOS_ALTERNADOS',
            trabalha_domingo: false,
            trabalha_feriado: false,
            alternancia: {
                vigencia: '2024-01-06', // Primeiro sábado de 2024
                turma: 'T2',
                trabalha_primeiro_sabado: false
            },
            horarios: {
                util: { entrada: '08:00', saida: '17:00', refeicao: { inicio: '12:00', fim: '13:00' } },
                sabado: { entrada: '08:00', saida: '12:00', refeicao: null },
                domingo: { entrada: '', saida: '', refeicao: null },
                feriado: { entrada: '', saida: '', refeicao: null }
            }
        }
    }
];

// Função simulada do interpretador (baseada no código real)
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
    
    // Para sábados alternados
    if (regra.tipo === 'SABADOS_ALTERNADOS' && regra.alternancia && trabalhaHoje && diaSemana === 'Sáb') {
        const alt = regra.alternancia;
        trabalhaHoje = calcularSabadosAlternados(dia, mes, ano, alt.vigencia, alt.trabalha_primeiro_sabado);
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

function calcularSabadosAlternados(dia, mes, ano, dataVigencia, trabalhaPrimeiroSabado) {
    const vigencia = new Date(dataVigencia + 'T00:00:00');
    const dataAtual = new Date(ano, mes - 1, dia);
    
    if (dataAtual < vigencia) {
        return false;
    }
    
    // Encontrar o primeiro sábado a partir da vigência
    let primeiroSabado = new Date(vigencia);
    while (primeiroSabado.getDay() !== 6) {
        primeiroSabado.setDate(primeiroSabado.getDate() + 1);
    }
    
    // Contar sábados até a data atual
    let contadorSabados = 0;
    const dataTemp = new Date(primeiroSabado);
    
    while (dataTemp <= dataAtual) {
        if (dataTemp.getTime() === dataAtual.getTime()) {
            const sabadoEhPar = contadorSabados % 2 === 0;
            return trabalhaPrimeiroSabado ? sabadoEhPar : !sabadoEhPar;
        }
        contadorSabados++;
        dataTemp.setDate(dataTemp.getDate() + 7);
    }
    
    return false;
}

// Datas de teste
const datasTeste = [
    { dia: 1, mes: 1, ano: 2026, diaSemana: 'Qua', ehFeriado: true, descricao: '01/01/2026 (Quarta + Feriado)' },
    { dia: 5, mes: 1, ano: 2026, diaSemana: 'Dom', ehFeriado: false, descricao: '05/01/2026 (Domingo)' },
    { dia: 4, mes: 1, ano: 2026, diaSemana: 'Sáb', ehFeriado: false, descricao: '04/01/2026 (Sábado)' },
    { dia: 2, mes: 1, ano: 2026, diaSemana: 'Qui', ehFeriado: false, descricao: '02/01/2026 (Quinta normal)' }
];

console.log('📅 TESTANDO DATAS:');
datasTeste.forEach(data => {
    console.log(`   - ${data.descricao}`);
});

console.log('\n🔍 RESULTADOS DOS TESTES:');
console.log('═══════════════════════════════════════════════════════════');

escalasParaTeste.forEach(escala => {
    console.log(`\n📋 ${escala.codigo} - ${escala.nome}`);
    console.log(`   Configuração: trabalha_domingo=${escala.regrasJSON.trabalha_domingo}, trabalha_feriado=${escala.regrasJSON.trabalha_feriado}`);
    
    datasTeste.forEach(data => {
        const resultado = interpretarRegraEscala(
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
console.log('✅ RESULTADO ESPERADO PARA TODAS AS ESCALAS:');
console.log('   - 01/01/2026 (Feriado): ❌ FOLGA (sem horários)');
console.log('   - 05/01/2026 (Domingo): ❌ FOLGA (sem horários)');
console.log('   - 04/01/2026 (Sábado): Depende da escala (alternado ou meio período)');
console.log('   - 02/01/2026 (Quinta): ✅ TRABALHA (08:00-17:00)');

console.log('\n🔧 ANÁLISE:');
console.log('   Se alguma escala mostrar TRABALHA em feriados/domingos:');
console.log('   - Verificar se trabalha_domingo e trabalha_feriado estão FALSE');
console.log('   - Verificar se os horários de domingo/feriado estão vazios');
console.log('   - Verificar se o interpretador está sendo usado corretamente');