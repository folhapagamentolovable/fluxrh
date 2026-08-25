import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, XCircle, User, Clock, Info, Calculator, Loader2, DollarSign, Percent, Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { calcularESalvarFerias } from '../utils/calcularValoresFerias';
import type { ResultadoCalculoFerias } from '../utils/calcularValoresFerias';
import { calcularINSS, calcularIRRF } from '../utils/calcularFolhaPagamento';
import type { ParametrosCalculo } from '../lib/supabase';

interface FeriasSolicitada {
  id: string;
  funcionario_id: string;
  periodo_aquisitivo: number;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_concessivo: string;
  status: string;
  data_inicio_gozo: string | null;
  data_fim_gozo: string | null;
  dias_gozados: number | null;
  periodo1_inicio: string | null;
  periodo1_fim: string | null;
  periodo2_inicio: string | null;
  periodo2_fim: string | null;
  periodo3_inicio: string | null;
  periodo3_fim: string | null;
  dias_abono: number | null;
  total_fracoes: number | null;
  observacoes: string | null;
  resposta_empresa: string | null;
  valor_ferias?: number | null;
  valor_terco?: number | null;
  valor_abono?: number | null;
  valor_total?: number | null;
  salario_base_calculo?: number | null;
  itens_calculados?: any;
  funcionario?: {
    id: string;
    nome_completo: string;
    nome_cargo?: string;
    nome_empresa?: string;
    nome_posto?: string;
    data_admissao?: string;
  };
}

