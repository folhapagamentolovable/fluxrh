import React, { useState } from 'react';
import { BarChart2, Search, Download, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { fetchRelatorioRondas } from '../../../hooks/useRondas';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';

type TipoRelatorio = 'data' | 'periodo' | 'mes' | 'funcionario' | 'eventos';

const STATUS_LABEL: Record<string, string> = {
  no_prazo: 'No Prazo', antecipado: 'Antecipado', atrasado: 'Atrasado', nao_realizado: 'Não Realizado',
};
const STATUS_CLASS: Record<string, string> = {
  no_prazo: 'text-green-700 bg-green-50', antecipado: 'text-yellow-700 bg-yellow-50',
  atrasado: 'text-red-700 bg-red-50 font-bold', nao_realizado: 'text-gray-600 bg-gray-50 font-bold',
};

const hoje = new Date().toISOString().split('T')[0];
const inicioMes = hoje.substring(0, 7) + '-01';

export default function RelatorioRondas() {
  const { showToast } = useToast();
  const [tipo, setTipo] = useState<TipoRelatorio>('periodo');
  const [dataInicio, setDataInicio] = useState(inicioMes);
  const [dataFim, setDataFim] = useState(hoje);
  const [mes, setMes] = useState(hoje.substring(0, 7));
  const [funcionarioId, setFuncionarioId] = useState('');
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome_completo: string }[]>([]);
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);

  React.useEffect(() => {
    supabase.from('funcionarios').select('id, nome_completo').order('nome_completo')
      .then(({ data }) => setFuncionarios(data || []));
  }, []);

  const buscar = async () => {
    setLoading(true);
    setBuscou(true);
    try {
      let inicio = dataInicio, fim = dataFim;
      if (tipo === 'data') { inicio = dataInicio; fim = dataInicio; }
      if (tipo === 'mes') { inicio = mes + '-01'; fim = mes + '-31'; }

      const filtros: any = { dataInicio: inicio, dataFim: fim };
      if ((tipo === 'funcionario' || tipo === 'eventos') && funcionarioId) filtros.funcionarioId = funcionarioId;

      let result = await fetchRelatorioRondas(filtros);

      if (tipo === 'eventos') result = result.filter((r: any) => r.status !== 'no_prazo');

      setDados(result);
    } catch (e: any) {
      showToast('Erro: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (dados.length === 0) return;
    const header = 'Data,Funcionário,Ponto,Previsto,Lido,Diferença(min),Status\n';
    const rows = dados.map((r: any) => [
      r.sessao?.data_ronda || '',
      r.funcionario?.nome_completo || '',
      r.ponto?.nome || '',
      r.previsto_em ? new Date(r.previsto_em).toLocaleString('pt-BR') : '',
      new Date(r.lido_em).toLocaleString('pt-BR'),
      r.diferenca_minutos,
      STATUS_LABEL[r.status] || r.status,
    ].join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rondas_${dataInicio}_${dataFim}.csv`; a.click();
  };

  // Totalizadores para relatório de eventos
  const totaisPorTipo = dados.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1; return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <Card className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatórios de Rondas</h1>
            <p className="text-sm text-muted-foreground">Consulte e exporte os registros de rondas.</p>
          </div>
        </div>

        {/* Tipo de relatório */}
        <div className="flex gap-2 flex-wrap mb-4">
          {([['data','Por Data'],['periodo','Por Período'],['mes','Por Mês'],['funcionario','Por Funcionário'],['eventos','Inconsistências']] as [TipoRelatorio, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tipo === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tipo === 'data' && (
            <Input label="Data" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          )}
          {(tipo === 'periodo' || tipo === 'funcionario' || tipo === 'eventos') && (<>
            <Input label="Data Início" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            <Input label="Data Fim" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </>)}
          {tipo === 'mes' && (
            <Input label="Mês/Ano" type="month" value={mes} onChange={e => setMes(e.target.value)} />
          )}
          {(tipo === 'funcionario' || tipo === 'eventos') && (
            <Select label="Funcionário" value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)}>
              <option value="">Todos</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
            </Select>
          )}
          <div className="flex items-end gap-2">
            <Button onClick={buscar} disabled={loading} className="flex items-center gap-2 flex-1">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
            {dados.length > 0 && (
              <Button variant="outline" onClick={exportarCSV} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> CSV
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Totalizadores de eventos */}
      {tipo === 'eventos' && buscou && Object.keys(totaisPorTipo).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.entries(totaisPorTipo).map(([status, count]) => (
            <Card key={status}>
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[status] || status}</p>
              <p className="text-2xl font-bold text-foreground">{count as number}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !buscou ? (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Selecione os filtros e clique em Buscar.</p>
          </div>
        ) : dados.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Funcionário</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Ponto</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Previsto</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Lido em</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Dif. (min)</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((r: any) => (
                  <tr key={r.id} className={`border-b border-border/50 ${r.status === 'atrasado' || r.status === 'nao_realizado' ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-muted/30'}`}>
                    <td className="py-2 px-3 text-muted-foreground">{r.sessao?.data_ronda || '—'}</td>
                    <td className="py-2 px-3 text-foreground">{r.funcionario?.nome_completo || '—'}</td>
                    <td className="py-2 px-3 text-foreground font-medium">{r.ponto?.nome || '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {r.previsto_em ? new Date(r.previsto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {new Date(r.lido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className={`py-2 px-3 text-xs font-mono ${r.diferenca_minutos > 0 ? 'text-red-600' : r.diferenca_minutos < 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {r.diferenca_minutos > 0 ? '+' : ''}{r.diferenca_minutos}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[r.status] || ''}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3 text-right">{dados.length} registro(s)</p>
          </div>
        )}
      </Card>
    </div>
  );
}
