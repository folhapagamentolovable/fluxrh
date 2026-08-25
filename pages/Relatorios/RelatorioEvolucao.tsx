import React, { useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { supabase } from '../../lib/supabase';
import { useFuncionariosAtivos, usePostosTrabalho } from '../../hooks/useSupabase';
import { useToast } from '../../hooks/useToast';
import { escreverEExibirJanela } from '../../utils/printUtils';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    REPORT_COLORS, REPORT_FONT, REPORT_FONT_SIZE, REPORT_PRINT_CSS,
    ReportTH, ReportRow, ReportSectionRow, ReportEmptyState,
    estiloPorGrupo, type GrupoLinha,
} from './shared/ReportStyles';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Linha = { label: string; campo?: string; grupo: GrupoLinha };

const LINHAS: Linha[] = [
    { grupo: 'SECTION', label: 'PROVENTOS' },
    { grupo: 'PROV', label: 'Salário Base', campo: 'salario_base' },
    { grupo: 'PROV', label: 'Horas Extras 50%', campo: 'horas_extras_50' },
    { grupo: 'PROV', label: 'Horas Extras 100%', campo: 'horas_extras_100' },
    { grupo: 'PROV', label: 'Adicional Noturno', campo: 'adicional_noturno' },
    { grupo: 'PROV', label: 'Intrajornada 50%', campo: 'intrajornada_50' },
    { grupo: 'PROV', label: 'Intrajornada 100%', campo: 'intrajornada_100' },
    { grupo: 'PROV', label: 'DSR s/ Horas Extras', campo: 'dsr_horas_extras' },
    { grupo: 'PROV', label: 'DSR s/ Adic. Noturno', campo: 'dsr_adicional_noturno' },
    { grupo: 'PROV', label: 'Adic. Insalubridade', campo: 'adicional_insalubridade' },
    { grupo: 'PROV', label: 'Adic. Acúmulo de Função', campo: 'adicional_acumulo_funcao' },
    { grupo: 'PROV', label: 'Salário Família', campo: 'salario_familia' },
    { grupo: 'PROV', label: 'Supervisão Palmeiras', campo: 'supervisao_palmeiras' },
    { grupo: 'PROV', label: 'Complemento de Salário', campo: 'complemento_salario' },
    { grupo: 'PROV', label: '13º (1ª Parcela)', campo: 'decimo_terceiro_primeira_parcela' },
    { grupo: 'PROV', label: '13º (2ª Parcela)', campo: 'decimo_terceiro_segunda_parcela' },
    { grupo: 'PROV', label: '13º Integral', campo: 'decimo_terceiro_integral' },
    { grupo: 'SUBTOTAL', label: 'TOTAL PROVENTOS', campo: 'total_proventos' },

    { grupo: 'SECTION', label: 'DESCONTOS' },
    { grupo: 'DESC', label: 'INSS', campo: 'desconto_inss' },
    { grupo: 'DESC', label: 'IRRF', campo: 'desconto_irrf' },
    { grupo: 'DESC', label: 'INSS 13º', campo: 'inss_13' },
    { grupo: 'DESC', label: 'Vale Transporte (6%)', campo: 'desconto_vt' },
    { grupo: 'DESC', label: 'Seguro de Vida', campo: 'desconto_seguro_vida' },
    { grupo: 'DESC', label: 'Convênio Odontológico', campo: 'desconto_convenio_odonto' },
    { grupo: 'DESC', label: 'Contrib. Assistencial', campo: 'desconto_contribuicao_assistencial' },
    { grupo: 'DESC', label: 'Atrasos', campo: 'desconto_atrasos' },
    { grupo: 'DESC', label: 'Faltas', campo: 'desconto_faltas' },
    { grupo: 'DESC', label: 'DSR s/ Faltas', campo: 'desconto_dsr_faltas' },
    { grupo: 'DESC', label: 'Pensão Alimentícia', campo: 'desconto_pensao_alimenticia' },
    { grupo: 'DESC', label: 'Adiantam. Quinzenal', campo: 'desconto_adiantamento_quinzenal' },
    { grupo: 'DESC', label: 'Adiantam. de Salário', campo: 'desconto_adiantamento_salario' },
    { grupo: 'DESC', label: 'Adiantam. 13º', campo: 'adiantamento_13_salario' },
    { grupo: 'DESC', label: 'Complemento Anterior', campo: 'desconto_complemento_anterior' },
    { grupo: 'DESC', label: 'Avaria Utilitário', campo: 'desc_avaria_utilitario' },
    { grupo: 'DESC', label: 'Rondas Não Realizadas', campo: 'desconto_rondas_nao_realizadas' },
    { grupo: 'SUBTOTAL', label: 'TOTAL DESCONTOS', campo: 'total_descontos' },

    { grupo: 'LIQUIDO', label: 'SALÁRIO LÍQUIDO (Proventos - Descontos)' },

    { grupo: 'SECTION', label: 'BENEFÍCIOS' },
    { grupo: 'BENEF', label: 'VT (mês anterior)', campo: 'vale_transporte_mes_anterior' },
    { grupo: 'BENEF', label: 'VT (mês atual)', campo: 'vale_transporte_mes_atual' },
    { grupo: 'BENEF', label: 'VA (mês anterior)', campo: 'vale_alimentacao_mes_anterior' },
    { grupo: 'BENEF', label: 'VA (mês atual)', campo: 'vale_alimentacao_mes_atual' },
    { grupo: 'BENEF', label: 'Cesta Básica', campo: 'cesta_basica' },
    { grupo: 'BENEF', label: 'PLR', campo: 'plr' },
    { grupo: 'BENEF', label: 'Prêmio Permanência', campo: 'premio_permanencia' },
    { grupo: 'BENEF', label: 'Folga Trabalhada', campo: 'folga_trabalhada' },
    { grupo: 'BENEF', label: 'Reembolsos', campo: 'reembolsos_uber' },
    { grupo: 'BENEF', label: 'Desc. VT por Faltas', campo: 'desconto_vt_faltas' },
    { grupo: 'BENEF', label: 'Desc. VA por Faltas', campo: 'desconto_va_faltas' },
    { grupo: 'BENEF', label: 'Desc. Ajuste Benefícios', campo: 'desc_ajuste_beneficios' },
    { grupo: 'SUBTOTAL', label: 'TOTAL BENEFÍCIOS', campo: 'total_beneficios' },

    { grupo: 'DEPOSITAR', label: 'TOTAL A DEPOSITAR (5º DIA ÚTIL)' },

    { grupo: 'SECTION', label: 'ENCARGOS' },
    { grupo: 'ENCARGO', label: 'FGTS', campo: 'fgts' },
];