interface VacationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  solicitacao: FeriasSolicitada;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const VacationApprovalModal: React.FC<VacationApprovalModalProps> = ({ isOpen, onClose, onSave, solicitacao }) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [respostaEmpresa, setRespostaEmpresa] = useState(solicitacao.resposta_empresa || '');
  const [valores, setValores] = useState({
    valor_ferias: solicitacao.valor_ferias || 0,
    valor_terco: solicitacao.valor_terco || 0,
    valor_abono: solicitacao.valor_abono || 0,
    valor_total: solicitacao.valor_total || 0,
    salario_base_calculo: solicitacao.salario_base_calculo || 0,
  });
  const [detalhamento, setDetalhamento] = useState<ResultadoCalculoFerias['detalhamento'] | null>(null);
  const [parametros, setParametros] = useState<ParametrosCalculo | null>(null);
  const [editandoItens, setEditandoItens] = useState(false);
  const [itensProventos, setItensProventos] = useState<Array<{ id: string, label: string, valor: number }>>([]);
  const [itensDescontos, setItensDescontos] = useState<Array<{ id: string, label: string, valor: number }>>([]);

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

  useEffect(() => {
    setValores({
      valor_ferias: solicitacao.valor_ferias || 0,
      valor_terco: solicitacao.valor_terco || 0,
      valor_abono: solicitacao.valor_abono || 0,
      valor_total: solicitacao.valor_total || 0,
      salario_base_calculo: solicitacao.salario_base_calculo || 0,
    });
    setRespostaEmpresa(solicitacao.resposta_empresa || '');
    
    // Inicializar itens se já tiver valores
    if (solicitacao.valor_total && solicitacao.valor_total > 0) {
      if (solicitacao.itens_calculados?.proventos) {
        setItensProventos(solicitacao.itens_calculados.proventos);
        setItensDescontos(solicitacao.itens_calculados.descontos || []);
      } else {
        const proventos = [
          { id: 'ferias', label: 'Férias (30d) + 1/3', valor: solicitacao.valor_ferias || 0 }
        ];
        if (solicitacao.valor_abono && solicitacao.valor_abono > 0) {
          proventos.push({ id: 'abono', label: 'Abono Pecuniário', valor: solicitacao.valor_abono });
        }
        setItensProventos(proventos);
        
        // Se temos o valor_total e ele é menor que o bruto, a diferença são os descontos
        const totalBruto = proventos.reduce((acc, i) => acc + i.valor, 0);
        const diff = totalBruto - solicitacao.valor_total;
        if (diff > 0) {
          // Tentar estimar INSS e IRRF se não existirem itens
          if (parametros) {
            const inss = calcularINSS(totalBruto, parametros);
            const irrf = Math.max(0, diff - inss);
            setItensDescontos([
              { id: 'inss', label: 'INSS', valor: inss },
              { id: 'irrf', label: 'IRRF', valor: Number(irrf.toFixed(2)) }
            ]);
          } else {
            setItensDescontos([{ id: 'desconto', label: 'Descontos', valor: diff }]);
          }
        }
      }
    }
  }, [solicitacao]);

  // Recalcular totais quando itens mudarem
  useEffect(() => {
    if (!editandoItens) return;
    
    const novoBruto = itensProventos.reduce((acc, item) => acc + item.valor, 0);
    const novoDesconto = itensDescontos.reduce((acc, item) => acc + item.valor, 0);
    
    // Atualizar INSS e IRRF se não forem editados manualmente? 
    // Por simplicidade, vamos permitir editar tudo.
    
    setValores(prev => ({
      ...prev,
      valor_total: novoBruto,
      // O valor_ferias e valor_terco originais perdem o sentido se editado bruscamente, 
      // mas vamos manter o total consistente
    }));
  }, [itensProventos, itensDescontos]);

  const calcularDias = (inicio: string | null, fim: string | null) => {
    if (!inicio || !fim) return 0;
    const diff = Math.ceil((new Date(fim + 'T00:00:00').getTime() - new Date(inicio + 'T00:00:00').getTime()) / 86400000) + 1;
    return Math.max(0, diff);
  };

  // Descontos simplificados (INSS + IRRF)
  const calcularDescontos = () => {
    const bruto = valores.valor_total;
    if (!parametros) {
      // Fallback simplificado enquanto não carrega parâmetros
      return { inss: 0, irrf: 0, liquido: bruto };
    }
    
    const inss = calcularINSS(bruto, parametros);
    const irrf = calcularIRRF(bruto, inss, parametros);
    
    const liquidoFinal = Math.max(0, bruto - inss - irrf);
    return { inss, irrf, liquido: Number(liquidoFinal.toFixed(2)) };
  };

  const handleCalcular = async () => {
    const dataGozo = solicitacao.data_inicio_gozo || solicitacao.periodo1_inicio;
    if (!dataGozo) { showToast('Data de início do gozo não definida', 'error'); return; }
    setCalculando(true);
    try {
      const res = await calcularESalvarFerias(
        solicitacao.id,
        solicitacao.funcionario_id,
        dataGozo,
        solicitacao.dias_gozados || 30,
        solicitacao.dias_abono || 0
      );
      if (res.success && res.resultado) {
        const r = res.resultado;
        setValores({
          valor_ferias: r.valor_ferias,
          valor_terco: r.valor_terco,
          valor_abono: r.valor_abono,
          valor_total: r.valor_total,
          salario_base_calculo: r.salario_base_calculo,
        });
        setDetalhamento(r.detalhamento);
        
        // Inicializar itens para edição
        const proventos = [
          { id: 'ferias', label: 'Férias (30d) + 1/3', valor: Math.round((r.detalhamento.media_fixos_total / 30 * (solicitacao.dias_gozados || 30)) * 1.33333333 * 100) / 100 }
        ];
        if (r.detalhamento.media_variaveis_total > 0) {
          proventos.push({ id: 'vantagens', label: 'Vantagens + 1/3', valor: Math.round((r.detalhamento.media_variaveis_total / 30 * (solicitacao.dias_gozados || 30)) * 1.33333333 * 100) / 100 });
        }
        if (r.valor_abono > 0) {
          proventos.push({ id: 'abono', label: 'Abono Pecuniário', valor: r.valor_abono });
        }
        setItensProventos(proventos);
        
        // Calcular descontos iniciais
        const inss = calcularINSS(r.valor_total, parametros!);
        const irrf = calcularIRRF(r.valor_total, inss, parametros!);
        setItensDescontos([
          { id: 'inss', label: 'INSS', valor: inss },
          { id: 'irrf', label: 'IRRF', valor: irrf }
        ]);
        
        showToast('Férias calculadas!', 'success');
      } else {
        showToast(res.error || 'Erro ao calcular', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setCalculando(false);
    }
  };

  const handleAprovar = async () => {
    if (!respostaEmpresa.trim()) { showToast('Adicione uma resposta para o funcionário.', 'error'); return; }
    setSaving(true);
    try {
      const payload: any = {
        status: 'programada', 
        resposta_empresa: respostaEmpresa, 
        updated_at: new Date().toISOString()
      };

      // Salvar sempre os itens calculados (seja por edição ou cálculo inicial)
      if (itensProventos.length > 0) {
        const totalBruto = itensProventos.reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
        const inssItem = itensDescontos.find(i => i.id === 'inss');
        const inss = inssItem ? (Number(inssItem.valor) || 0) : (parametros ? calcularINSS(totalBruto, parametros) : 0);
        
        const irrfItem = itensDescontos.find(i => i.id === 'irrf');
        const irrf = irrfItem ? (Number(irrfItem.valor) || 0) : (parametros ? calcularIRRF(totalBruto, inss, parametros) : 0);
        
        const totalDescontos = itensDescontos.reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
        
        const liquido = Number((totalBruto - totalDescontos).toFixed(2));
        
        payload.valor_total = isNaN(liquido) ? 0 : liquido;
        payload.valor_ferias = isNaN(totalBruto) ? 0 : Number(totalBruto.toFixed(2));
        payload.itens_calculados = {
          proventos: itensProventos.map(i => ({ ...i, valor: Number(i.valor) || 0 })),
          descontos: itensDescontos.map(i => ({ ...i, valor: Number(i.valor) || 0 }))
        };
      }

      const { error } = await supabase.from('ferias').update(payload).eq('id', solicitacao.id);
      if (error) throw error;
      showToast('Solicitação aprovada!', 'success');
      onSave(); onClose();
    } catch { 
      showToast('Erro ao aprovar', 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleReprovar = async () => {
    if (!respostaEmpresa.trim()) { showToast('Adicione uma justificativa para a reprovação.', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('ferias').update({
        status: 'reprovada', resposta_empresa: respostaEmpresa, updated_at: new Date().toISOString()
      }).eq('id', solicitacao.id);
      if (error) throw error;
      showToast('Solicitação reprovada.', 'success');
      onSave(); onClose();
    } catch { showToast('Erro ao reprovar', 'error'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  const diasP1 = calcularDias(solicitacao.periodo1_inicio, solicitacao.periodo1_fim);
  const diasP2 = calcularDias(solicitacao.periodo2_inicio, solicitacao.periodo2_fim);
  const diasP3 = calcularDias(solicitacao.periodo3_inicio, solicitacao.periodo3_fim);
  const totalDias = solicitacao.dias_gozados || (diasP1 + diasP2 + diasP3);
  const diasAbono = solicitacao.dias_abono || 0;
  const temValores = valores.valor_total > 0;
  const descontos = temValores ? calcularDescontos() : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Analisar Solicitação de Férias</h2>
            <p className="text-sm text-muted-foreground">{solicitacao.periodo_aquisitivo}º Período Aquisitivo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Funcionário */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Funcionário</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Nome</p><p className="font-semibold">{solicitacao.funcionario?.nome_completo || '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">Cargo</p><p className="font-semibold">{solicitacao.funcionario?.nome_cargo || '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">Empresa</p><p className="font-semibold">{solicitacao.funcionario?.nome_empresa || '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">Posto</p><p className="font-semibold">{solicitacao.funcionario?.nome_posto || '-'}</p></div>
            </div>
          </Card>

          {/* Período + Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-foreground">Período Aquisitivo</h3>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span className="font-medium">{fmtDate(solicitacao.data_inicio_aquisitivo)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fim</span><span className="font-medium">{fmtDate(solicitacao.data_fim_aquisitivo)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Limite</span><span className="font-medium text-amber-600">{fmtDate(solicitacao.data_limite_concessivo)}</span></div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-green-600" />
                <h3 className="font-semibold text-foreground">Períodos Solicitados</h3>
              </div>
              <div className="space-y-2 text-sm">
                {solicitacao.periodo1_inicio && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Período 1: {fmtDate(solicitacao.periodo1_inicio)} – {fmtDate(solicitacao.periodo1_fim)}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{diasP1}d</span>
                  </div>
                )}
                {solicitacao.periodo2_inicio && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Período 2: {fmtDate(solicitacao.periodo2_inicio)} – {fmtDate(solicitacao.periodo2_fim)}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{diasP2}d</span>
                  </div>
                )}
                {solicitacao.periodo3_inicio && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Período 3: {fmtDate(solicitacao.periodo3_inicio)} – {fmtDate(solicitacao.periodo3_fim)}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{diasP3}d</span>
                  </div>
                )}
                {diasAbono > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Abono Pecuniário</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{diasAbono}d</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-2 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">{totalDias + diasAbono}d</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Botão Calcular */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button onClick={handleCalcular} disabled={calculando} className="flex items-center gap-2">
                {calculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {calculando ? 'Calculando...' : 'Calcular Férias'}
              </Button>
              {temValores && <span className="text-xs text-muted-foreground">Valores calculados com base nas folhas do período aquisitivo</span>}
            </div>
            {temValores && (
              <Button 
                variant="outline" 
                onClick={() => setEditandoItens(!editandoItens)}
                className={editandoItens ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
              >
                {editandoItens ? 'Finalizar Edição' : 'Editar Itens'}
              </Button>
            )}
          </div>

          {/* Valores calculados */}
          {temValores && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-green-700 font-semibold text-sm">
                    <DollarSign className="w-4 h-4" /> Proventos
                  </div>
                  {editandoItens && (
                    <button 
                      onClick={() => setItensProventos([...itensProventos, { id: Math.random().toString(), label: 'Novo Provento', valor: 0 }])}
                      className="p-1 hover:bg-green-200 rounded text-green-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {itensProventos.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {editandoItens ? (
                        <>
                          <input 
                            value={item.label}
                            onChange={e => {
                              const newItens = [...itensProventos];
                              newItens[idx].label = e.target.value;
                              setItensProventos(newItens);
                            }}
                            className="flex-1 bg-white border border-green-200 rounded px-1 py-0.5 text-xs"
                          />
                          <input 
                            type="number"
                            value={item.valor}
                            onChange={e => {
                              const newItens = [...itensProventos];
                              newItens[idx].valor = Number(e.target.value);
                              setItensProventos(newItens);
                            }}
                            className="w-20 bg-white border border-green-200 rounded px-1 py-0.5 text-xs"
                          />
                          <button onClick={() => setItensProventos(itensProventos.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </>
                      ) : (
                        <div className="flex justify-between w-full">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{fmt(item.valor)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-green-300 pt-1 mt-1 font-bold text-green-700">
                    <span>Total Bruto</span>
                    <span>{fmt(itensProventos.reduce((acc, i) => acc + i.valor, 0))}</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-red-700 font-semibold text-sm">
                    <Percent className="w-4 h-4" /> Descontos
                  </div>
                  {editandoItens && (
                    <button 
                      onClick={() => setItensDescontos([...itensDescontos, { id: Math.random().toString(), label: 'Novo Desconto', valor: 0 }])}
                      className="p-1 hover:bg-red-200 rounded text-red-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {itensDescontos.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {editandoItens ? (
                        <>
                          <input 
                            value={item.label}
                            onChange={e => {
                              const newItens = [...itensDescontos];
                              newItens[idx].label = e.target.value;
                              setItensDescontos(newItens);
                            }}
                            className="flex-1 bg-white border border-red-200 rounded px-1 py-0.5 text-xs"
                          />
                          <input 
                            type="number"
                            value={item.valor}
                            onChange={e => {
                              const newItens = [...itensDescontos];
                              newItens[idx].valor = Number(e.target.value);
                              setItensDescontos(newItens);
                            }}
                            className="w-20 bg-white border border-red-200 rounded px-1 py-0.5 text-xs"
                          />
                          <button onClick={() => setItensDescontos(itensDescontos.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </>
                      ) : (
                        <div className="flex justify-between w-full">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-red-600">-{fmt(item.valor)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-red-300 pt-1 mt-1 font-bold text-red-700">
                    <span>Total</span>
                    <span>-{fmt(itensDescontos.reduce((acc, i) => acc + i.valor, 0))}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-2 text-blue-700 font-semibold text-sm">
                  <Calculator className="w-4 h-4" /> Resumo
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bruto</span>
                    <span className="font-medium text-green-600">{fmt(itensProventos.reduce((acc, i) => acc + i.valor, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descontos</span>
                    <span className="font-medium text-red-600">-{fmt(itensDescontos.reduce((acc, i) => acc + i.valor, 0))}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-300 pt-1 mt-1 font-bold text-blue-700 text-base">
                    <span>Líquido</span>
                    <span>{fmt(itensProventos.reduce((acc, i) => acc + i.valor, 0) - itensDescontos.reduce((acc, i) => acc + i.valor, 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Base cálculo</span><span>{fmt(valores.salario_base_calculo)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Detalhamento */}
          {detalhamento && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-1"><Calculator className="w-4 h-4" /> Detalhamento (média {detalhamento.meses_encontrados} mês(es))</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Salário Base</span><span className="font-medium">{fmt(detalhamento.media_salario_base)}</span></div>
                {detalhamento.media_horas_extras > 0 && <div className="flex justify-between"><span className="text-muted-foreground">H. Extras</span><span className="font-medium">{fmt(detalhamento.media_horas_extras)}</span></div>}
                {detalhamento.media_adicional_noturno > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Adic. Noturno</span><span className="font-medium">{fmt(detalhamento.media_adicional_noturno)}</span></div>}
                {detalhamento.media_insalubridade > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Insalubridade</span><span className="font-medium">{fmt(detalhamento.media_insalubridade)}</span></div>}
                {detalhamento.media_dsr > 0 && <div className="flex justify-between"><span className="text-muted-foreground">DSR</span><span className="font-medium">{fmt(detalhamento.media_dsr)}</span></div>}
              </div>
            </div>
          )}

          {/* Observações do funcionário */}
          {solicitacao.observacoes && (
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1"><Info className="w-4 h-4 text-muted-foreground" /><span className="font-semibold text-sm">Observações do Funcionário</span></div>
              <p className="text-sm text-muted-foreground">{solicitacao.observacoes}</p>
            </Card>
          )}

          {/* Resposta */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Resposta da Empresa *</label>
            <textarea
              value={respostaEmpresa}
              onChange={e => setRespostaEmpresa(e.target.value)}
              placeholder="Adicione uma resposta ou justificativa para o funcionário..."
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">Esta resposta será visível para o funcionário no Portal.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="secondary" onClick={handleReprovar} disabled={saving} className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="w-4 h-4" /> Reprovar
          </Button>
          <Button variant="primary" onClick={handleAprovar} disabled={saving} className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Aprovar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VacationApprovalModal;
