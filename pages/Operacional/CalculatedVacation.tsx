import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { Umbrella, Search, Printer, Eye } from 'lucide-react';
import { useFuncionariosAtivos, useEmpresas, usePostosTrabalho } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import VacationApprovalModal from '../../components/VacationApprovalModal';
import { calcularINSS, calcularIRRF } from '../../utils/calcularFolhaPagamento';
import type { ParametrosCalculo } from '../../lib/supabase';

interface FeriasAprovada {
  id: string;
  funcionario_id: string;
  periodo_aquisitivo: number;
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  periodo1_inicio: string | null;
  periodo1_fim: string | null;
  periodo2_inicio: string | null;
  periodo2_fim: string | null;
  periodo3_inicio: string | null;
  periodo3_fim: string | null;
  dias_gozados: number;
  dias_abono: number;
  valor_ferias: number;
  valor_terco: number;
  valor_abono: number;
  valor_total: number;
  salario_base_calculo: number;
  status: string;
  funcionario?: { 
    id: string;
    nome_completo: string; 
    nome_posto?: string;
    nome_cargo?: string;
    nome_empresa?: string;
  };
}

const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const CalculatedVacation: React.FC = () => {
  const { showToast, ToastContainer } = useToast();
  const { data: funcionarios } = useFuncionariosAtivos();
  const { data: empresas } = useEmpresas();
  const { data: postos } = usePostosTrabalho();

  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [ferias, setFerias] = useState<FeriasAprovada[]>([]);
  const [search, setSearch] = useState('');
  const [filtroPosto, setFiltroPosto] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<FeriasAprovada | null>(null);
  const [parametros, setParametros] = useState<ParametrosCalculo | null>(null);

  useEffect(() => {
    const fetchParams = async () => {
      const { data } = await supabase
        .from('parametros_calculo')
        .select('*')
        .eq('ativo', true)
        .order('ano_vigencia', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setParametros(data);
    };
    fetchParams();
  }, []);

  const iniciarEdicao = (f: FeriasAprovada) => {
    setEditandoId(f.id);
    setEditValor(String(f.valor_total ?? 0));
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditValor('');
  };

  const salvarEdicao = async (f: FeriasAprovada) => {
    const novoTotal = Number(editValor.replace(',', '.'));
    if (Number.isNaN(novoTotal) || novoTotal < 0) {
      showToast('Valor inválido', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('ferias')
        .update({ valor_total: novoTotal })
        .eq('id', f.id);
      if (error) throw error;
      setFerias(prev => prev.map(x => x.id === f.id ? { ...x, valor_total: novoTotal } : x));
      showToast('Valor atualizado', 'success');
      cancelarEdicao();
    } catch {
      showToast('Erro ao atualizar valor', 'error');
    }
  };

  useEffect(() => { if (funcionarios?.length) carregarFerias(); }, [ano, funcionarios]);

  const carregarFerias = async () => {
    if (!funcionarios?.length) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ferias')
        .select('*')
        .in('status', ['programada', 'aprovada', 'agendada', 'em_andamento', 'gozada']);
      if (error) throw error;

      const filtradas = (data || []).filter(f => {
        const d = f.data_inicio_gozo || f.periodo1_inicio;
        return d && new Date(d + 'T00:00:00').getFullYear() === ano;
      }).map(f => ({
        ...f,
        funcionario: funcionarios.find(fn => fn.id === f.funcionario_id),
      }));

      setFerias(filtradas as FeriasAprovada[]);
    } catch {
      showToast('Erro ao carregar férias', 'error');
    } finally {
      setLoading(false);
    }
  };

  const lista = useMemo(() => {
    return ferias
      .filter(f => {
        const nome = f.funcionario?.nome_completo?.toLowerCase() || '';
        const func = funcionarios?.find(fn => fn.id === f.funcionario_id);
        if (search && !nome.includes(search.toLowerCase())) return false;
        if (filtroPosto && func?.posto_trabalho_id !== filtroPosto) return false;
        if (filtroEmpresa && func?.empresa_id !== filtroEmpresa) return false;
        return true;
      })
      .sort((a, b) => (a.funcionario?.nome_completo || '').localeCompare(b.funcionario?.nome_completo || ''));
  }, [ferias, search, filtroPosto, filtroEmpresa, funcionarios]);

  const totais = useMemo(() => ({
    ferias: lista.reduce((s, f) => s + (f.valor_ferias || 0), 0),
    terco: lista.reduce((s, f) => s + (f.valor_terco || 0), 0),
    abono: lista.reduce((s, f) => s + (f.valor_abono || 0), 0),
    total: lista.reduce((s, f) => s + (f.valor_total || 0), 0),
  }), [lista]);

  const handleImprimir = () => globalThis.print();

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <ToastContainer />
      {showApprovalModal && selectedSolicitacao && (
        <VacationApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedSolicitacao(null);
          }}
          onSave={carregarFerias}
          solicitacao={selectedSolicitacao as any}
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Umbrella className="w-6 h-6 text-primary" /> Férias Aprovadas
        </h1>
        <Button variant="secondary" onClick={handleImprimir} className="flex items-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select label="Ano" value={ano.toString()} onChange={e => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Funcionário</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <Select label="Posto" value={filtroPosto} onChange={e => setFiltroPosto(e.target.value)}>
            <option value="">Todos os postos</option>
            {postos?.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
          </Select>
          <Select label="Empresa" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas?.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Umbrella className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma férias aprovada encontrada para {ano}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Nome</th>
                  <th className="px-3 py-3 text-left font-medium">Posto</th>
                  <th className="px-3 py-3 text-center font-medium">De</th>
                  <th className="px-3 py-3 text-center font-medium">A</th>
                  <th className="px-3 py-3 text-center font-medium">Total (dias)</th>
                  <th className="px-3 py-3 text-right font-medium">Proventos</th>
                  <th className="px-3 py-3 text-right font-medium">Descontos</th>
                  <th className="px-3 py-3 text-right font-medium">Líquido</th>
                  <th className="px-3 py-3 text-center font-medium">Status</th>
                  <th className="px-3 py-3 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map(f => {
                  const dataInicio = f.data_inicio_gozo || f.periodo1_inicio;
                  const dataFim = f.data_fim_gozo || f.periodo1_fim;
                  
                  // Cálculo de descontos simplificado para exibição (mesma lógica do modal de aprovação)
                  const calcularLiquido = (bruto: number) => {
                    if (!parametros) return { inss: 0, irrf: 0, totalDescontos: 0, liquido: bruto };
                    
                    const inss = calcularINSS(bruto, parametros);
                    const irrf = calcularIRRF(bruto, inss, parametros);
                    return { inss, irrf, totalDescontos: inss + irrf, liquido: bruto - inss - irrf };
                  };

                  const { totalDescontos, liquido } = calcularLiquido(f.valor_total);

                  return (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground">{f.funcionario?.nome_completo || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{f.funcionario?.nome_posto || '-'}</td>
                      <td className="px-3 py-2 text-center">{fmtDate(dataInicio)}</td>
                      <td className="px-3 py-2 text-center">{fmtDate(dataFim)}</td>
                      <td className="px-3 py-2 text-center font-medium">{f.dias_gozados || 30}</td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">{fmt(f.valor_total)}</td>
                      <td className="px-3 py-2 text-right text-red-600 font-medium">-{fmt(totalDescontos)}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">
                        {editandoId === f.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              step="0.01"
                              value={editValor}
                              onChange={e => setEditValor(e.target.value)}
                              className="w-28 px-2 py-1 border border-border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                              autoFocus
                            />
                            <button
                              onClick={() => salvarEdicao(f)}
                              className="text-xs text-primary hover:underline px-1"
                              title="Salvar"
                            >✓</button>
                            <button
                              onClick={cancelarEdicao}
                              className="text-xs text-muted-foreground hover:underline px-1"
                              title="Cancelar"
                            >✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => iniciarEdicao(f)}
                            className="hover:underline cursor-pointer"
                            title="Clique no valor LÍQUIDO para editar o BRUTO"
                          >
                            {fmt(liquido)}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          f.status === 'gozada' ? 'bg-gray-100 text-gray-700' :
                          f.status === 'em_andamento' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {f.status === 'gozada' ? 'Gozada' : f.status === 'em_andamento' ? 'Em andamento' : 'Programada'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button 
                          onClick={() => {
                            setSelectedSolicitacao(f as any);
                            setShowApprovalModal(true);
                          }}
                          className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
                          title="Ver detalhes do cálculo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totais */}
              <tfoot className="bg-muted/60 font-bold border-t-2 border-border">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">{lista.length} registro(s)</td>
                  <td className="px-3 py-2 text-right text-green-700">{fmt(totais.total)}</td>
                  <td className="px-3 py-2 text-right text-red-600">
                    -{fmt(lista.reduce((s, f) => {
                      if (!parametros) return s;
                      const bruto = f.valor_total;
                      const inss = calcularINSS(bruto, parametros);
                      const irrf = calcularIRRF(bruto, inss, parametros);
                      return s + inss + irrf;
                    }, 0))}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-700">
                    {fmt(lista.reduce((s, f) => {
                      if (!parametros) return s + f.valor_total;
                      const bruto = f.valor_total;
                      const inss = calcularINSS(bruto, parametros);
                      const irrf = calcularIRRF(bruto, inss, parametros);
                      return s + (bruto - inss - irrf);
                    }, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CalculatedVacation;
