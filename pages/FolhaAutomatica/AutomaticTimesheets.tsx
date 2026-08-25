import React, { useState, useEffect, useCallback } from 'react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import Select from '../../components/ui/Select';
import { Printer, FileText, RefreshCw, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Funcionario {
    id: string;
    nome_completo: string;
    nome_posto?: string;
    posto_trabalho_id?: string;
    empresa_id?: string;
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

interface RegistroPontoAutomatico {
    id: string;
    funcionario_id: string;
    posto_trabalho_id: string;
    nome_funcionario: string;
    nome_posto: string;
    data_registro: string;
    primeiro_registro: string | null;
    segundo_registro: string | null;
    terceiro_registro: string | null;
    quarto_registro: string | null;
    status: 'aberto' | 'finalizado' | 'invalido';
    observacoes: string | null;
}

interface DadosDia {
    entrada: string;
    saida_refeicao: string;
    retorno_refeicao: string;
    saida: string;
    observacao: string;
}

const AutomaticTimesheets: React.FC = () => {
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [registrosPonto, setRegistrosPonto] = useState<RegistroPontoAutomatico[]>([]);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [loadingRegistros, setLoadingRegistros] = useState(false);
    
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Estados para filtros de impressão
    const [empresas, setEmpresas] = useState<Array<{id: string, nome_empresa: string}>>([]);
    const [postos, setPostos] = useState<Array<{id: string, nome_posto: string}>>([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
    const [postoSelecionado, setPostoSelecionado] = useState<string>('');

    // Estatísticas
    const [estatisticas, setEstatisticas] = useState({
        totalFuncionarios: 0,
        comRegistros: 0,
        completos: 0,
        pendentes: 0
    });

    useEffect(() => {
        carregarFuncionarios();
        carregarEmpresasEPostos();
    }, []);

    useEffect(() => {
        if (funcionarios.length > 0) {
            carregarRegistrosPonto();
        }
    }, [mes, ano, funcionarios]);

    const carregarEmpresasEPostos = async () => {
        try {
            const { data: empresasData } = await supabase
                .from('empresas')
                .select('id, nome_empresa')
                .order('nome_empresa');
            
            const { data: postosData } = await supabase
                .from('postos_trabalho')
                .select('id, nome_posto')
                .eq('ativo', true)
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
                .eq('demitido', false)
                .order('nome_completo');

            if (error) throw error;
            setFuncionarios((data || []) as any as Funcionario[]);
        } catch (error) {
            showToast('Erro ao carregar funcionários', 'error');
        } finally {
            setLoading(false);
        }
    };

    const carregarRegistrosPonto = useCallback(async () => {
        try {
            setLoadingRegistros(true);
            
            // Calcular período do mês
            const primeiroDia = `${ano}-${mes.toString().padStart(2, '0')}-01`;
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const ultimoDiaStr = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia.toString().padStart(2, '0')}`;
            
            const { data, error } = await supabase
                .from('folha_ponto_automatica')
                .select('*')
                .gte('data_registro', primeiroDia)
                .lte('data_registro', ultimoDiaStr)
                .order('data_registro', { ascending: true });

            if (error) throw error;
            
            setRegistrosPonto(data as RegistroPontoAutomatico[] || []);
            
            // Calcular estatísticas
            const funcionariosComRegistros = new Set(data?.map(r => r.funcionario_id) || []);
            const registrosCompletos = data?.filter(r => r.status === 'finalizado') || [];
            const registrosPendentes = data?.filter(r => r.status === 'aberto') || [];
            
            setEstatisticas({
                totalFuncionarios: funcionarios.length,
                comRegistros: funcionariosComRegistros.size,
                completos: registrosCompletos.length,
                pendentes: registrosPendentes.length
            });
            
        } catch (error) {
            showToast('Erro ao carregar registros de ponto', 'error');
        } finally {
            setLoadingRegistros(false);
        }
    }, [mes, ano, funcionarios.length]);

    // Obter registros de um funcionário para o mês
    const getRegistrosFuncionario = (funcionarioId: string): Map<number, DadosDia> => {
        const mapaRegistros = new Map<number, DadosDia>();
        
        const registrosFuncionario = registrosPonto.filter(r => r.funcionario_id === funcionarioId);
        
        for (const registro of registrosFuncionario) {
            const dia = new Date(registro.data_registro + 'T12:00:00').getDate();
            mapaRegistros.set(dia, {
                entrada: registro.primeiro_registro || '',
                saida_refeicao: registro.segundo_registro || '',
                retorno_refeicao: registro.terceiro_registro || '',
                saida: registro.quarto_registro || '',
                observacao: registro.status === 'invalido' ? 'Inv' : (registro.observacoes ? 'Obs' : '')
            });
        }
        
        return mapaRegistros;
    };

    // Gera o HTML de uma folha de ponto automática
    const gerarHtmlFolhaPontoAutomatica = (funcionario: Funcionario) => {
        const mesNome = meses[mes - 1];
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const registros = getRegistrosFuncionario(funcionario.id);
        
        const horasMensais = 220;
        
        const obterDiaSemana = (dia: number) => {
            return new Date(ano, mes - 1, dia).getDay();
        };

        const verificarFeriado = (dia: number) => {
            const feriadosFixos = [
                { mes: 1, dia: 1 }, { mes: 4, dia: 21 }, { mes: 5, dia: 1 },
                { mes: 9, dia: 7 }, { mes: 10, dia: 12 }, { mes: 11, dia: 2 },
                { mes: 11, dia: 15 }, { mes: 12, dia: 25 }
            ];
            return feriadosFixos.some(f => f.mes === mes && f.dia === dia);
        };

        const obterObservacao = (dia: number, obsRegistro: string) => {
            if (obsRegistro) return obsRegistro;
            if (verificarFeriado(dia)) return 'Fer';
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
                                    <span class="info-value-small">${formatarCBO(funcionario.cargo?.cbo)}</span>
                                    <span class="info-label-inline">Cargo:</span>
                                    <span class="info-value-inline">${funcionario.cargo?.nome_cargo || ''}</span>
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
                            <span class="periodo-value">01/${mes.toString().padStart(2, '0')}/${ano}</span>
                            <span class="periodo-a">a</span>
                            <span class="periodo-value">${diasNoMes}/${mes.toString().padStart(2, '0')}/${ano}</span>
                        </div>
                        <div class="periodo-row">
                            <span class="periodo-label">Hr./Mês:</span>
                            <span class="periodo-value">${horasMensais.toFixed(2).replace('.', ',')}</span>
                            <span class="periodo-label-mid">C.B.O.:</span>
                            <span class="periodo-value">${formatarCBO(funcionario.cargo?.cbo)}</span>
                        </div>
                        <div class="periodo-row">
                            <span class="periodo-label">Horário:</span>
                            <span class="periodo-value">08:00</span>
                            <span class="periodo-as">às</span>
                            <span class="periodo-value">17:00</span>
                            <span class="periodo-label-mid">Intervalo:</span>
                            <span class="periodo-value">12:00</span>
                            <span class="periodo-as">às</span>
                            <span class="periodo-value">13:00</span>
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
                            ${Array.from({ length: 15 }, (_, i) => {
                                const dia1 = i + 1;
                                const dia2 = i + 16;
                                const dados1 = registros.get(dia1);
                                const dados2 = registros.get(dia2);
                                const obs1 = obterObservacao(dia1, dados1?.observacao || '');
                                const obs2 = dia2 <= diasNoMes ? obterObservacao(dia2, dados2?.observacao || '') : '';
                                
                                return `
                                    <tr>
                                        <td class="day-cell">${dia1.toString().padStart(2, '0')}</td>
                                        <td class="time-cell">${dados1?.entrada || ''}</td>
                                        <td class="time-cell">${dados1?.saida_refeicao || ''}</td>
                                        <td class="time-cell">${dados1?.retorno_refeicao || ''}</td>
                                        <td class="time-cell">${dados1?.saida || ''}</td>
                                        <td class="obs-cell">${obs1}</td>
                                        <td class="day-cell">${dia2 <= diasNoMes ? dia2.toString().padStart(2, '0') : ''}</td>
                                        <td class="time-cell">${dia2 <= diasNoMes ? (dados2?.entrada || '') : ''}</td>
                                        <td class="time-cell">${dia2 <= diasNoMes ? (dados2?.saida_refeicao || '') : ''}</td>
                                        <td class="time-cell">${dia2 <= diasNoMes ? (dados2?.retorno_refeicao || '') : ''}</td>
                                        <td class="time-cell">${dia2 <= diasNoMes ? (dados2?.saida || '') : ''}</td>
                                        <td class="obs-cell">${obs2}</td>
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
        
        .auto-badge {
            background-color: #e3f2fd;
            color: #1565c0;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
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
            height: 40px;
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
        
        .time-cell { 
            width: 35px; 
        }
        
        .time-cell.filled {
            background-color: #ffffff;
            font-weight: 500;
        }
        
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
        
        .summary-value {
            font-weight: bold;
            margin-left: 10px;
        }
        
        .stamp-section {
            margin-top: 8px;
            text-align: center;
            font-size: 8px;
            color: #666;
            font-style: italic;
        }
        
        .stamp-text {
            padding: 2px 8px;
            border: 1px dashed #ccc;
            display: inline-block;
            width: 60px;
            border-bottom: 1px solid black;
            margin: 0 5px;
        }
    `;

    // Função para abrir janela de impressão
    const abrirJanelaImpressao = async (funcionariosParaImprimir: Funcionario[], titulo: string) => {
        if (funcionariosParaImprimir.length === 0) {
            showToast('Nenhum funcionário encontrado', 'error');
            return;
        }

        setLoading(true);
        showToast(`Preparando ${funcionariosParaImprimir.length} folhas para impressão...`, 'info');

        const mesNome = meses[mes - 1];

        try {
            const folhasHtml: string[] = [];
            for (const funcionario of funcionariosParaImprimir) {
                const html = gerarHtmlFolhaPontoAutomatica(funcionario);
                folhasHtml.push(html);
            }

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

            escreverEExibirJanela(printWindow, htmlCompleto, 'Folhas de Ponto Automáticas');

            showToast(`${funcionariosParaImprimir.length} folhas prontas para impressão!`, 'success');
        } catch (error) {
            showToast('Erro ao preparar impressão', 'error');
        } finally {
            setLoading(false);
        }
    };

    const imprimirFolhaIndividual = async (funcionario: Funcionario) => {
        await abrirJanelaImpressao([funcionario], `Folha de Ponto Automática - ${funcionario.nome_completo}`);
    };

    const imprimirTodasFolhas = async () => {
        await abrirJanelaImpressao(funcionarios, 'Folhas de Ponto Automáticas - Todos os Funcionários');
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
        await abrirJanelaImpressao(funcionariosDaEmpresa, `Folhas de Ponto Automáticas - ${nomeEmpresa}`);
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
        await abrirJanelaImpressao(funcionariosDoPosto, `Folhas de Ponto Automáticas - ${nomePosto}`);
    };

    // Verificar se funcionário tem registros no mês
    const temRegistros = (funcionarioId: string) => {
        return registrosPonto.some(r => r.funcionario_id === funcionarioId);
    };

    const getStatusFuncionario = (funcionarioId: string) => {
        const registros = registrosPonto.filter(r => r.funcionario_id === funcionarioId);
        if (registros.length === 0) return 'sem-registros';
        
        const pendentes = registros.filter(r => r.status === 'aberto');
        if (pendentes.length > 0) return 'pendente';
        
        return 'completo';
    };

    return (
        <div className="space-y-4 lg:space-y-6 px-2 sm:px-0">
            <ToastContainer />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Folhas de Ponto Automáticas</h1>

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
                        {[2024, 2025, 2026, 2027].map(y => (
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
                        onClick={imprimirTodasFolhas}
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
                        <li>• Os registros são preenchidos automaticamente a partir das leituras de QR Code</li>
                        <li>• As folhas são impressas em formato retrato (A4)</li>
                        <li>• Total de funcionários ativos: <strong>{funcionarios.length}</strong></li>
                        <li>• Período selecionado: <strong>{meses[mes - 1]}/{ano}</strong></li>
                        <li>• Total de registros no período: <strong>{registrosPonto.length}</strong></li>
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
                
                {loading || loadingRegistros ? (
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
                                        <h3 className="font-medium text-gray-900 text-sm">{func.nome_completo}</h3>
                                        <p className="text-xs text-gray-600 mt-1">{func.cargo?.nome_cargo}</p>
                                        <p className="text-xs text-gray-500 mt-1">{func.empresa?.nome_empresa}</p>
                                    </div>
                                    <button
                                        onClick={() => imprimirFolhaIndividual(func)}
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

export default AutomaticTimesheets;
