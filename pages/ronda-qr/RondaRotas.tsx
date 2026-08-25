import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { Route, Plus, Edit2, Trash2, Loader2, Save, X, Clock, AlertTriangle, Eye } from 'lucide-react';
import { calcularGradeHoraria, gerarCiclosTurno, formatarHora } from './utils/rondaUtils';

interface Rota {
  id: string;
  posto_trabalho_id: string;
  nome: string;
  descricao: string | null;
  hora_inicio: string;
  hora_fim: string;
  intervalo_pontos_minutos: number;
  tolerancia_minutos: number;
  bloquear_fora_ordem: boolean;
  ativo: boolean;
}

interface Posto {
  id: string;
  nome_posto: string;
}

export default function RondaRotas() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [selectedPosto, setSelectedPosto] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showGrade, setShowGrade] = useState<string | null>(null);
  const [pontosDaRota, setPontosDaRota] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    hora_inicio: '19:00',
    hora_fim: '05:00',
    intervalo_pontos_minutos: 7,
    tolerancia_minutos: 3,
    bloquear_fora_ordem: false,
  });

  useEffect(() => { loadPostos(); }, []);
  useEffect(() => { if (selectedPosto) loadRotas(); }, [selectedPosto]);

  const loadPostos = async () => {
    const { data } = await supabase
      .from('postos_trabalho')
      .select('id, nome_posto')
      .is('local_area', null)
      .order('nome_posto');
    if (data) {
      setPostos(data);
      if (data.length > 0) setSelectedPosto(data[0].id);
    }
  };

  const loadRotas = async () => {
    setLoading(true);
    const { data } = await supabase.from('rq_rotas').select('*').eq('posto_trabalho_id', selectedPosto).order('nome');
    if (data) setRotas(data);
    setLoading(false);
  };

  const handleSave = async () => {
    const payload = { ...form, posto_trabalho_id: selectedPosto, descricao: form.descricao || null };
    if (editingId) {
      await supabase.from('rq_rotas').update(payload).eq('id', editingId);
    } else {
      await supabase.from('rq_rotas').insert(payload);
    }
    resetForm();
    loadRotas();
  };

  const handleEdit = (rota: Rota) => {
    setForm({
      nome: rota.nome,
      descricao: rota.descricao || '',
      hora_inicio: rota.hora_inicio,
      hora_fim: rota.hora_fim,
      intervalo_pontos_minutos: rota.intervalo_pontos_minutos,
      tolerancia_minutos: rota.tolerancia_minutos,
      bloquear_fora_ordem: rota.bloquear_fora_ordem,
    });
    setEditingId(rota.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta rota?')) return;
    await supabase.from('rq_rotas').delete().eq('id', id);
    loadRotas();
  };

  const handleViewGrade = async (rotaId: string) => {
    if (showGrade === rotaId) { setShowGrade(null); return; }
    
    const { data: pontos } = await supabase
      .from('rq_pontos_ronda')
      .select('id, nome, codigo, ordem')
      .eq('posto_trabalho_id', selectedPosto)
      .eq('ativo', true)
      .order('ordem');
    
    setPontosDaRota(pontos || []);
    setShowGrade(rotaId);
  };

  const resetForm = () => {
    setForm({ nome: '', descricao: '', hora_inicio: '19:00', hora_fim: '05:00', intervalo_pontos_minutos: 7, tolerancia_minutos: 3, bloquear_fora_ordem: false });
    setEditingId(null);
    setShowForm(false);
  };

  // Calculate grade for the selected route
  const gradeRota = showGrade ? (() => {
    const rota = rotas.find(r => r.id === showGrade);
    if (!rota || pontosDaRota.length === 0) return null;
    const ciclos = gerarCiclosTurno(new Date());
    const ciclo1 = ciclos[0]; // Show first cycle as example
    return calcularGradeHoraria(ciclo1, pontosDaRota, rota.intervalo_pontos_minutos, rota.tolerancia_minutos);
  })() : null;

  return (
    <RondaLayout title="Rotas de Ronda" subtitle="Configure as rotas de patrulha por posto">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedPosto}
          onChange={e => setSelectedPosto(e.target.value)}
          className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
        >
          {postos.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
        </select>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Rota
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-lg">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">{editingId ? 'Editar Rota' : 'Nova Rota'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Rota Noturna A" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Intervalo (min)</label>
              <input type="number" value={form.intervalo_pontos_minutos} onChange={e => setForm(f => ({ ...f, intervalo_pontos_minutos: parseInt(e.target.value) || 7 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tolerância (min)</label>
              <input type="number" value={form.tolerancia_minutos} onChange={e => setForm(f => ({ ...f, tolerancia_minutos: parseInt(e.target.value) || 3 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" checked={form.bloquear_fora_ordem} onChange={e => setForm(f => ({ ...f, bloquear_fora_ordem: e.target.checked }))} className="w-5 h-5 rounded-lg accent-emerald-600" />
              <label className="text-sm text-slate-700 dark:text-slate-300">Bloquear leitura fora de ordem</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-all"><Save className="w-4 h-4" /> Salvar</button>
            <button onClick={resetForm} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"><X className="w-4 h-4" /> Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" /></div>
      ) : rotas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Route className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhuma rota configurada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rotas.map(rota => (
            <div key={rota.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                  <Route className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">{rota.nome}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{rota.intervalo_pontos_minutos} min entre pontos</span>
                    <span>±{rota.tolerancia_minutos} min tolerância</span>
                    {rota.bloquear_fora_ordem && <span className="text-amber-600 dark:text-amber-400">Bloqueio ativo</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleViewGrade(rota.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Eye className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => handleEdit(rota)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Edit2 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => handleDelete(rota.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Grade horária */}
              {showGrade === rota.id && gradeRota && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Grade Horária — Ciclo 1 (19:00)</h4>
                    {!gradeRota.viavel && (
                      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Ciclo excede 60 min ({gradeRota.duracaoTotalMinutos} min)
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {gradeRota.pontos.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-sm">
                        <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 font-medium text-slate-700 dark:text-slate-300">{p.pontoNome}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{formatarHora(p.horarioMinimo)}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatarHora(p.horarioIdeal)}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{formatarHora(p.horarioMaximo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </RondaLayout>
  );
}
