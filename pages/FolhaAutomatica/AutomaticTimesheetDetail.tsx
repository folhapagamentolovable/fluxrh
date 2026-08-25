import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { supabase } from '../../lib/supabase';
import { calcularHorasDia, calcularTotaisMes, gerarHorariosPadraoEscala } from '../../utils/calcularHoras';
import { buscarEscalaSalva } from '../../utils/carregarEscalaSalva';
import { interpretarRegraEscala } from '../../utils/interpretadorRegrasEscala';
import { escreverEExibirJanela } from '../../utils/printUtils';
import { useToast } from '../../hooks/useToast';
import { useFeriados } from '../../hooks/useSupabase';
import { filtrarFeriadosPorLocalidade } from '../../utils/feriadosFilter';
import { ArrowLeft, Save, Trash2, RefreshCw, Printer } from 'lucide-react';

const AutomaticTimesheetDetail: React.FC = () => {
    const { funcionarioId } = useParams<{ funcionarioId: string }>();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();
    const { data: feriados } = useFeriados();

    const [funcionario, setFuncionario] = useState<any>(null);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [folha, setFolha] = useState<any>(null);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [observacoes, setObservacoes] = useState('');

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();
    const getWeekday = (day: number, month: number, year: number) => diasSemana[new Date(year, month - 1, day).getDay()];

    // Carregar dados do funcionário
    useEffect(() => {
        if (!funcionarioId) return;
        const carregarFuncionario = async () => {
            const { data, error } = await supabase
                .from('funcionarios')
                .select(`*, cargo:cargos(*), empresa:empresas(*), posto_trabalho:postos_trabalho(*)`)
                .eq('id', funcionarioId)
                .single();
            if (error) {
                showToast('Erro ao carregar funcionário', 'error');
                return;
            }
            setFuncionario(data);
        };
        carregarFuncionario();
    }, [funcionarioId]);

    // Gerar folha quando funcionário carrega ou mês/ano muda
    useEffect(() => {
        if (funcionario && feriados) {
            gerarFolha();
        }
    }, [funcionario, mes, ano, feriados]);

    const gerarFolha = async () => {
        if (!funcionario || !funcionarioId) return;
        setLoading(true);
        try {
            // 1. Buscar registros de ponto automático (QR Code) do mês
            const primeiroDia = `${ano}-${mes.toString().padStart(2, '0')}-01`;
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const ultimoDiaStr = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;

            const { data: registrosQR } = await supabase
                .from('folha_ponto_automatica')
                .select('*')
                .eq('funcionario_id', funcionarioId)
                .gte('data_registro', primeiroDia)
                .lte('data_registro', ultimoDiaStr)
                .order('data_registro', { ascending: true });

            // 2. Buscar escala mensal
            const escalaMensal = await buscarEscalaSalva(funcionarioId, mes, ano);

            // 3. Construir dadosDias
            const diasNoMes = getDaysInMonth(mes, ano);
            const novosDados: any = {};

            // Primeiro, preencher com dados da escala (folga, feriado, etc.)
            let diasEscala: any = null;
            let regrasJSON: any = null;
            let nomeEscala = '';

            if (escalaMensal) {
                diasEscala = typeof escalaMensal.dias_trabalhados === 'string'
                    ? JSON.parse(escalaMensal.dias_trabalhados)
                    : escalaMensal.dias_trabalhados;
                regrasJSON = escalaMensal.escala?.regras_json;
                nomeEscala = escalaMensal.escala?.codigo_escala || escalaMensal.codigo_escala || funcionario.codigo_escala || '';
            } else {
                // Sem escala mensal: usar código da escala do funcionário diretamente
                nomeEscala = funcionario.codigo_escala || '';
            }

            // Criar mapa de registros QR por dia
            const qrPorDia: Record<number, any> = {};
            if (registrosQR) {
                for (const reg of registrosQR) {
                    const dia = new Date(reg.data_registro + 'T12:00:00').getDate();
                    qrPorDia[dia] = reg;
                }
            }

            // Filtrar feriados pela cidade/estado do posto do funcionário
            const feriadosFunc = filtrarFeriadosPorLocalidade(
                feriados || [],
                funcionario?.posto_trabalho?.cidade,
                funcionario?.posto_trabalho?.estado
            );

            // Preencher cada dia
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const diaKey = `dia_${dia}`;
                const dataCompleta = new Date(ano, mes - 1, dia);
                const diaSemana = dataCompleta.getDay();
                const diaSemanaTexto = diasSemana[diaSemana];

                const ehFeriado = feriadosFunc.some(feriado => {
                    const dataFeriado = new Date(feriado.data_feriado + 'T00:00:00');
                    return dataFeriado.getDate() === dia &&
                        dataFeriado.getMonth() === mes - 1 &&
                        dataFeriado.getFullYear() === ano;
                }) || false;

                // Determinar folga a partir da escala
                let folga = false;
                if (diasEscala && diasEscala[diaKey]) {
                    folga = diasEscala[diaKey].folga ?? false;
                } else if (regrasJSON) {
                    const interpretacao = interpretarRegraEscala(regrasJSON, dia, mes, ano, diaSemanaTexto, ehFeriado);
                    folga = interpretacao?.folga ?? false;
                }

                // Preencher horários dos registros QR
                const qr = qrPorDia[dia];
                const formatTime = (t: string | null) => {
                    if (!t) return '';
                    return t.substring(0, 5); // "HH:MM:SS" → "HH:MM"
                };

                novosDados[diaKey] = {
                    feriado: ehFeriado,
                    folga,
                    atestado: false,
                    falta_injustificada: false,
                    suspensao: false,
                    entrada: qr ? formatTime(qr.primeiro_registro) : '',
                    inicio_refeicao: qr ? formatTime(qr.segundo_registro) : '',
                    termino_refeicao: qr ? formatTime(qr.terceiro_registro) : '',
                    saida: qr ? formatTime(qr.quarto_registro) : '',
                    calculo: null
                };
            }

            // Recalcular todos os dias
            const horariosPrevistosPorDia: Record<string, any> = {};
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const diaKey = `dia_${dia}`;

                // Horários previstos da escala
                let horariosPrevistos: any = undefined;
                if (diasEscala && diasEscala[diaKey]) {
                    horariosPrevistos = {
                        entrada: diasEscala[diaKey].entrada || '',
                        inicio_refeicao: diasEscala[diaKey].inicio_refeicao || '',
                        termino_refeicao: diasEscala[diaKey].termino_refeicao || '',
                        saida: diasEscala[diaKey].saida || ''
                    };
                    horariosPrevistosPorDia[diaKey] = horariosPrevistos;
                }

                recalcularDiaStatic(novosDados, diaKey, mes, ano, 8, nomeEscala, horariosPrevistos);
            }

            // Buscar escala info
            const escalaInfo = escalaMensal ? {
                id: escalaMensal.escala_id || escalaMensal.escala?.id || null,
                codigo_escala: nomeEscala,
                nome_escala: escalaMensal.escala?.nome_escala || nomeEscala
            } : null;

            // Verificar se já existe folha salva
            const { data: folhaSalva } = await supabase
                .from('folhas_ponto')
                .select('observacoes')
                .eq('funcionario_id', funcionarioId)
                .eq('mes', mes)
                .eq('ano', ano)
                .maybeSingle();

            if (folhaSalva?.observacoes) {
                setObservacoes(folhaSalva.observacoes);
            }

            setFolha({
                funcionario,
                empresa: funcionario.empresa,
                posto_trabalho: funcionario.posto_trabalho,
                cargo: funcionario.cargo,
                escala: escalaInfo,
                mes,
                ano,
                dadosDias: novosDados,
                horariosPrevistos: horariosPrevistosPorDia,
                totais: calcularTotaisMes(novosDados),
                data_inicio: null,
                data_fim: null
            });
        } catch (error) {
            showToast('Erro ao gerar folha de ponto', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Recalcular dia (mesma lógica do TimeSheets)
    const recalcularDiaStatic = (dados: any, diaKey: string, mes: number, ano: number, jornadaPadrao: number = 8, nomeEscala: string = '', horariosPrevistos?: any) => {
        const dia = dados[diaKey];
        if (!dia.entrada || !dia.saida) {
            dia.calculo = null;
            return;
        }

        const numeroDia = Number.parseInt(diaKey.replace('dia_', ''));
        const dataCompleta = new Date(ano, mes - 1, numeroDia);
        const diaSemana = dataCompleta.getDay();

        // Regra especial: feriado com intrajornada suprimida (12h)
        if (dia.feriado && dia.entrada && dia.saida) {
            const intervaloSuprimido = (dia.inicio_refeicao === dia.termino_refeicao);
            const [hE, mE] = dia.entrada.split(':').map(Number);
            const [hS, mS] = dia.saida.split(':').map(Number);
            const minutosEntrada = hE * 60 + mE;
            const minutosSaida = hS * 60 + mS;
            let totalMinutos = minutosSaida - minutosEntrada;
            if (totalMinutos < 0) totalMinutos += 24 * 60;
            const totalHoras = totalMinutos / 60;

            if (intervaloSuprimido && totalHoras >= 11.5 && totalHoras <= 12.5) {
                dia.calculo = {
                    horas_normais: 0, horas_extras_50: 0, horas_extras_100: 11,
                    intrajornada_50: 0, intrajornada_100: 1, horas_noturnas: 0,
                    total_horas: 12, atrasos: 0
                };
                return;
            }
        }

        // Se não há horários previstos explícitos, gerar a partir da escala
        let horariosParaCalculo = horariosPrevistos;
        if (!horariosParaCalculo && nomeEscala) {
            const gerado = gerarHorariosPadraoEscala(nomeEscala, diaSemana);
            if (gerado) horariosParaCalculo = gerado;
        }

        const calculo = calcularHorasDia(
            { entrada: dia.entrada, inicio_refeicao: dia.inicio_refeicao || '', termino_refeicao: dia.termino_refeicao || '', saida: dia.saida },
            jornadaPadrao,
            dia.feriado,
            dia.folga,
            diaSemana,
            nomeEscala,
            horariosParaCalculo
        );
        dia.calculo = calculo;
    };

    // Atualizar dia
    const handleAtualizarDia = (dia: number, campo: string, valor: any) => {
        if (!folha) return;
        const diaKey = `dia_${dia}`;
        const diaAtual = folha.dadosDias[diaKey] || {};

        const novosDados = {
            ...folha.dadosDias,
            [diaKey]: { ...diaAtual, [campo]: valor }
        };

        if (['entrada', 'inicio_refeicao', 'termino_refeicao', 'saida', 'folga', 'feriado', 'atestado', 'falta_injustificada', 'suspensao'].includes(campo)) {
            const nomeEscala = folha.escala?.codigo_escala || '';
            const horariosPrevistos = folha.horariosPrevistos?.[diaKey] ? {
                entrada: folha.horariosPrevistos[diaKey].entrada || '',
                inicio_refeicao: folha.horariosPrevistos[diaKey].inicio_refeicao || '',
                termino_refeicao: folha.horariosPrevistos[diaKey].termino_refeicao || '',
                saida: folha.horariosPrevistos[diaKey].saida || ''
            } : undefined;
            recalcularDiaStatic(novosDados, diaKey, folha.mes, folha.ano, 8, nomeEscala, horariosPrevistos);
        }

        setFolha({
            ...folha,
            dadosDias: novosDados,
            totais: calcularTotaisMes(novosDados)
        });
    };

    // Excluir dia
    const handleExcluirDia = (dia: number) => {
        if (!folha) return;
        if (!window.confirm(`Deseja excluir o dia ${dia}/${mes}/${ano}?`)) return;
        const diaKey = `dia_${dia}`;
        const novosDados = { ...folha.dadosDias };
        delete novosDados[diaKey];
        setFolha({ ...folha, dadosDias: novosDados, totais: calcularTotaisMes(novosDados) });
        showToast(`Dia ${dia} excluído`, 'success');
    };

    // Salvar folha
    const handleSalvar = async () => {
        if (!folha || !funcionarioId) return;
        if (!window.confirm(`Deseja salvar a folha de ponto de ${funcionario.nome_completo}?\nMês: ${meses[mes - 1]}/${ano}`)) return;

        setSubmitting(true);
        try {
            const folhaParaSalvar = {
                funcionario_id: funcionarioId,
                nome_funcionario: funcionario.nome_completo,
                mes, ano,
                empresa_id: folha.empresa?.id || null,
                posto_trabalho_id: folha.posto_trabalho?.id || null,
                cargo_id: folha.cargo?.id || null,
                escala_id: folha.escala?.id || null,
                dados_dias: JSON.stringify(folha.dadosDias),
                data_inicio: folha.data_inicio || null,
                data_fim: folha.data_fim || null,
                observacoes: observacoes || null,
                horas_trabalhadas: folha.totais.total_horas_normais || 0,
                horas_extras: (folha.totais.total_horas_extras_50 || 0) + (folha.totais.total_horas_extras_100 || 0),
                total_horas_normais: folha.totais.total_horas_normais || 0,
                total_horas_extras_50: folha.totais.total_horas_extras_50 || 0,
                total_horas_extras_100: folha.totais.total_horas_extras_100 || 0,
                total_horas_noturnas: folha.totais.total_horas_noturnas || 0,
                total_intrajornada_50: folha.totais.total_intrajornada_50 || 0,
                total_intrajornada_100: folha.totais.total_intrajornada_100 || 0,
                faltas: (folha.totais.total_faltas_justificadas || 0) + (folha.totais.total_faltas_injustificadas || 0),
                total_faltas_justificadas: folha.totais.total_faltas_justificadas || 0,
                total_faltas_injustificadas: folha.totais.total_faltas_injustificadas || 0,
                total_suspensoes: folha.totais.total_suspensoes || 0,
                atrasos: folha.totais.total_atrasos || 0,
                total_atrasos: folha.totais.total_atrasos || 0,
                folgas_trabalhadas: folha.totais.folgas_trabalhadas || 0
            };

            const { error } = await supabase
                .from('folhas_ponto')
                .upsert(folhaParaSalvar, { onConflict: 'funcionario_id,mes,ano' });

            if (error) throw error;
            showToast('💾 Folha de ponto salva com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao salvar folha de ponto', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Excluir folha
    const handleExcluir = async () => {
        if (!funcionarioId) return;
        if (!window.confirm(`⚠️ Deseja EXCLUIR a folha de ponto de ${funcionario?.nome_completo}?\nEsta ação NÃO pode ser desfeita!`)) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('folhas_ponto')
                .delete()
                .eq('funcionario_id', funcionarioId)
                .eq('mes', mes)
                .eq('ano', ano);

            if (error) throw error;
            showToast('Folha excluída com sucesso', 'success');
            setFolha(null);
            await gerarFolha();
        } catch (error) {
            showToast('Erro ao excluir folha', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Impressão com layout idêntico às Folhas de Ponto em Branco
    const handleImprimir = () => {
        if (!folha || !funcionario) return;

        const mesNome = meses[mes - 1];
        const diasNoMes = getDaysInMonth(mes, ano);

        const formatarCBO = (cbo?: string) => {
            if (!cbo) return '';
            const numeros = cbo.replace(/\D/g, '');
            if (numeros.length >= 4) return `${numeros.substring(0, 4)}-${numeros.substring(4, 6)}`;
            return cbo;
        };
        const formatarCidadeEstado = (cidade?: string, estado?: string) => {
            if (!cidade && !estado) return '';
            if (cidade && estado) return `${cidade} - ${estado}`;
            return cidade || estado || '';
        };

        // Obter horário padrão a partir do primeiro dia com dados
        let horarioPadrao = { entrada: '08:00', saida: '17:00', inicio_refeicao: '12:00', termino_refeicao: '13:00' };
        for (let d = 1; d <= diasNoMes; d++) {
            const dia = folha.dadosDias[`dia_${d}`];
            if (dia?.entrada && dia?.saida) {
                horarioPadrao = { entrada: dia.entrada, saida: dia.saida, inicio_refeicao: dia.inicio_refeicao || '12:00', termino_refeicao: dia.termino_refeicao || '13:00' };
                break;
            }
        }

        const obterObservacao = (dia: number) => {
            const diaData = folha.dadosDias[`dia_${dia}`];
            if (diaData?.feriado) return 'Fer';
            const diaSemana = new Date(ano, mes - 1, dia).getDay();
            if (diaSemana === 0) return 'Dom';
            if (diaSemana === 6) return 'Sáb';
            if (diaData?.folga) return 'Folga';
            if (diaData?.atestado) return 'Atst';
            if (diaData?.falta_injustificada) return 'Falta';
            return '';
        };

        // CSS idêntico ao BlankTimesheets
        const estilosImpressao = `
            @media print {
                @page { 
                    size: A4 portrait; 
                    margin: 8mm 5mm 8mm 5mm !important; 
                }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box !important;
                }
                .page-container {
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                .page-container:last-child {
                    page-break-after: auto;
                }
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                margin: 0;
                padding: 5px;
                box-sizing: border-box;
            }
            .page-container {
                margin-bottom: 20px;
            }
            .container {
                width: 100%;
                max-width: 100%;
                border: 2px solid black;
                padding: 6px;
            }
            .header-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .header {
                font-weight: bold;
                font-size: 12px;
                flex: 1;
                text-align: center;
            }
            .periodo-header {
                font-weight: bold;
                font-size: 10px;
                margin-right: 10px;
            }
            .info-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            .info-left {
                flex: 1;
                margin-right: 15px;
            }
            .empresa-section {
                border: 1px solid black;
                padding: 4px;
                margin-bottom: 6px;
            }
            .funcionario-section {
                border: 1px solid black;
                padding: 4px;
                margin-bottom: 6px;
            }
            .info-right {
                width: 160px;
                border: 1px solid black;
                padding: 4px;
                text-align: center;
                font-size: 9px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .cnpj-content { width: 100%; }
            .cnpj-line { font-weight: bold; margin-bottom: 3px; }
            .empresa-line { margin-bottom: 3px; }
            .endereco-line { margin-bottom: 0; }
            .info-row {
                display: flex;
                margin-bottom: 2px;
                align-items: baseline;
            }
            .info-label {
                font-weight: bold;
                width: 70px;
                margin-right: 8px;
                font-size: 11px;
            }
            .info-value {
                flex: 1;
                min-height: 12px;
                padding: 1px;
                font-size: 11px;
            }
            .info-label-inline {
                font-weight: bold;
                margin-left: 15px;
                margin-right: 8px;
                font-size: 11px;
            }
            .info-value-inline {
                min-height: 12px;
                padding: 1px;
                font-size: 11px;
                width: 150px;
            }
            .info-value-small {
                min-height: 12px;
                padding: 1px;
                font-size: 11px;
                width: 80px;
            }
            .periodo-dados-section {
                border: 1px solid black;
                margin-bottom: 8px;
            }
            .periodo-row {
                display: flex;
                align-items: center;
                padding: 2px 4px;
                font-size: 11px;
            }
            .periodo-label {
                font-weight: bold;
                margin-right: 8px;
                width: 50px;
            }
            .periodo-label-mid {
                font-weight: bold;
                margin-left: 20px;
                margin-right: 8px;
                width: 50px;
            }
            .periodo-value {
                padding: 1px 4px;
                min-width: 60px;
                text-align: center;
            }
            .periodo-a, .periodo-as {
                margin: 0 8px;
                font-weight: bold;
            }
            .timesheet-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 8px;
            }
            .timesheet-table th,
            .timesheet-table td {
                border: 1px solid black;
                padding: 1px;
                text-align: center;
                height: 80px;
                vertical-align: middle;
                font-size: 11px;
            }
            .timesheet-table th {
                background-color: #f0f0f0;
                font-weight: bold;
                font-size: 10px;
                height: 14px;
            }
            .day-cell {
                width: 25px;
                font-weight: bold;
                background-color: #f0f0f0;
            }
            .time-cell { width: 35px; }
            .obs-cell { width: 40px; }
            .footer-section {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
            }
            .footer-left {
                width: 48%;
                border: 1px solid black;
                padding: 4px;
                font-size: 10px;
            }
            .footer-right {
                width: 48%;
                border: 1px solid black;
                padding: 4px;
                font-size: 10px;
            }
            .footer-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
                align-items: center;
            }
            .signature-line {
                border-bottom: 1px solid black;
                width: 120px;
                height: 12px;
                margin-left: 5px;
            }
        `;

        // Gerar linhas da tabela com dados preenchidos
        const linhasTabela = Array.from({ length: 15 }, (_, i) => {
            const dia1 = i + 1;
            const dia2 = i + 16;
            const d1 = folha.dadosDias[`dia_${dia1}`];
            const d2 = folha.dadosDias[`dia_${dia2}`];
            const obs1 = obterObservacao(dia1);
            const obs2 = dia2 <= diasNoMes ? obterObservacao(dia2) : '';

            return `
                <tr>
                    <td class="day-cell">${dia1.toString().padStart(2, '0')}</td>
                    <td class="time-cell">${d1?.entrada || ''}</td>
                    <td class="time-cell">${d1?.inicio_refeicao || ''}</td>
                    <td class="time-cell">${d1?.termino_refeicao || ''}</td>
                    <td class="time-cell">${d1?.saida || ''}</td>
                    <td class="obs-cell">${obs1}</td>
                    <td class="day-cell">${dia2 <= diasNoMes ? dia2.toString().padStart(2, '0') : ''}</td>
                    <td class="time-cell">${dia2 <= diasNoMes ? (d2?.entrada || '') : ''}</td>
                    <td class="time-cell">${dia2 <= diasNoMes ? (d2?.inicio_refeicao || '') : ''}</td>
                    <td class="time-cell">${dia2 <= diasNoMes ? (d2?.termino_refeicao || '') : ''}</td>
                    <td class="time-cell">${dia2 <= diasNoMes ? (d2?.saida || '') : ''}</td>
                    <td class="obs-cell">${obs2}</td>
                </tr>
            `;
        }).join('');

        const empresa = funcionario.empresa || {};
        const posto = funcionario.posto_trabalho || {};
        const cargo = funcionario.cargo || {};
        const totais = folha.totais || {};

        const htmlCompleto = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Folha de Ponto - ${funcionario.nome_completo} - ${mesNome}/${ano}</title>
                <style>${estilosImpressao}</style>
            </head>
            <body>
                <div class="page-container">
                    <div class="container">
                        <div class="header-section">
                            <div class="header">FOLHA DE PONTO</div>
                            <div class="periodo-header">Período: ${mesNome}/${ano}</div>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-left">
                                <div class="empresa-section">
                                    <div class="info-row">
                                        <span class="info-label">Empresa:</span>
                                        <span class="info-value">${empresa.nome_empresa || ''}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Endereço:</span>
                                        <span class="info-value">${empresa.endereco || ''}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Bairro:</span>
                                        <span class="info-value">Vila Proost de Souza</span>
                                        <span class="info-label-inline">Cidade:</span>
                                        <span class="info-value-inline">Campinas - SP</span>
                                    </div>
                                </div>
                                
                                <div class="funcionario-section">
                                    <div class="info-row">
                                        <span class="info-label">Nome:</span>
                                        <span class="info-value">${funcionario.nome_completo}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Código:</span>
                                        <span class="info-value-small">${formatarCBO(cargo.cbo)}</span>
                                        <span class="info-label-inline">Cargo:</span>
                                        <span class="info-value-inline">${cargo.nome_cargo || ''}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Posto/Setor:</span>
                                        <span class="info-value">${funcionario.nome_posto || posto.nome_posto || ''}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Endereço:</span>
                                        <span class="info-value">${posto.endereco || ''} ${formatarCidadeEstado(posto.cidade, posto.estado)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="info-right">
                                <div class="cnpj-content">
                                    <div class="cnpj-line">CNPJ: ${empresa.cnpj || ''}</div>
                                    <div class="empresa-line">${empresa.nome_empresa || ''}</div>
                                    <div class="endereco-line">${empresa.endereco || ''} ${formatarCidadeEstado(empresa.cidade, empresa.estado)}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="periodo-dados-section">
                            <div class="periodo-row">
                                <span class="periodo-label">Período:</span>
                                <span class="periodo-value">01/${String(mes).padStart(2, '0')}/${ano}</span>
                                <span class="periodo-a">a</span>
                                <span class="periodo-value">${diasNoMes}/${String(mes).padStart(2, '0')}/${ano}</span>
                            </div>
                            <div class="periodo-row">
                                <span class="periodo-label">Hr./Mês:</span>
                                <span class="periodo-value">220,00</span>
                                <span class="periodo-label-mid">C.B.O.:</span>
                                <span class="periodo-value">${formatarCBO(cargo.cbo)}</span>
                            </div>
                            <div class="periodo-row">
                                <span class="periodo-label">Horário:</span>
                                <span class="periodo-value">${horarioPadrao.entrada}</span>
                                <span class="periodo-as">às</span>
                                <span class="periodo-value">${horarioPadrao.saida}</span>
                                <span class="periodo-label-mid">Intervalo:</span>
                                <span class="periodo-value">${horarioPadrao.inicio_refeicao}</span>
                                <span class="periodo-as">às</span>
                                <span class="periodo-value">${horarioPadrao.termino_refeicao}</span>
                            </div>
                        </div>
                        
                        <table class="timesheet-table">
                            <thead>
                                <tr>
                                    <th colspan="6">1ª QUINZENA</th>
                                    <th colspan="6">2ª QUINZENA</th>
                                </tr>
                                <tr>
                                    <th class="day-cell">Dia</th>
                                    <th class="time-cell">Entrada</th>
                                    <th class="time-cell">Saída</th>
                                    <th class="time-cell">Entrada</th>
                                    <th class="time-cell">Saída</th>
                                    <th class="obs-cell">Obs.</th>
                                    <th class="day-cell">Dia</th>
                                    <th class="time-cell">Entrada</th>
                                    <th class="time-cell">Saída</th>
                                    <th class="time-cell">Entrada</th>
                                    <th class="time-cell">Saída</th>
                                    <th class="obs-cell">Obs.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasTabela}
                            </tbody>
                        </table>
                        
                        <div class="footer-section">
                            <div class="footer-left">
                                <div class="footer-row"><span><strong>Faltas</strong></span></div>
                                <div class="footer-row">
                                    <span>Justif.: ${totais.total_faltas_justificadas || 0}</span>
                                    <span>Não Justif.: ${totais.total_faltas_injustificadas || 0}</span>
                                </div>
                                <div class="footer-row" style="margin-top: 6px;"><span><strong>Atrasos</strong></span></div>
                                <div class="footer-row">
                                    <span>Total: ${totais.total_atrasos?.toFixed(2) || '0.00'}h</span>
                                </div>
                                <div class="footer-row" style="margin-top: 6px;"><span><strong>Horas Extras</strong></span></div>
                                <div class="footer-row">
                                    <span>50%: ${totais.total_horas_extras_50?.toFixed(2) || '0.00'}hs</span>
                                    <span>100%: ${totais.total_horas_extras_100?.toFixed(2) || '0.00'}hs</span>
                                </div>
                            </div>
                            <div class="footer-right">
                                <div style="height: 15px;"></div>
                                <div class="footer-row"><span>Funcionário: __________________________________________________________________</span></div>
                                <div class="footer-row" style="margin-top: 18px;"></div>
                                <div class="footer-row"><span>Chefia: ______________________________________________________________________</span></div>
                                <div class="footer-row" style="margin-top: 17px;"></div>
                                <div class="footer-row"><span>Data: ______ / ______ / ______________</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            escreverEExibirJanela(printWindow, htmlCompleto, `Folha de Ponto - ${funcionario.nome_completo}`);
        } else {
            showToast('Bloqueador de pop-ups ativo. Permita pop-ups para este site.', 'error');
        }
    };

    const diasNoMes = getDaysInMonth(mes, ano);
    const days = Array.from({ length: diasNoMes }, (_, i) => i + 1);

    if (loading && !folha) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ToastContainer />

            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/folhas-ponto-automaticas')}
                    className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    Folha de Ponto Automática
                </h1>
            </div>

            {/* Info do Funcionário */}
            {funcionario && (
                <Card>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                        <div><span className="font-semibold">Funcionário:</span> {funcionario.nome_completo}</div>
                        <div><span className="font-semibold">Empresa:</span> {funcionario.empresa?.nome_empresa || funcionario.nome_empresa || 'N/A'}</div>
                        <div><span className="font-semibold">Posto:</span> {funcionario.posto_trabalho?.nome_posto || funcionario.nome_posto || 'N/A'}</div>
                        <div><span className="font-semibold">Cargo:</span> {funcionario.cargo?.nome_cargo || funcionario.nome_cargo || 'N/A'}</div>
                        <div><span className="font-semibold">Escala:</span> {folha?.escala?.codigo_escala || funcionario.codigo_escala || 'N/A'}</div>
                        <div><span className="font-semibold">Período:</span> {meses[mes - 1]}/{ano}</div>
                    </div>
                </Card>
            )}

            {/* Controles */}
            <Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Select label="Mês" value={mes.toString()} onChange={(e) => setMes(Number(e.target.value))}>
                        {meses.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
                    </Select>
                    <Select label="Ano" value={ano.toString()} onChange={(e) => setAno(Number(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Button onClick={gerarFolha} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Recarregar
                    </Button>
                    <Button
                        onClick={() => setModoEdicao(!modoEdicao)}
                        className={modoEdicao ? '!bg-yellow-500 !text-white' : ''}
                    >
                        {modoEdicao ? '🔒 Travar' : '✏️ Editar'}
                    </Button>
                    <Button
                        onClick={handleSalvar}
                        disabled={!folha || submitting}
                        className="!bg-blue-600 !text-white hover:!bg-blue-700"
                    >
                        <Save className="w-4 h-4 mr-1" />
                        {submitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                        onClick={handleImprimir}
                        disabled={!folha}
                        className="!bg-green-600 !text-white hover:!bg-green-700"
                    >
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir
                    </Button>
                    <Button
                        onClick={handleExcluir}
                        disabled={!folha || submitting}
                        className="!bg-red-600 !text-white hover:!bg-red-700"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                    </Button>
                </div>
            </Card>

            {/* Tabela de Ponto */}
            {folha && (
                <Card>
                    {/* Legenda */}
                    <div className="mb-2 flex gap-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-red-50 border border-red-200"></div>
                            <span>Feriado</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-gray-50 border border-gray-200"></div>
                            <span>Folga</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-green-50 border border-green-200"></div>
                            <span>Preenchido via QR Code</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500"></div>
                            <span className="font-semibold text-blue-700">Trabalhou em Folga/Feriado</span>
                        </div>
                    </div>

                    {/* Resumo Mobile */}
                    <div className="lg:hidden bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                        <h5 className="font-semibold text-blue-800 mb-3">📊 Resumo Rápido</h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white rounded p-2">
                                <div className="text-gray-600">Horas Normais</div>
                                <div className="font-bold text-blue-600">{folha.totais.total_horas_normais?.toFixed(2) || '0.00'}h</div>
                            </div>
                            <div className="bg-white rounded p-2">
                                <div className="text-gray-600">Extras 50%</div>
                                <div className="font-bold text-green-600">{folha.totais.total_horas_extras_50?.toFixed(2) || '0.00'}h</div>
                            </div>
                            <div className="bg-white rounded p-2">
                                <div className="text-gray-600">Faltas</div>
                                <div className="font-bold text-red-600">{(folha.totais.total_faltas_justificadas || 0) + (folha.totais.total_faltas_injustificadas || 0)}</div>
                            </div>
                            <div className="bg-white rounded p-2">
                                <div className="text-gray-600">Atrasos</div>
                                <div className="font-bold text-orange-600">{folha.totais.total_atrasos?.toFixed(2) || '0.00'}h</div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 text-xs" style={{ minWidth: '1200px' }}>
                            <thead className="bg-gray-50">
                                <tr>
                                    <th colSpan={5} className="px-2 py-2 text-center font-medium text-gray-500 uppercase">Status</th>
                                    <th colSpan={2} className="px-2 py-2 text-center font-medium text-gray-500 uppercase">Dia</th>
                                    <th colSpan={4} className="px-2 py-2 text-center font-medium text-gray-500 uppercase">Horários</th>
                                    <th colSpan={10} className="px-2 py-2 text-center font-medium text-gray-500 uppercase bg-gray-100">Horas Calculadas</th>
                                </tr>
                                <tr>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Fer.</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Folga</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Atst.</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Falta</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-purple-700 bg-purple-100" title="Suspensão">Susp.</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Dia</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Sem</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-indigo-600 bg-indigo-50" title="Horário previsto pela escala">Previsto</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Entrada</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Iníc Refeição</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Fim Refeição</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500">Saída</th>                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Normal</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Extra 50%</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Extra 100%</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Noturna</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Intra 50%</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-gray-100">Intra 100%</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-red-100">Atrasos</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-yellow-100">Atestados</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-orange-100">Faltas Injustif.</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-purple-100">Suspensões</th>
                                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-blue-100">Folg. Trab.</th>
                                    {modoEdicao && (
                                        <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 bg-red-200">Ações</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {days.map(day => {
                                    const diaKey = `dia_${day}`;
                                    const dia = folha.dadosDias[diaKey];
                                    if (!dia) return null;

                                    const calculo = dia.calculo || {};
                                    const horasExtras = (calculo.horas_extras_50 || 0) + (calculo.horas_extras_100 || 0);
                                    const horasNormais = calculo.horas_normais || 0;
                                    const folgaTrabalhada = horasExtras >= 4 && (dia.folga === true || horasNormais === 0);
                                    const trabalhouEmFolgaOuFeriado = (dia.folga || dia.feriado) && dia.entrada && dia.saida;
                                    const temRegistroQR = dia.entrada && dia.entrada !== '';

                                    return (
                                        <tr
                                            key={day}
                                            className={
                                                trabalhouEmFolgaOuFeriado ? 'bg-blue-50 border-l-4 border-blue-500' :
                                                dia.feriado ? 'bg-red-50' :
                                                dia.folga ? 'bg-gray-50' :
                                                temRegistroQR ? 'bg-green-50/30' :
                                                'hover:bg-gray-50'
                                            }
                                        >
                                            <td className="px-1 py-1 text-center">
                                                <input type="checkbox" checked={dia.feriado || false}
                                                    onChange={(e) => handleAtualizarDia(day, 'feriado', e.target.checked)}
                                                    className="rounded" />
                                            </td>
                                            <td className="px-1 py-1 text-center">
                                                <input type="checkbox" checked={dia.folga || false}
                                                    onChange={(e) => handleAtualizarDia(day, 'folga', e.target.checked)}
                                                    className="rounded" />
                                            </td>
                                            <td className="px-1 py-1 text-center">
                                                <input type="checkbox" checked={dia.atestado || false}
                                                    onChange={(e) => handleAtualizarDia(day, 'atestado', e.target.checked)}
                                                    className="rounded" />
                                            </td>
                                            <td className="px-1 py-1 text-center">
                                                <input type="checkbox" checked={dia.falta_injustificada || false}
                                                    onChange={(e) => handleAtualizarDia(day, 'falta_injustificada', e.target.checked)}
                                                    className="rounded" />
                                            </td>
                                            <td className="px-1 py-1 text-center">
                                                <input type="checkbox" checked={dia.suspensao || false}
                                                    onChange={(e) => handleAtualizarDia(day, 'suspensao', e.target.checked)}
                                                    className="rounded" title="Suspensão disciplinar" />
                                            </td>
                                            <td className="px-1 py-1 text-center font-semibold">{String(day).padStart(2, '0')}/{String(mes).padStart(2, '0')}</td>
                                            <td className="px-1 py-1 text-center">{getWeekday(day, mes, ano)}</td>
                                            <td className="px-1 py-1 text-center bg-indigo-50 text-xs text-indigo-700 font-mono whitespace-nowrap">
                                                {(() => {
                                                    const prev = folha.horariosPrevistos?.[`dia_${day}`];
                                                    if (prev?.entrada && prev?.saida) return `${prev.entrada}–${prev.saida}`;
                                                    const nomeEsc = folha.escala?.codigo_escala || '';
                                                    if (nomeEsc) {
                                                        const diaSem = new Date(ano, mes - 1, day).getDay();
                                                        const gerado = gerarHorariosPadraoEscala(nomeEsc, diaSem);
                                                        if (gerado) return `${gerado.entrada}–${gerado.saida}`;
                                                    }
                                                    return '—';
                                                })()}
                                            </td>
                                            <td className="px-1 py-1">
                                                <input type="time" value={dia.entrada || ''}
                                                    onChange={(e) => handleAtualizarDia(day, 'entrada', e.target.value)}
                                                    className="w-20 text-center border-gray-200 rounded text-xs" />
                                            </td>
                                            <td className="px-1 py-1">
                                                <input type="time" value={dia.inicio_refeicao || ''}
                                                    onChange={(e) => handleAtualizarDia(day, 'inicio_refeicao', e.target.value)}
                                                    className="w-20 text-center border-gray-200 rounded text-xs" />
                                            </td>
                                            <td className="px-1 py-1">
                                                <input type="time" value={dia.termino_refeicao || ''}
                                                    onChange={(e) => handleAtualizarDia(day, 'termino_refeicao', e.target.value)}
                                                    className="w-20 text-center border-gray-200 rounded text-xs" />
                                            </td>
                                            <td className="px-1 py-1">
                                                <input type="time" value={dia.saida || ''}
                                                    onChange={(e) => handleAtualizarDia(day, 'saida', e.target.value)}
                                                    className="w-20 text-center border-gray-200 rounded text-xs" />
                                            </td>
                                            <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_normais?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_extras_50?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_extras_100?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.horas_noturnas?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.intrajornada_50?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-gray-50 text-xs">{calculo.intrajornada_100?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-red-50 text-xs">{calculo.atrasos?.toFixed(2) || '0.00'}</td>
                                            <td className="px-1 py-1 text-center bg-yellow-50 text-xs">{dia.atestado ? '1' : '0'}</td>
                                            <td className="px-1 py-1 text-center bg-orange-50 text-xs">{dia.falta_injustificada ? '1' : '0'}</td>
                                            <td className="px-1 py-1 text-center bg-purple-50 text-xs">{dia.suspensao ? '1' : '0'}</td>
                                            <td className="px-1 py-1 text-center bg-blue-50 text-xs">{folgaTrabalhada ? '1' : '0'}</td>
                                            {modoEdicao && (
                                                <td className="px-1 py-1 text-center bg-red-50">
                                                    <button
                                                        onClick={() => handleExcluirDia(day)}
                                                        className="text-red-600 hover:text-red-800 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold"
                                                    >🗑️</button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {/* Totais */}
                                <tr className="bg-blue-100 font-bold">
                                    <td colSpan={12} className="px-2 py-2 text-right">TOTAIS DO MÊS:</td>
                                    <td className="px-1 py-2 text-center">{folha.totais.total_horas_normais?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center">{folha.totais.total_horas_extras_50?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center">{folha.totais.total_horas_extras_100?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center">{folha.totais.total_horas_noturnas?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center">{folha.totais.total_intrajornada_50?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center">{folha.totais.total_intrajornada_100?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center bg-red-100">{folha.totais.total_atrasos?.toFixed(2) || '0.00'}</td>
                                    <td className="px-1 py-2 text-center bg-yellow-100">{folha.totais.total_faltas_justificadas || '0'}</td>
                                    <td className="px-1 py-2 text-center bg-orange-100">{folha.totais.total_faltas_injustificadas || '0'}</td>
                                    <td className="px-1 py-2 text-center bg-purple-100">{folha.totais.total_suspensoes || '0'}</td>
                                    <td className="px-1 py-2 text-center bg-blue-200">{folha.totais.folgas_trabalhadas || '0'}</td>
                                    {modoEdicao && <td className="px-1 py-2"></td>}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Observações */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Observações sobre a folha de ponto..."
                        />
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AutomaticTimesheetDetail;
