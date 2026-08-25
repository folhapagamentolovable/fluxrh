// Conversor de Regras Visuais para JSON estruturado

interface HorariosConfig {
    entrada: string;
    inicio_almoco: string;
    termino_almoco: string;
    saida: string;
}

interface RegraVisual {
    codigo_escala: string;
    nome_escala: string;
    turno: string;
    data_vigencia: string;
    trabalha_segunda: boolean;
    trabalha_terca: boolean;
    trabalha_quarta: boolean;
    trabalha_quinta: boolean;
    trabalha_sexta: boolean;
    trabalha_sabado: boolean;
    trabalha_domingo: boolean;
    trabalha_feriado: boolean;
    tipo_alternancia: string;
    horarios_segunda: HorariosConfig;
    horarios_terca: HorariosConfig;
    horarios_quarta: HorariosConfig;
    horarios_quinta: HorariosConfig;
    horarios_sexta: HorariosConfig;
    horarios_sabado: HorariosConfig;
    horarios_domingo: HorariosConfig;
    horarios_feriado: HorariosConfig;
}

/**
 * Converte horários visuais para formato JSON do interpretador
 */
function converterHorarios(horarios: HorariosConfig) {
    // Se não tem horários, retornar null (não trabalha)
    if (!horarios.entrada || !horarios.saida) {
        return null;
    }

    // Se início e término de almoço são iguais, não tem intrajornada
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

/**
 * Converte regra visual para regras_json estruturado
 */
export function converterRegraVisualParaJSON(regraVisual: RegraVisual) {
    // Determinar tipo baseado na alternância
    let tipo = 'PADRAO';
    let alternancia = null;


    if (regraVisual.tipo_alternancia && regraVisual.tipo_alternancia.startsWith('DIAS_ALTERNADOS')) {
        tipo = 'ALTERNANCIA_12X36';
        const isT1 = regraVisual.tipo_alternancia === 'DIAS_ALTERNADOS_T1';
        alternancia = {
            vigencia: regraVisual.data_vigencia,
            turma: isT1 ? 'T1' : 'T2',
            trabalha_primeiro_dia: isT1 // T1 trabalha no dia 0 (vigência), T2 trabalha no dia 1
        };
    } else if (regraVisual.tipo_alternancia && regraVisual.tipo_alternancia.startsWith('SABADOS_ALTERNADOS')) {
        tipo = 'SABADOS_ALTERNADOS';
        const isT1 = regraVisual.tipo_alternancia === 'SABADOS_ALTERNADOS_T1';
        alternancia = {
            vigencia: regraVisual.data_vigencia,
            turma: isT1 ? 'T1' : 'T2',
            trabalha_primeiro_sabado: isT1 // T1 trabalha no primeiro sábado, T2 no segundo
        };
    } else if (regraVisual.tipo_alternancia === 'NENHUMA' || 
               regraVisual.tipo_alternancia === 'Escala Fixa (sem alternância)' ||
               regraVisual.tipo_alternancia === 'SEM_ALTERNANCIA' ||
               regraVisual.tipo_alternancia === 'SEM ALTERNÂNCIA' ||
               !regraVisual.tipo_alternancia) {
        // Escala fixa - sem alternância
        tipo = 'PADRAO';
        if (!regraVisual.trabalha_domingo || !regraVisual.trabalha_feriado) {
            tipo = 'SEM_DOMINGO_FERIADO';
        }
    }

    // Montar horários por tipo de dia
    const horarios = {
        util: converterHorarios(regraVisual.horarios_segunda), // Usar segunda como padrão
        sabado: converterHorarios(regraVisual.horarios_sabado),
        domingo: converterHorarios(regraVisual.horarios_domingo),
        feriado: converterHorarios(regraVisual.horarios_feriado)
    };

    // Montar JSON final
    const regrasJSON: any = {
        tipo,
        trabalha_domingo: regraVisual.trabalha_domingo,
        trabalha_feriado: regraVisual.trabalha_feriado,
        horarios
    };

    // Adicionar alternância se houver
    if (alternancia) {
        regrasJSON.alternancia = alternancia;
    }

    // Adicionar dias da semana específicos (para escalas não-padrão)
    if (!regraVisual.trabalha_segunda || !regraVisual.trabalha_terca || 
        !regraVisual.trabalha_quarta || !regraVisual.trabalha_quinta || 
        !regraVisual.trabalha_sexta) {
        regrasJSON.dias_semana = {
            segunda: regraVisual.trabalha_segunda,
            terca: regraVisual.trabalha_terca,
            quarta: regraVisual.trabalha_quarta,
            quinta: regraVisual.trabalha_quinta,
            sexta: regraVisual.trabalha_sexta,
            sabado: regraVisual.trabalha_sabado
        };
    }

    // Verificar se há horários diferentes entre os dias da semana
    const horariosSegunda = JSON.stringify(regraVisual.horarios_segunda);
    const horariosTerca = JSON.stringify(regraVisual.horarios_terca);
    const horariosQuarta = JSON.stringify(regraVisual.horarios_quarta);
    const horariosQuinta = JSON.stringify(regraVisual.horarios_quinta);
    const horariosSexta = JSON.stringify(regraVisual.horarios_sexta);
    
    // Se algum dia tem horários diferentes, adicionar horários específicos
    if (horariosTerca !== horariosSegunda || 
        horariosQuarta !== horariosSegunda || 
        horariosQuinta !== horariosSegunda || 
        horariosSexta !== horariosSegunda) {
        
        
        regrasJSON.horarios_especificos = {
            segunda: converterHorarios(regraVisual.horarios_segunda),
            terca: converterHorarios(regraVisual.horarios_terca),
            quarta: converterHorarios(regraVisual.horarios_quarta),
            quinta: converterHorarios(regraVisual.horarios_quinta),
            sexta: converterHorarios(regraVisual.horarios_sexta)
        };
        
    }


    return regrasJSON;
}

/**
 * Sincroniza regra visual com tabela escalas
 */
export async function sincronizarRegraComEscalas(supabase: any, regraVisual: RegraVisual) {
    // Converter para JSON
    const regrasJSON = converterRegraVisualParaJSON(regraVisual);

    // Verificar se escala já existe
    const { data: escalaExistente } = await supabase
        .from('regras_escalas')
        .select('id')
        .eq('codigo_escala', regraVisual.codigo_escala)
        .single();

    if (escalaExistente) {
        // Atualizar
        const { error } = await supabase
            .from('regras_escalas')
            .update({
                nome_escala: regraVisual.nome_escala,
                regras_json: regrasJSON
            })
            .eq('id', escalaExistente.id);

        if (error) throw error;
        return { acao: 'atualizada', id: escalaExistente.id };
    } else {
        // Inserir
        const { data, error } = await supabase
            .from('regras_escalas')
            .insert([{
                codigo_escala: regraVisual.codigo_escala,
                nome_escala: regraVisual.nome_escala,
                regras_json: regrasJSON
            }])
            .select()
            .single();

        if (error) throw error;
        return { acao: 'criada', id: data.id };
    }
}