const formatarMoeda = (v: number) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Tipo = 'evolucao' | 'faltas';
type EscopoFaltas = 'mes' | 'periodo' | 'ano';

const RelatorioEvolucao: React.FC = () => {
    const { showToast, ToastContainer } = useToast();
    const { data: funcionarios } = useFuncionariosAtivos();
    const { data: postos } = usePostosTrabalho();

    // Abre direto em "Faltas e Atrasos" quando a URL trouxer ?tipo=faltas
    const [tipo, setTipo] = useState<Tipo>(() => {
        try {
            const hash = window.location.hash || '';
            const qs = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
            return new URLSearchParams(qs).get('tipo') === 'faltas' ? 'faltas' : 'evolucao';
        } catch {
            return 'evolucao';
        }
    });


    // --- Evolução ---
    const [funcionarioId, setFuncionarioId] = useState('');
    const [ano, setAno] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [folhasPorMes, setFolhasPorMes] = useState<Record<number, any>>({});
    const [gerado, setGerado] = useState(false);

    // --- Faltas ---
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [escopoFaltas, setEscopoFaltas] = useState<EscopoFaltas>('mes');
    const [mesFaltas, setMesFaltas] = useState(currentMonth);
    const [mesIniFaltas, setMesIniFaltas] = useState(1);
    const [mesFimFaltas, setMesFimFaltas] = useState(currentMonth);
    const [anoFaltas, setAnoFaltas] = useState(currentYear);
    const [postoFaltasId, setPostoFaltasId] = useState('');
    const [funcFaltasId, setFuncFaltasId] = useState('');
    const [linhasFaltas, setLinhasFaltas] = useState<any[]>([]);
    const [loadingFaltas, setLoadingFaltas] = useState(false);
    const [geradoFaltas, setGeradoFaltas] = useState(false);

    const funcionariosOrdenados = useMemo(
        () => [...(funcionarios || [])].sort((a: any, b: any) => (a.nome_completo || '').localeCompare(b.nome_completo || '')),
        [funcionarios]
    );
    const postosOrdenados = useMemo(
        () => [...(postos || [])].sort((a: any, b: any) => (a.nome_posto || '').localeCompare(b.nome_posto || '')),
        [postos]
    );
    const funcionarioSel = funcionariosOrdenados.find((f: any) => f.id === funcionarioId);
    const temDados = Object.keys(folhasPorMes).length > 0;

    const gerar = async () => {
        if (!funcionarioId) { showToast('Selecione um funcionário', 'error'); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('folha_calculada').select('*')
                .eq('funcionario_id', funcionarioId).eq('ano', ano);
            if (error) throw error;
            const map: Record<number, any> = {};
            (data || []).forEach((f: any) => { map[f.mes] = f; });
            setFolhasPorMes(map);
            setGerado(true);
        } catch (e: any) {
            showToast('Erro ao carregar folhas: ' + e.message, 'error');
        } finally { setLoading(false); }
    };

    const valorCelula = (mes: number, linha: Linha): number => {
        const f = folhasPorMes[mes];
        if (!f) return 0;
        if (linha.grupo === 'LIQUIDO') return (f.total_proventos || 0) - (f.total_descontos || 0);
        if (linha.grupo === 'DEPOSITAR') return (f.total_proventos || 0) - (f.total_descontos || 0) + (f.total_beneficios || 0);
        return Number(f[linha.campo as string] || 0);
    };

    const exportarExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet(`Evolução ${ano}`);
        ws.addRow([`EVOLUÇÃO ANUAL DE VENCIMENTOS - ${(funcionarioSel?.nome_completo || '').toUpperCase()}`]);
        ws.addRow([`Ano: ${ano}`]);
        ws.addRow([]);
        ws.addRow(['Item', ...MESES, 'Total Anual']);
        LINHAS.forEach(l => {
            if (l.grupo === 'SECTION') { ws.addRow([l.label]); return; }
            const valores = Array.from({ length: 12 }, (_, i) => valorCelula(i + 1, l));
            ws.addRow([l.label, ...valores, valores.reduce((a, b) => a + b, 0)]);
        });
        ws.columns.forEach(c => { c.width = 16; });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `evolucao-${funcionarioSel?.nome_completo || 'funcionario'}-${ano}.xlsx`);
    };

    const imprimir = () => {
        const linhasHtml = LINHAS.map(l => {
            if (l.grupo === 'SECTION') {
                return `<tr class="section-header"><td class="text-left" colspan="14">${l.label}</td></tr>`;
            }
            const valores = Array.from({ length: 12 }, (_, i) => valorCelula(i + 1, l));
            const total = valores.reduce((a, b) => a + b, 0);
            const st = estiloPorGrupo(l.grupo);
            const style = st.bg
                ? `background-color: ${st.bg}; color: ${st.color}; font-weight: ${st.bold ? 'bold' : 'normal'};`
                : '';
            const totalBg = st.bg || REPORT_COLORS.subtotal;
            return `<tr style="${style}">
                <td class="text-left">${l.label}</td>
                ${valores.map(v => `<td>${v ? formatarMoeda(v) : '-'}</td>`).join('')}
                <td class="total-row" style="background-color: ${totalBg}; color: ${st.color};">${formatarMoeda(total)}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Evolução Anual - ${funcionarioSel?.nome_completo || ''} - ${ano}</title>
<style>${REPORT_PRINT_CSS}</style></head><body>
<h2>EVOLUÇÃO ANUAL DE VENCIMENTOS - ${(funcionarioSel?.nome_completo || '').toUpperCase()}</h2>
<h3>Ano: ${ano}</h3>
<table>
<colgroup><col style="width: 180px;">${MESES.map(() => '<col style="width: 60px;">').join('')}<col style="width: 70px;"></colgroup>
<thead><tr><th class="text-left">Item</th>${MESES.map(m => `<th>${m}</th>`).join('')}<th>TOTAL</th></tr></thead>
<tbody>${linhasHtml}</tbody>
</table></body></html>`;
        const w = window.open('', '_blank');
        if (w) escreverEExibirJanela(w, html, `evolucao-${ano}.pdf`);
    };

    const anos = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

    // ============ RELATÓRIO DE FALTAS ============
    const gerarFaltas = async () => {
        setLoadingFaltas(true);
        try {
            let query = supabase
                .from('folhas_ponto')
                .select('id, funcionario_id, nome_funcionario, posto_trabalho_id, empresa_id, ano, mes, faltas, total_faltas_injustificadas, total_faltas_justificadas, total_atrasos, atrasos')
                .eq('ano', anoFaltas);

            if (escopoFaltas === 'mes') {
                query = query.eq('mes', mesFaltas);
            } else if (escopoFaltas === 'periodo') {
                const ini = Math.min(mesIniFaltas, mesFimFaltas);
                const fim = Math.max(mesIniFaltas, mesFimFaltas);
                query = query.gte('mes', ini).lte('mes', fim);
            }
            if (postoFaltasId) query = query.eq('posto_trabalho_id', postoFaltasId);
            if (funcFaltasId) query = query.eq('funcionario_id', funcFaltasId);

            const { data, error } = await query.order('mes').order('nome_funcionario');
            if (error) throw error;

            // enriquece com posto/empresa
            const postoMap = new Map((postos || []).map((p: any) => [p.id, p.nome_posto]));
            const funcMap = new Map((funcionarios || []).map((f: any) => [f.id, f]));
            const linhas = (data || []).map((r: any) => {
                const func = funcMap.get(r.funcionario_id);
                return {
                    ...r,
                    nome: r.nome_funcionario || func?.nome_completo || '-',
                    posto_nome: postoMap.get(r.posto_trabalho_id) || func?.posto_trabalho?.nome_posto || '-',
                    empresa_nome: func?.empresa?.nome_fantasia || func?.empresa?.razao_social || '-',
                    faltas_inj: Number(r.total_faltas_injustificadas || r.faltas || 0),
                    faltas_just: Number(r.total_faltas_justificadas || 0),
                    atrasos_min: Number(r.total_atrasos || r.atrasos || 0),
                };
            });
            setLinhasFaltas(linhas);
            setGeradoFaltas(true);
        } catch (e: any) {
            showToast('Erro ao carregar faltas: ' + e.message, 'error');
        } finally { setLoadingFaltas(false); }
    };

    const tituloFaltas = useMemo(() => {
        if (escopoFaltas === 'mes') return `${MESES_FULL[mesFaltas - 1]}/${anoFaltas}`;
        if (escopoFaltas === 'periodo') {
            const ini = Math.min(mesIniFaltas, mesFimFaltas);
            const fim = Math.max(mesIniFaltas, mesFimFaltas);
            return `${MESES_FULL[ini - 1]} a ${MESES_FULL[fim - 1]}/${anoFaltas}`;
        }
        return `Ano ${anoFaltas}`;
    }, [escopoFaltas, mesFaltas, mesIniFaltas, mesFimFaltas, anoFaltas]);

    const totaisFaltas = useMemo(() => ({
        inj: linhasFaltas.reduce((s, l) => s + l.faltas_inj, 0),
        just: linhasFaltas.reduce((s, l) => s + l.faltas_just, 0),
        atrasos: linhasFaltas.reduce((s, l) => s + l.atrasos_min, 0),
    }), [linhasFaltas]);

    const formatMin = (min: number) => {
        if (!min) return '-';
        const h = Math.floor(min / 60);
        const m = Math.round(min % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const imprimirFaltas = () => {
        const rows = linhasFaltas.map(l => `
            <tr>
              <td class="text-left">${l.nome}</td>
              <td class="text-left">${l.empresa_nome}</td>
              <td class="text-left">${l.posto_nome}</td>
              <td>${MESES[l.mes - 1]}/${l.ano}</td>
              <td>${l.faltas_inj || '-'}</td>
              <td>${l.faltas_just || '-'}</td>
              <td>${formatMin(l.atrasos_min)}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Relatório de Faltas - ${tituloFaltas}</title>
<style>${REPORT_PRINT_CSS}</style></head><body>
<h2>RELATÓRIO DE FALTAS E ATRASOS</h2>
<h3>Período: ${tituloFaltas}${postoFaltasId ? ` — Posto: ${postosOrdenados.find((p: any) => p.id === postoFaltasId)?.nome_posto || ''}` : ''}${funcFaltasId ? ` — Funcionário: ${funcionariosOrdenados.find((f: any) => f.id === funcFaltasId)?.nome_completo || ''}` : ''}</h3>
<table>
<thead><tr>
<th class="text-left">Funcionário</th><th class="text-left">Empresa</th><th class="text-left">Posto</th>
<th>Mês/Ano</th><th>Faltas Injust.</th><th>Faltas Just.</th><th>Atrasos (hh:mm)</th>
</tr></thead>
<tbody>${rows}
<tr class="total-row"><td class="text-left" colspan="4">TOTAIS</td>
<td>${totaisFaltas.inj}</td><td>${totaisFaltas.just}</td><td>${formatMin(totaisFaltas.atrasos)}</td></tr>
</tbody></table></body></html>`;
        const w = window.open('', '_blank');
        if (w) escreverEExibirJanela(w, html, `faltas-${anoFaltas}.pdf`);
    };

    const exportarFaltasExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Faltas');
        ws.addRow([`RELATÓRIO DE FALTAS E ATRASOS - ${tituloFaltas}`]);
        ws.addRow([]);
        ws.addRow(['Funcionário', 'Empresa', 'Posto', 'Mês/Ano', 'Faltas Injust.', 'Faltas Just.', 'Atrasos (hh:mm)']);
        linhasFaltas.forEach(l => ws.addRow([l.nome, l.empresa_nome, l.posto_nome, `${MESES[l.mes - 1]}/${l.ano}`, l.faltas_inj, l.faltas_just, formatMin(l.atrasos_min)]));
        ws.addRow(['TOTAIS', '', '', '', totaisFaltas.inj, totaisFaltas.just, formatMin(totaisFaltas.atrasos)]);
        ws.columns.forEach(c => { c.width = 22; });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `faltas-${anoFaltas}.xlsx`);
    };

    return (
        <div className="space-y-6" style={{ fontFamily: REPORT_FONT }}>
            <ToastContainer />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">📈 Relatórios de Evolução e Faltas</h1>

            <Card>
                <div className="mb-4">
                    <Select label="Tipo de Relatório" value={tipo} onChange={e => setTipo(e.target.value as Tipo)}>
                        <option value="evolucao">Evolução Anual de Vencimentos</option>
                        <option value="faltas">Faltas e Atrasos</option>
                    </Select>
                </div>

                {tipo === 'evolucao' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <Select label="Funcionário" value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)}>
                            <option value="">Selecione...</option>
                            {funcionariosOrdenados.map((f: any) => (
                                <option key={f.id} value={f.id}>{f.nome_completo}</option>
                            ))}
                        </Select>
                        <Select label="Ano" value={ano} onChange={e => setAno(Number(e.target.value))}>
                            {anos.map(a => <option key={a} value={a}>{a}</option>)}
                        </Select>
                        <Button onClick={gerar} disabled={loading}>{loading ? 'Carregando...' : 'Gerar Relatório'}</Button>
                        {gerado && temDados && (
                            <div className="flex gap-2">
                                <Button onClick={imprimir} variant="secondary">🖨️ Imprimir</Button>
                                <Button onClick={exportarExcel} variant="secondary">📊 Excel</Button>
                            </div>
                        )}
                    </div>
                )}

                {tipo === 'faltas' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <Select label="Escopo" value={escopoFaltas} onChange={e => setEscopoFaltas(e.target.value as EscopoFaltas)}>
                                <option value="mes">Mês único</option>
                                <option value="periodo">Período (intervalo)</option>
                                <option value="ano">Ano inteiro</option>
                            </Select>
                            {escopoFaltas === 'mes' && (
                                <Select label="Mês" value={mesFaltas} onChange={e => setMesFaltas(Number(e.target.value))}>
                                    {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </Select>
                            )}
                            {escopoFaltas === 'periodo' && (
                                <>
                                    <Select label="Mês Inicial" value={mesIniFaltas} onChange={e => setMesIniFaltas(Number(e.target.value))}>
                                        {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                    </Select>
                                    <Select label="Mês Final" value={mesFimFaltas} onChange={e => setMesFimFaltas(Number(e.target.value))}>
                                        {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                    </Select>
                                </>
                            )}
                            <Select label="Ano" value={anoFaltas} onChange={e => setAnoFaltas(Number(e.target.value))}>
                                {anos.map(a => <option key={a} value={a}>{a}</option>)}
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Select label="Posto de Trabalho" value={postoFaltasId} onChange={e => setPostoFaltasId(e.target.value)}>
                                <option value="">Todos os postos</option>
                                {postosOrdenados.map((p: any) => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
                            </Select>
                            <Select label="Funcionário" value={funcFaltasId} onChange={e => setFuncFaltasId(e.target.value)}>
                                <option value="">Todos os funcionários</option>
                                {funcionariosOrdenados.map((f: any) => (
                                    <option key={f.id} value={f.id}>{f.nome_completo}</option>
                                ))}
                            </Select>
                            <div className="flex gap-2">
                                <Button onClick={gerarFaltas} disabled={loadingFaltas}>
                                    {loadingFaltas ? 'Carregando...' : 'Gerar Relatório'}
                                </Button>
                                {geradoFaltas && linhasFaltas.length > 0 && (
                                    <>
                                        <Button onClick={imprimirFaltas} variant="secondary">🖨️ Imprimir</Button>
                                        <Button onClick={exportarFaltasExcel} variant="secondary">📊 Excel</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {tipo === 'evolucao' && gerado && !temDados && (
                <Card>
                    <ReportEmptyState
                        titulo="Sem folhas calculadas no período"
                        mensagem={`Não há nenhuma folha de pagamento calculada para ${funcionarioSel?.nome_completo || 'o funcionário selecionado'} no ano de ${ano}.`}
                        sugestao="Selecione outro ano, confirme se o funcionário possui folhas processadas em Folha de Pagamento, ou verifique se ele estava ativo neste período."
                    />
                </Card>
            )}

            {tipo === 'evolucao' && gerado && temDados && (
                <Card className="overflow-x-auto">
                    <h2 className="text-base font-bold mb-1">
                        EVOLUÇÃO ANUAL DE VENCIMENTOS - {(funcionarioSel?.nome_completo || '').toUpperCase()}
                    </h2>
                    <h3 className="text-sm mb-3">Ano: {ano}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: REPORT_FONT_SIZE, fontFamily: REPORT_FONT }}>
                        <thead>
                            <tr>
                                <ReportTH align="left" width={180}>Item</ReportTH>
                                {MESES.map(m => <ReportTH key={m}>{m}</ReportTH>)}
                                <ReportTH>TOTAL</ReportTH>
                            </tr>
                        </thead>
                        <tbody>
                            {LINHAS.map((l, idx) => {
                                if (l.grupo === 'SECTION') {
                                    return <ReportSectionRow key={idx} label={l.label} colSpan={14} />;
                                }
                                const valores = Array.from({ length: 12 }, (_, i) => valorCelula(i + 1, l));
                                const total = valores.reduce((a, b) => a + b, 0);
                                return (
                                    <ReportRow key={idx} grupo={l.grupo} label={l.label}
                                        valores={valores} total={total} fmt={formatarMoeda} />
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            )}

            {tipo === 'faltas' && geradoFaltas && linhasFaltas.length === 0 && (
                <Card>
                    <ReportEmptyState
                        titulo="Nenhuma folha de ponto encontrada"
                        mensagem={`Não foram encontrados registros de folha de ponto para ${tituloFaltas} com os filtros aplicados.`}
                        sugestao="Ajuste o escopo, o posto ou o funcionário e tente novamente."
                    />
                </Card>
            )}

            {tipo === 'faltas' && geradoFaltas && linhasFaltas.length > 0 && (
                <Card className="overflow-x-auto">
                    <h2 className="text-base font-bold mb-1">RELATÓRIO DE FALTAS E ATRASOS</h2>
                    <h3 className="text-sm mb-3">
                        Período: {tituloFaltas}
                        {postoFaltasId && ` — Posto: ${postosOrdenados.find((p: any) => p.id === postoFaltasId)?.nome_posto}`}
                        {funcFaltasId && ` — Funcionário: ${funcionariosOrdenados.find((f: any) => f.id === funcFaltasId)?.nome_completo}`}
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: REPORT_FONT_SIZE, fontFamily: REPORT_FONT }}>
                        <thead>
                            <tr>
                                <ReportTH align="left">Funcionário</ReportTH>
                                <ReportTH align="left">Empresa</ReportTH>
                                <ReportTH align="left">Posto</ReportTH>
                                <ReportTH>Mês/Ano</ReportTH>
                                <ReportTH>Faltas Injust.</ReportTH>
                                <ReportTH>Faltas Just.</ReportTH>
                                <ReportTH>Atrasos (hh:mm)</ReportTH>
                            </tr>
                        </thead>
                        <tbody>
                            {linhasFaltas.map((l, idx) => (
                                <tr key={idx}>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'left' }}>{l.nome}</td>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'left' }}>{l.empresa_nome}</td>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'left' }}>{l.posto_nome}</td>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{MESES[l.mes - 1]}/{l.ano}</td>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{l.faltas_inj || '-'}</td>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{l.faltas_just || '-'}</td>
                                    <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{formatMin(l.atrasos_min)}</td>
                                </tr>
                            ))}
                            <tr style={{ background: REPORT_COLORS.subtotal, fontWeight: 'bold' }}>
                                <td colSpan={4} style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'left' }}>TOTAIS</td>
                                <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{totaisFaltas.inj}</td>
                                <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{totaisFaltas.just}</td>
                                <td style={{ border: `1px solid ${REPORT_COLORS.border}`, padding: '2px 4px', textAlign: 'center' }}>{formatMin(totaisFaltas.atrasos)}</td>
                            </tr>
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
};

export default RelatorioEvolucao;
