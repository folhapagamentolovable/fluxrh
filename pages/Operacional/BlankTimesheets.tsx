import React, { useState, useEffect } from 'react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import Select from '../../components/ui/Select';
import { abreviarNome } from '../../utils/formatarNome';

interface Funcionario {
    id: number;
    nome_completo: string;
    nome_posto?: string;
    posto_trabalho_id?: number;
    empresa_id?: number;
    cargo?: {
        nome_cargo: string;
        cbo?: string;
    };
    empresa?: {
        id: string;
        nome_empresa: string;
        endereco: string;
        cnpj: string;
        cidade?: string;
        estado?: string;
    };
    posto_trabalho?: {
        id: string;
        endereco?: string;
        cidade?: string;
        estado?: string;
    };
}

interface DadosFolhaPonto {
    entrada?: string;
    saida?: string;
    inicio_refeicao?: string;
    termino_refeicao?: string;
}

const BlankTimesheets: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [loading, setLoading] = useState(false);
    
    // Estados para filtros de impressão
    const [empresas, setEmpresas] = useState<Array<{id: string, nome_empresa: string}>>([]);
    const [postos, setPostos] = useState<Array<{id: string, nome_posto: string}>>([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
    const [postoSelecionado, setPostoSelecionado] = useState<string>('');

    useEffect(() => {
        carregarFuncionarios();
        carregarEmpresasEPostos();
    }, []);

    const carregarEmpresasEPostos = async () => {
        try {
            // Carregar empresas
            const { data: empresasData } = await supabase
                .from('empresas')
                .select('id, nome_empresa')
                .order('nome_empresa');
            
            // Carregar postos de trabalho (apenas postos principais — sem local_area)
            const { data: postosData } = await supabase
                .from('postos_trabalho')
                .select('id, nome_posto')
                .eq('ativo', true)
                .is('local_area', null)
                .order('nome_posto');
            
            setEmpresas(empresasData || []);
            setPostos(postosData || []);
        } catch (error) {
        }
    };

    const carregarFuncionarios = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('funcionarios')
                .select(`
                    id,
                    nome_completo,
                    nome_posto,
                    posto_trabalho_id,
                    empresa_id,
                    demitido,
                    cargo:cargos(nome_cargo, cbo),
                    empresa:empresas(id, nome_empresa, endereco, cnpj, cidade, estado),
                    posto_trabalho:postos_trabalho(id, endereco, cidade, estado)
                `)
                .eq('ativo', true)
                .eq('demitido', false) // ✅ FILTRO - apenas funcionários não demitidos
                .order('nome_completo');

            if (error) throw error;
            // Type assertion para lidar com o formato de retorno do Supabase
            setFuncionarios((data || []) as any as Funcionario[]);
        } catch (error) {
            showToast('Erro ao carregar funcionários', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Busca feriados do banco para o mês/ano selecionado, filtrados pela cidade/estado do posto
    const buscarFeriadosDoMes = async (
        ano: string,
        mes: string,
        cidade?: string | null,
        estado?: string | null
    ): Promise<Set<number>> => {
        const anoNum = Number.parseInt(ano);
        const mesNum = Number.parseInt(mes);
        const dataInicio = `${anoNum}-${mesNum.toString().padStart(2, '0')}-01`;
        const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
        const dataFim = `${anoNum}-${mesNum.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('feriados')
            .select('*')
            .gte('data_feriado', dataInicio)
            .lte('data_feriado', dataFim);

        if (error || !data) return new Set();

        const { filtrarFeriadosPorLocalidade } = await import('../../utils/feriadosFilter');
        const filtrados = filtrarFeriadosPorLocalidade(data, cidade, estado);

        return new Set(
            filtrados.map((f: any) => new Date(f.data_feriado + 'T00:00:00').getDate())
        );
    };

    // Gera o HTML de uma folha de ponto para um funcionário
    const gerarHtmlFolhaPonto = async (funcionario: Funcionario, ano: string, mes: string) => {
        const mesNome = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ][Number.parseInt(mes) - 1];

        const diasNoMes = new Date(Number.parseInt(ano), Number.parseInt(mes), 0).getDate();
        
        const feriadosDoMes = await buscarFeriadosDoMes(
            ano,
            mes,
            (funcionario as any).posto_trabalho?.cidade,
            (funcionario as any).posto_trabalho?.estado
        );

        let dadosHorarios: DadosFolhaPonto = {};

        // 1ª fonte: folha de ponto já registrada
        try {
            const { data: folhaPonto } = await supabase
                .from('folhas_ponto')
                .select('dados_dias')
                .eq('funcionario_id', funcionario.id)
                .eq('mes', Number.parseInt(mes))
                .eq('ano', Number.parseInt(ano))
                .single();

            if (folhaPonto?.dados_dias) {
                const dados = typeof folhaPonto.dados_dias === 'string' 
                    ? JSON.parse(folhaPonto.dados_dias) 
                    : folhaPonto.dados_dias;
                
                const diasComDados = Object.keys(dados);
                for (const dia of diasComDados) {
                    const dadosDia = dados[dia];
                    if (dadosDia && (dadosDia.entrada || dadosDia.saida)) {
                        dadosHorarios = {
                            entrada: dadosDia.entrada,
                            saida: dadosDia.saida,
                            inicio_refeicao: dadosDia.inicio_refeicao,
                            termino_refeicao: dadosDia.termino_refeicao
                        };
                        break;
                    }
                }
            }
        } catch {
            // Folha de ponto não encontrada, tenta próxima fonte
        }

        // 2ª fonte: regras_escalas via escala_mensal (horários atualizados)
        if (!dadosHorarios.entrada) {
            try {
                const { data: escalaMensal } = await supabase
                    .from('escala_mensal')
                    .select('escala_id, dias_trabalhados')
                    .eq('funcionario_id', funcionario.id)
                    .eq('mes', Number.parseInt(mes))
                    .eq('ano', Number.parseInt(ano))
                    .maybeSingle();

                // ⭐ Priorizar codigo_escala atual do funcionário (override individual)
                let escalaIdResolvida = escalaMensal?.escala_id;
                const codigoEscalaFunc = (funcionario as any).codigo_escala;
                if (codigoEscalaFunc) {
                    const { data: regraAtual } = await supabase
                        .from('regras_escalas')
                        .select('id')
                        .eq('codigo_escala', codigoEscalaFunc)
                        .eq('ativa', true)
                        .maybeSingle();
                    if (regraAtual?.id) escalaIdResolvida = regraAtual.id;
                }

                if (escalaIdResolvida) {
                    // Busca horários diretamente da regra de escala
                    const { data: regraEscala } = await supabase
                        .from('regras_escalas')
                        .select('horarios_segunda, horarios_terca, horarios_quarta, horarios_quinta, horarios_sexta')
                        .eq('id', escalaIdResolvida)
                        .single();

                    if (regraEscala) {
                        // Pega o horário de um dia útil (segunda a sexta)
                        const horarioDiaUtil = regraEscala.horarios_segunda 
                            || regraEscala.horarios_terca 
                            || regraEscala.horarios_quarta 
                            || regraEscala.horarios_quinta 
                            || regraEscala.horarios_sexta;

                        if (horarioDiaUtil?.entrada) {
                            dadosHorarios = {
                                entrada: horarioDiaUtil.entrada,
                                saida: horarioDiaUtil.saida,
                                inicio_refeicao: horarioDiaUtil.inicio_almoco,
                                termino_refeicao: horarioDiaUtil.termino_almoco
                            };
                        }
                    }
                }

                // Fallback: busca horários dos dias_trabalhados da escala mensal
                if (!dadosHorarios.entrada && escalaMensal?.dias_trabalhados) {
                    const dias = Array.isArray(escalaMensal.dias_trabalhados)
                        ? escalaMensal.dias_trabalhados
                        : JSON.parse(escalaMensal.dias_trabalhados);

                    const diaUtil = dias.find((d: any) => d.status === 'TRABALHO' && d.entrada);
                    if (diaUtil) {
                        dadosHorarios = {
                            entrada: diaUtil.entrada,
                            saida: diaUtil.saida,
                            inicio_refeicao: diaUtil.inicio_refeicao,
                            termino_refeicao: diaUtil.termino_refeicao
                        };
                    }
                }
            } catch {
                // Escala não encontrada, usa padrão
            }
        }

        const horarios = {
            entrada: dadosHorarios.entrada || '08:00',
            saida: dadosHorarios.saida || '17:00',
            inicio_refeicao: dadosHorarios.inicio_refeicao || '12:00',
            termino_refeicao: dadosHorarios.termino_refeicao || '13:00'
        };

        const horasMensais = 220;
        
        const obterDiaSemana = (dia: number) => {
            return new Date(Number.parseInt(ano), Number.parseInt(mes) - 1, dia).getDay();
        };

        const obterObservacao = (dia: number) => {
            if (feriadosDoMes.has(dia)) return 'FER.';
            const diaSemana = obterDiaSemana(dia);
            if (diaSemana === 0) return 'Dom';
            if (diaSemana === 6) return 'Sáb';
            return '';
        };
        
        const formatarCBO = (cbo?: string) => {
            if (!cbo) return '';
            const numeros = cbo.replace(/\D/g, '');
            if (numeros.length >= 4) {
                return `${numeros.substring(0, 4)}-${numeros.substring(4, 6)}`;
            }
            return cbo;
        };

        const formatarCidadeEstado = (cidade?: string, estado?: string) => {
            if (!cidade && !estado) return '';
            if (cidade && estado) return `${cidade} - ${estado}`;
            return cidade || estado || '';
        };

        return `
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
                                    <span class="info-value">${funcionario.empresa?.nome_empresa || ''}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Endereço:</span>
                                    <span class="info-value">${funcionario.empresa?.endereco || ''}</span>
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
                                    <span class="info-value">${formatarCBO(funcionario.cargo?.cbo)}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Cargo:</span>
                                    <span class="info-value">${funcionario.cargo?.nome_cargo || ''}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Posto/Setor:</span>
                                    <span class="info-value">${funcionario.nome_posto || ''}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Endereço:</span>
                                    <span class="info-value">${funcionario.posto_trabalho?.endereco || ''} ${formatarCidadeEstado(funcionario.posto_trabalho?.cidade, funcionario.posto_trabalho?.estado)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="info-right">
                            <div class="cnpj-content">
                                <div class="cnpj-line">CNPJ: ${funcionario.empresa?.cnpj || ''}</div>
                                <div class="empresa-line">${funcionario.empresa?.nome_empresa || ''}</div>
                                <div class="endereco-line">${funcionario.empresa?.endereco || ''} ${formatarCidadeEstado(funcionario.empresa?.cidade, funcionario.empresa?.estado)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="periodo-dados-section">
                        <div class="periodo-row">
                            <span class="periodo-label">Período:</span>
                            <span class="periodo-value">01/${mes}/${ano}</span>
                            <span class="periodo-a">a</span>
                            <span class="periodo-value">${diasNoMes}/${mes}/${ano}</span>
                        </div>
                        <div class="periodo-row">
                            <span class="periodo-label">Hr./Mês:</span>
                            <span class="periodo-value">${horasMensais.toFixed(2).replace('.', ',')}</span>
                            <span class="periodo-label-mid">C.B.O.:</span>
                            <span class="periodo-value">${formatarCBO(funcionario.cargo?.cbo)}</span>
                            <span class="periodo-label-mid">Horário:</span>
                            <span class="periodo-value">${horarios.entrada}</span>
                            <span class="periodo-as">às</span>
                            <span class="periodo-value">${horarios.saida}</span>
                            <span class="periodo-label-mid">Intervalo:</span>
                            <span class="periodo-value">${horarios.inicio_refeicao}</span>
                            <span class="periodo-as">às</span>
                            <span class="periodo-value">${horarios.termino_refeicao}</span>
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
                            ${Array.from({ length: 16 }, (_, i) => {
                                const dia1 = i + 1;
                                const dia2 = i + 17;
                                
                                // Bloco 1 (esquerda): dias 1 a 15 + linha branca (dia 16 no loop, mas exibimos vazio)
                                let conteudoDia1 = "";
                                if (dia1 <= 15) {
                                    const obs1 = obterObservacao(dia1);
                                    conteudoDia1 = `
                                        <td class="day-cell">${dia1.toString().padStart(2, '0')}</td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="obs-cell">${obs1}</td>
                                    `;
                                } else {
                                    // Última linha do bloco da esquerda em branco
                                    conteudoDia1 = `
                                        <td class="day-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="obs-cell"></td>
                                    `;
                                }

                                // Bloco 2 (direita): dias 16 a 31
                                let conteudoDia2 = "";
                                const realDia2 = dia2 - 1; // Ajuste para começar do 16
                                if (realDia2 <= diasNoMes) {
                                    const obs2 = obterObservacao(realDia2);
                                    conteudoDia2 = `
                                        <td class="day-cell">${realDia2.toString().padStart(2, '0')}</td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="obs-cell">${obs2}</td>
                                    `;
                                } else {
                                    conteudoDia2 = `
                                        <td class="day-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="time-cell"></td>
                                        <td class="obs-cell"></td>
                                    `;
                                }
                                
                                return `
                                    <tr>
                                        ${conteudoDia1}
                                        ${conteudoDia2}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer-section">
                        <div class="footer-left">
                            <div class="footer-row"><span><strong>Faltas</strong></span></div>
                            <div class="footer-row">
                                <span>Justif.:</span><span class="signature-line"></span>
                                <span>Não Justif.:</span><span class="signature-line"></span>
                            </div>
                            <div class="footer-row" style="margin-top: 6px;"><span><strong>Atrasos</strong></span></div>
                            <div class="footer-row">
                                <span>Justif.:</span><span class="signature-line"></span>
                                <span>Não Justif.:</span><span class="signature-line"></span>
                            </div>
                            <div class="footer-row" style="margin-top: 6px;"><span><strong>Horas Extras</strong></span></div>
                            <div class="footer-row">
                                <span>50%:</span><span class="signature-line"></span><span>hs</span>
                                <span>100%:</span><span class="signature-line"></span><span>hs</span>
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
                    <div class="portaria-obs">Obs.: Este documento substitui o Quadro de Horário de Trabalho, de acordo com o disposto na Portaria Minister08/09/19822 de 08/09/1982.</div>
                </div>
            </div>
        `;
    };

    // CSS compartilhado para impressão
    const getEstilosImpressao = () => `
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
            flex: 1;
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
            margin-bottom: 4px;
        }
        
        .timesheet-table th,
        .timesheet-table td {
            border: 1px solid black;
            padding: 1px;
            text-align: center;
            height: 32px;
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
        
        .portaria-obs {
            margin-top: 6px;
            font-size: 9px;
            font-style: italic;
            color: #333;
        }
    `;

    // Função para abrir UMA única janela de impressão com múltiplas folhas
    const abrirJanelaImpressao = async (funcionariosParaImprimir: Funcionario[], titulo: string) => {
        if (funcionariosParaImprimir.length === 0) {
            showToast('Nenhum funcionário encontrado', 'error');
            return;
        }

        setLoading(true);
        showToast(`Preparando ${funcionariosParaImprimir.length} folhas para impressão...`, 'info');

        const anoStr = ano.toString();
        const mesStr = mes.toString().padStart(2, '0');
        const mesNome = meses[mes - 1];

        try {
            // Gerar HTML de todas as folhas de ponto
            const folhasHtml: string[] = [];
            for (const funcionario of funcionariosParaImprimir) {
                const html = await gerarHtmlFolhaPonto(funcionario, anoStr, mesStr);
                folhasHtml.push(html);
            }

            // Criar UMA única janela de impressão
            const printWindow = globalThis.open('', '_blank');
            if (!printWindow) {
                showToast('Bloqueador de pop-ups ativo. Permita pop-ups para este site.', 'error');
                setLoading(false);
                return;
            }

            const htmlCompleto = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${titulo} - ${mesNome}/${ano}</title>
                    <style>
                        ${getEstilosImpressao()}
                    </style>
                </head>
                <body>
                    ${folhasHtml.join('')}
                </body>
                </html>
            `;

            escreverEExibirJanela(printWindow, htmlCompleto, 'Folhas de Ponto em Branco');

            showToast(`${funcionariosParaImprimir.length} folhas prontas para impressão!`, 'success');
        } catch (error) {
            showToast('Erro ao preparar impressão', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Impressão individual (mantém comportamento original)
    const imprimirFolhaEmBranco = async (funcionario: Funcionario) => {
        await abrirJanelaImpressao([funcionario], `Folha de Ponto - ${funcionario.nome_completo}`);
    };

    const imprimirTodasFolhasEmBranco = async () => {
        await abrirJanelaImpressao(funcionarios, 'Folhas de Ponto - Todos os Funcionários');
    };

    const imprimirPorEmpresa = async () => {
        if (!empresaSelecionada) {
            showToast('Selecione uma empresa', 'error');
            return;
        }

        const funcionariosDaEmpresa = funcionarios.filter(func => 
            func.empresa_id?.toString() === empresaSelecionada
        );

        const nomeEmpresa = empresas.find(emp => emp.id === empresaSelecionada)?.nome_empresa || 'Empresa';
        await abrirJanelaImpressao(funcionariosDaEmpresa, `Folhas de Ponto - ${nomeEmpresa}`);
    };

    const imprimirPorPosto = async () => {
        if (!postoSelecionado) {
            showToast('Selecione um posto de trabalho', 'error');
            return;
        }

        const funcionariosDoPosto = funcionarios.filter(func => 
            func.posto_trabalho_id?.toString() === postoSelecionado
        );

        const nomePosto = postos.find(posto => posto.id === postoSelecionado)?.nome_posto || 'Posto';
        await abrirJanelaImpressao(funcionariosDoPosto, `Folhas de Ponto - ${nomePosto}`);
    };

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Folhas de Ponto em Branco</h1>

            {/* Controles */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Select
                        label="Mês"
                        value={mes.toString()}
                        onChange={(e) => setMes(Number(e.target.value))}
                    >
                        {meses.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </Select>
                    
                    <Select
                        label="Ano"
                        value={ano.toString()}
                        onChange={(e) => setAno(Number(e.target.value))}
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Select>

                    {/* Seleção de Empresa */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por Empresa
                        </label>
                        <select
                            value={empresaSelecionada}
                            onChange={(e) => setEmpresaSelecionada(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecione uma empresa</option>
                            {empresas.map(empresa => (
                                <option key={empresa.id} value={empresa.id}>
                                    {empresa.nome_empresa}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Seleção de Posto */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por Posto
                        </label>
                        <select
                            value={postoSelecionado}
                            onChange={(e) => setPostoSelecionado(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecione um posto</option>
                            {postos.map(posto => (
                                <option key={posto.id} value={posto.id}>
                                    {posto.nome_posto}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* Botões de Impressão */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <button
                        onClick={imprimirPorEmpresa}
                        disabled={loading || !empresaSelecionada}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        Imprimir por Empresa
                    </button>
                    <button
                        onClick={imprimirPorPosto}
                        disabled={loading || !postoSelecionado}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        Imprimir por Posto
                    </button>
                    <button
                        onClick={imprimirTodasFolhasEmBranco}
                        disabled={loading || funcionarios.length === 0}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        Imprimir Todas
                    </button>
                </div>

                {/* Informações */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Informações:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• As folhas são impressas em formato retrato (A4)</li>
                        <li>• Cada folha contém campos para preenchimento manual dos horários</li>
                        <li>• Total de funcionários ativos: <strong>{funcionarios.length}</strong></li>
                        <li>• Período selecionado: <strong>{meses[mes - 1]}/{ano}</strong></li>
                        {empresaSelecionada && (
                            <li>• Empresa selecionada: <strong>{empresas.find(emp => emp.id === empresaSelecionada)?.nome_empresa}</strong></li>
                        )}
                        {postoSelecionado && (
                            <li>• Posto selecionado: <strong>{postos.find(posto => posto.id === postoSelecionado)?.nome_posto}</strong></li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Lista de Funcionários */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Funcionários Ativos</h2>
                
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Carregando funcionários...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {funcionarios.map(func => (
                            <div key={func.id} className="border border-gray-200 rounded-md p-3 hover:bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900 text-sm">{abreviarNome(func.nome_completo)}</h3>
                                        <p className="text-xs text-gray-600 mt-1">{func.cargo?.nome_cargo}</p>
                                        <p className="text-xs text-gray-500 mt-1">{func.empresa?.nome_empresa}</p>
                                    </div>
                                    <button
                                        onClick={() => imprimirFolhaEmBranco(func)}
                                        className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
                                    >
                                        Imprimir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlankTimesheets;