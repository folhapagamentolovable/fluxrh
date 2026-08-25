import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';
import { useFuncionariosAtivos } from '../hooks/useSupabase';
import { formatarMoeda } from '../utils/calcularFolhaPagamento';
import { useToast } from '../hooks/useToast';
import { normalizarFolhaCalculada } from '../utils/normalizarFolhaCalculada';

interface EditarFolhaIndividualModalProps {
    onClose: () => void;
    onSave?: () => void;
}

interface EventoExcepcional {
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto' | 'beneficio';
}

// Campo numérico editável com preview em R$
const Campo: React.FC<{ label: string; valor: number; onChange: (v: number) => void; destaque?: string }> = ({ label, valor, onChange, destaque }) => {
  const [local, setLocal] = useState((valor ?? 0).toString());
  useEffect(() => { setLocal((valor ?? 0).toString()); }, [valor]);
  const commit = () => { onChange(parseFloat(local.replace(',', '.')) || 0); };
  return (
    <div className={`rounded p-2 ${destaque || 'bg-white border border-gray-200'}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text" value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        className="w-full text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <p className="text-xs text-gray-400 text-right mt-0.5">{formatarMoeda(parseFloat(local.replace(',', '.')) || 0)}</p>
    </div>
  );
};

const Secao: React.FC<{ titulo: string; cor: string; children: React.ReactNode }> = ({ titulo, cor, children }) => (
  <div className="mb-6">
    <h4 className={`font-bold text-sm mb-3 pb-1 border-b-2 ${cor}`}>{titulo}</h4>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
  </div>
);

const DESCRICOES_PROVENTO = [
  '13º Proporc. Rescisão', '13º Proporc. Vantagens Rescisão',
  '13º Salário 1ª Parcela', '13º Salário Vantagens 1ª Parcela',
  '13º Salário 2ª Parcela', '13º Salário Vantagens 2ª Parcela',
  '13º Salário Integral', 'Vantagens 13º',
  'Serviços Externos (Folhas de Pagamento)', 'Serviços Externos (Controle de Rondas)',
  'FT (Folga Trabalhada)', 'Reembolsos', 'Reembolsos Uber', 'Reembolsos (Uber)',
  'Supervisão (Palmeiras)',
  'Férias Proporc. Rescisão', '1/3 Férias proporc. Rescisão', 'PLR Proporc. Rescisão',
];

const DESCRICOES_DESCONTO = [
  'INSS 13º', 'Adiantam. 13º Salário', 'Adiantam. Vantagens 13º',
  'Desc. Avaria Utilitário', 'Desc. Avaria Utilitário (Parcela)',
];

const EditarFolhaIndividualModal: React.FC<EditarFolhaIndividualModalProps> = ({ onClose, onSave }) => {
  const { showToast } = useToast();
  const { data: funcionarios } = useFuncionariosAtivos();
  const [funcionarioId, setFuncionarioId] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [eventos, setEventos] = useState<EventoExcepcional[]>([]);

  const set = (campo: string, valor: number) =>
    setDados((prev: any) => ({ ...prev, [campo]: valor }));

  const buscar = async () => {
    if (!funcionarioId) { showToast('Selecione um funcionário', 'error'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('folha_calculada').select('*')
        .eq('funcionario_id', funcionarioId).eq('mes', mes).eq('ano', ano).single();
      if (error) { showToast('Folha não encontrada para este período', 'error'); setDados(null); setEventos([]); }
      else {
        setDados(data);
        const evts = Array.isArray(data.eventos_excepcionais) ? data.eventos_excepcionais as EventoExcepcional[] : [];
        setEventos(evts);
        showToast('Folha carregada!', 'success');
      }
    } catch { showToast('Erro ao buscar folha', 'error'); }
    finally { setLoading(false); }
  };

  const salvar = async () => {
    if (!dados) return;
    setSalvando(true);
    try {
      const payload = normalizarFolhaCalculada({ ...dados, eventos_excepcionais: eventos });
      const { error } = await supabase.from('folha_calculada').update(payload).eq('id', dados.id);
      if (error) throw error;
      showToast('Alterações salvas!', 'success');
      onSave?.();
    } catch { showToast('Erro ao salvar', 'error'); }
    finally { setSalvando(false); }
  };

  const adicionarEvento = () => {
    setEventos(prev => [...prev, { descricao: '', valor: 0, tipo: 'provento' }]);
  };

  const removerEvento = (index: number) => {
    setEventos(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarEvento = (index: number, campo: keyof EventoExcepcional, valor: any) => {
    setEventos(prev => prev.map((ev, i) => i === index ? { ...ev, [campo]: valor } : ev));
  };

  const nomeFuncionario = funcionarios?.find(f => f.id === funcionarioId)?.nome_completo || '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-lg font-bold">Editar Folha Calculada</h2>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Seleção */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Mês</label>
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ano</label>
              <select value={ano} onChange={e => setAno(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Funcionário</label>
              <select value={funcionarioId} onChange={e => { setFuncionarioId(e.target.value); setDados(null); setEventos([]); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Selecione...</option>
                {[...(funcionarios || [])]
                  .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'))
                  .map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
              </select>
            </div>
          </div>

          <Button onClick={buscar} disabled={loading || !funcionarioId} className="mb-6 flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
            Buscar Folha
          </Button>

          {dados && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
                <p className="font-semibold text-blue-800">{nomeFuncionario}</p>
                <p className="text-sm text-blue-600">{new Date(ano, mes-1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
              </div>

              {/* PROVENTOS */}
              <Secao titulo="💰 Proventos" cor="border-green-400 text-green-700">
                <Campo label="Salário Base" valor={dados.salario_base} onChange={v => set('salario_base', v)} />
                <Campo label="Adic. Insalubridade" valor={dados.adicional_insalubridade} onChange={v => set('adicional_insalubridade', v)} />
                <Campo label="Acúmulo de Função" valor={dados.adicional_acumulo_funcao} onChange={v => set('adicional_acumulo_funcao', v)} />
                <Campo label="DSR H. Extras" valor={dados.dsr_horas_extras} onChange={v => set('dsr_horas_extras', v)} />
                <Campo label="DSR Adic. Noturno" valor={dados.dsr_adicional_noturno} onChange={v => set('dsr_adicional_noturno', v)} />
                <Campo label="Horas Extras 50%" valor={dados.horas_extras_50} onChange={v => set('horas_extras_50', v)} />
                <Campo label="Horas Extras 100%" valor={dados.horas_extras_100} onChange={v => set('horas_extras_100', v)} />
                <Campo label="Intrajornada 50%" valor={dados.intrajornada_50} onChange={v => set('intrajornada_50', v)} />
                <Campo label="Intrajornada 100%" valor={dados.intrajornada_100} onChange={v => set('intrajornada_100', v)} />
                <Campo label="Adicional Noturno" valor={dados.adicional_noturno} onChange={v => set('adicional_noturno', v)} />
                <Campo label="Salário Família" valor={dados.salario_familia} onChange={v => set('salario_familia', v)} />
                <Campo label="Complemento Salário" valor={dados.complemento_salario} onChange={v => set('complemento_salario', v)} />
                <Campo label="Supervisão Palmeiras" valor={dados.supervisao_palmeiras} onChange={v => set('supervisao_palmeiras', v)} />
                <Campo label="Serv. Ext. Folhas Pgto" valor={dados.servicos_externos_folhas_pagamento} onChange={v => set('servicos_externos_folhas_pagamento', v)} />
                <Campo label="Serv. Ext. Controle Rondas" valor={dados.servicos_externos_controle_rondas} onChange={v => set('servicos_externos_controle_rondas', v)} />
              </Secao>


              {/* PROVENTOS — 13º / Férias / Rescisão */}
              <Secao titulo="📅 Proventos — 13º / Férias / Rescisão" cor="border-emerald-400 text-emerald-700">
                <Campo label="13º Salário Integral" valor={dados.decimo_terceiro_integral} onChange={v => set('decimo_terceiro_integral', v)} />
                <Campo label="Vantagens 13º" valor={dados.vantagens_13} onChange={v => set('vantagens_13', v)} />
                <Campo label="13º 1ª Parcela" valor={dados.decimo_terceiro_primeira_parcela} onChange={v => set('decimo_terceiro_primeira_parcela', v)} />
                <Campo label="13º Vantagens 1ª Parcela" valor={dados.decimo_terceiro_vantagens_primeira_parcela} onChange={v => set('decimo_terceiro_vantagens_primeira_parcela', v)} />
                <Campo label="13º 2ª Parcela" valor={dados.decimo_terceiro_segunda_parcela} onChange={v => set('decimo_terceiro_segunda_parcela', v)} />
                <Campo label="13º Vantagens 2ª Parcela" valor={dados.decimo_terceiro_vantagens_segunda_parcela} onChange={v => set('decimo_terceiro_vantagens_segunda_parcela', v)} />
                <Campo label="13º Proporc. Rescisão" valor={dados.decimo_terceiro_proporcional_rescisao} onChange={v => set('decimo_terceiro_proporcional_rescisao', v)} />
                <Campo label="13º Vantagens Rescisão" valor={dados.decimo_terceiro_vantagens_rescisao} onChange={v => set('decimo_terceiro_vantagens_rescisao', v)} />
                <Campo label="Férias Proporc. Rescisão" valor={dados.ferias_proporcionais_rescisao} onChange={v => set('ferias_proporcionais_rescisao', v)} />
                <Campo label="1/3 Férias Proporc. Rescisão" valor={dados.um_terco_ferias_proporcional_rescisao} onChange={v => set('um_terco_ferias_proporcional_rescisao', v)} />
                <Campo label="PLR Proporc. Rescisão" valor={dados.plr_proporcional_rescisao} onChange={v => set('plr_proporcional_rescisao', v)} />
              </Secao>

              {/* DESCONTOS */}
              <Secao titulo="📉 Descontos" cor="border-red-400 text-red-700">
                <Campo label="Seguro Vida" valor={dados.desconto_seguro_vida} onChange={v => set('desconto_seguro_vida', v)} />
                <Campo label="INSS" valor={dados.desconto_inss} onChange={v => set('desconto_inss', v)} />
                <Campo label="Adiantamento Quinzenal" valor={dados.desconto_adiantamento_quinzenal} onChange={v => set('desconto_adiantamento_quinzenal', v)} />
                <Campo label="Vale Transporte" valor={dados.desconto_vt} onChange={v => set('desconto_vt', v)} />
                <Campo label="Atrasos" valor={dados.desconto_atrasos} onChange={v => set('desconto_atrasos', v)} />
                <Campo label="Faltas" valor={dados.desconto_faltas} onChange={v => set('desconto_faltas', v)} />
                <Campo label="DSR s/ Faltas" valor={dados.desconto_dsr_faltas} onChange={v => set('desconto_dsr_faltas', v)} />
                <Campo label="Convênio Odonto" valor={dados.desconto_convenio_odonto} onChange={v => set('desconto_convenio_odonto', v)} />
                <Campo label="Contrib. Assistencial" valor={dados.desconto_contribuicao_assistencial} onChange={v => set('desconto_contribuicao_assistencial', v)} />
                <Campo label="Pensão Alimentícia" valor={dados.desconto_pensao_alimenticia} onChange={v => set('desconto_pensao_alimenticia', v)} />
                <Campo label="IRRF" valor={dados.desconto_irrf} onChange={v => set('desconto_irrf', v)} />
                <Campo label="Adiantamento Salário" valor={dados.desconto_adiantamento_salario} onChange={v => set('desconto_adiantamento_salario', v)} />
                <Campo label="Complemento Anterior" valor={dados.desconto_complemento_anterior} onChange={v => set('desconto_complemento_anterior', v)} />
                <Campo label="Rondas Não Realizadas" valor={dados.desconto_rondas_nao_realizadas} onChange={v => set('desconto_rondas_nao_realizadas', v)} />
                <Campo label="Avaria Utilitário" valor={dados.desc_avaria_utilitario} onChange={v => set('desc_avaria_utilitario', v)} />
                <Campo label="Desconto PLR" valor={dados.desconto_plr} onChange={v => set('desconto_plr', v)} />
                <Campo label="INSS 13º" valor={dados.inss_13} onChange={v => set('inss_13', v)} />
                <Campo label="Adiantamento 13º" valor={dados.adiantamento_13_salario} onChange={v => set('adiantamento_13_salario', v)} />
                <Campo label="Adiantamento Vantagens 13º" valor={dados.adiantamento_vantagens_13} onChange={v => set('adiantamento_vantagens_13', v)} />
                <Campo label="INSS Férias" valor={dados.inss_ferias} onChange={v => set('inss_ferias', v)} />
              </Secao>


              {/* BENEFÍCIOS */}
              <Secao titulo="🎁 Benefícios" cor="border-blue-400 text-blue-700">
                <Campo label="VT Mês Anterior" valor={dados.vale_transporte_mes_anterior} onChange={v => set('vale_transporte_mes_anterior', v)} />
                <Campo label="VT Mês Atual" valor={dados.vale_transporte_mes_atual} onChange={v => set('vale_transporte_mes_atual', v)} />
                <Campo label="VA (Vale Alimentação) Mês Anterior" valor={dados.vale_alimentacao_mes_anterior} onChange={v => set('vale_alimentacao_mes_anterior', v)} />
                <Campo label="VA (Vale Alimentação) Mês Atual" valor={dados.vale_alimentacao_mes_atual} onChange={v => set('vale_alimentacao_mes_atual', v)} />
                <Campo label="Cesta Básica" valor={dados.cesta_basica} onChange={v => set('cesta_basica', v)} />
                <Campo label="Prêmio Permanência" valor={dados.premio_permanencia} onChange={v => set('premio_permanencia', v)} />
                <Campo label="PLR" valor={dados.plr} onChange={v => set('plr', v)} />
                <Campo label="Reembolsos" valor={dados.reembolsos_uber} onChange={v => set('reembolsos_uber', v)} />
                <Campo
                  label="Folga Trabalhada (FT) — Override Manual"
                  valor={dados.folga_trabalhada}
                  onChange={v => set('folga_trabalhada', v)}
                  destaque="bg-amber-50 border border-amber-300"
                />
                <Campo label="Desc. VT por Faltas" valor={dados.desconto_vt_faltas} onChange={v => set('desconto_vt_faltas', v)} />
                <Campo label="Desc. VA por Faltas" valor={dados.desconto_va_faltas} onChange={v => set('desconto_va_faltas', v)} />
                <Campo label="Desc. Ajuste Benefícios" valor={dados.desc_ajuste_beneficios} onChange={v => set('desc_ajuste_beneficios', v)} />
                <Campo label="Desc. Rondas (Benef.)" valor={dados.desc_rondas_nao_realizadas_benef} onChange={v => set('desc_rondas_nao_realizadas_benef', v)} />
              </Secao>

              {/* EVENTOS EXCEPCIONAIS */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 pb-1 border-b-2 border-orange-400">
                  <h4 className="font-bold text-sm text-orange-700">⚡ Eventos Excepcionais</h4>
                  <button
                    onClick={adicionarEvento}
                    className="flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors"
                  >
                    <Plus size={14} /> Adicionar Evento
                  </button>
                </div>

                {eventos.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum evento excepcional cadastrado para este período.</p>
                )}

                <div className="space-y-3">
                  {eventos.map((evento, index) => (
                    <div key={index} className={`flex flex-wrap items-end gap-3 p-3 rounded-lg border ${
                      evento.tipo === 'provento' ? 'bg-green-50 border-green-200' :
                      evento.tipo === 'desconto' ? 'bg-red-50 border-red-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                        <input
                          type="text"
                          value={evento.descricao}
                          onChange={e => atualizarEvento(index, 'descricao', e.target.value)}
                          list={`descricoes-${index}`}
                          placeholder="Ex: 13º Salário 1ª Parcela"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                        <datalist id={`descricoes-${index}`}>
                          {(evento.tipo === 'provento' ? DESCRICOES_PROVENTO :
                            evento.tipo === 'desconto' ? DESCRICOES_DESCONTO : []).map(d => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={evento.valor}
                          onChange={e => atualizarEvento(index, 'valor', parseFloat(e.target.value) || 0)}
                          className="w-full text-right text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                        <select
                          value={evento.tipo}
                          onChange={e => atualizarEvento(index, 'tipo', e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                        >
                          <option value="provento">Provento</option>
                          <option value="desconto">Desconto</option>
                          <option value="beneficio">Benefício</option>
                        </select>
                      </div>
                      <button
                        onClick={() => removerEvento(index)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                        title="Remover evento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {eventos.length > 0 && (
                  <div className="mt-3 flex gap-4 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">
                      Proventos: {formatarMoeda(eventos.filter(e => e.tipo === 'provento').reduce((s, e) => s + e.valor, 0))}
                    </span>
                    <span className="text-red-600 font-medium">
                      Descontos: {formatarMoeda(eventos.filter(e => e.tipo === 'desconto').reduce((s, e) => s + e.valor, 0))}
                    </span>
                    <span className="text-blue-600 font-medium">
                      Benefícios: {formatarMoeda(eventos.filter(e => e.tipo === 'beneficio').reduce((s, e) => s + e.valor, 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* TOTAIS — editáveis */}
              <Secao titulo="📊 Totais" cor="border-gray-400 text-gray-700">
                <Campo label="Total Proventos" valor={dados.total_proventos} onChange={v => set('total_proventos', v)} destaque="bg-green-50 border border-green-300" />
                <Campo label="Total Descontos" valor={dados.total_descontos} onChange={v => set('total_descontos', v)} destaque="bg-red-50 border border-red-300" />
                <Campo label="Total Benefícios" valor={dados.total_beneficios} onChange={v => set('total_beneficios', v)} destaque="bg-blue-50 border border-blue-300" />
                <Campo label="Salário Líquido" valor={dados.salario_liquido} onChange={v => set('salario_liquido', v)} destaque="bg-purple-50 border border-purple-300" />
                <Campo label="Base INSS" valor={dados.base_inss} onChange={v => set('base_inss', v)} />
                <Campo label="Base IRRF" valor={dados.base_irrf} onChange={v => set('base_irrf', v)} />
                <Campo label="Base FGTS" valor={dados.base_fgts} onChange={v => set('base_fgts', v)} />
                <Campo label="FGTS (encargo)" valor={dados.fgts} onChange={v => set('fgts', v)} />
              </Secao>

              {/* OBSERVAÇÕES */}
              <div className="mb-6">
                <h4 className="font-bold text-sm mb-3 pb-1 border-b-2 border-gray-400 text-gray-700">📝 Observações</h4>
                <textarea
                  value={dados.observacoes || ''}
                  onChange={e => setDados((prev: any) => ({ ...prev, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Observações sobre esta folha..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </>
          )}

          {!dados && !loading && (
            <div className="text-center py-16 text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-40" />
              <p>Selecione funcionário e período, depois clique em Buscar Folha</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {dados && (
          <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center rounded-b-xl">
            <p className="text-xs text-gray-500">
              Última atualização: {new Date(dados.updated_at || dados.created_at).toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando} className="flex items-center gap-2">
                {salvando ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditarFolhaIndividualModal;
