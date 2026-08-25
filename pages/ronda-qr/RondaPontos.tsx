import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { QrCode, Plus, Edit2, Trash2, Loader2, MapPin, Save, X, Printer, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Ponto {
  id: string;
  posto_trabalho_id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  ordem: number;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
}

interface Posto {
  id: string;
  nome_posto: string;
}

export default function RondaPontos() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [selectedPosto, setSelectedPosto] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '', codigo: '', descricao: '', ordem: 0,
    latitude: '', longitude: '',
  });

  useEffect(() => {
    loadPostos();
  }, []);

  useEffect(() => {
    if (selectedPosto) loadPontos();
  }, [selectedPosto]);

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

  const loadPontos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rq_pontos_ronda')
      .select('*')
      .eq('posto_trabalho_id', selectedPosto)
      .order('ordem');
    if (data) setPontos(data);
    setLoading(false);
  };

  const handleSave = async () => {
    const payload = {
      posto_trabalho_id: selectedPosto,
      nome: form.nome.trim(),
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim() || null,
      ordem: form.ordem,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    };

    if (editingId) {
      await supabase.from('rq_pontos_ronda').update(payload).eq('id', editingId);
    } else {
      await supabase.from('rq_pontos_ronda').insert(payload);
    }

    resetForm();
    loadPontos();
  };

  const handleEdit = (ponto: Ponto) => {
    setForm({
      nome: ponto.nome, codigo: ponto.codigo,
      descricao: ponto.descricao || '', ordem: ponto.ordem,
      latitude: ponto.latitude?.toString() || '',
      longitude: ponto.longitude?.toString() || '',
    });
    setEditingId(ponto.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este ponto?')) return;
    await supabase.from('rq_pontos_ronda').delete().eq('id', id);
    loadPontos();
  };

  const toggleAtivo = async (ponto: Ponto) => {
    await supabase.from('rq_pontos_ronda').update({ ativo: !ponto.ativo }).eq('id', ponto.id);
    loadPontos();
  };

  const resetForm = () => {
    setForm({ nome: '', codigo: '', descricao: '', ordem: 0, latitude: '', longitude: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const getSvgString = (id: string): string | null => {
    const svg = document.getElementById(`qr-print-${id}`)?.querySelector('svg');
    return svg ? new XMLSerializer().serializeToString(svg) : null;
  };

  const baixarQR = (ponto: Ponto) => {
    const svgData = getSvgString(ponto.id);
    if (!svgData) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 400;
    canvas.width = size;
    canvas.height = size + 60;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      ctx.fillStyle = 'black';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ponto.nome, size / 2, size + 25);
      ctx.font = '12px monospace';
      ctx.fillText(ponto.codigo, size / 2, size + 45);
      const link = document.createElement('a');
      link.download = `qr-${ponto.codigo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const imprimirQR = (ponto: Ponto) => {
    const svgData = getSvgString(ponto.id);
    if (!svgData) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Popup bloqueado. Permita popups para imprimir.'); return; }
    const html = `<!DOCTYPE html><html><head><title>QR ${ponto.codigo}</title>
      <style>
        @media print { @page { margin: 0.5in; } }
        body { font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; }
        .box { text-align:center; border:2px solid #000; padding:24px; border-radius:8px; }
        .box svg { width:400px; height:400px; }
        h2 { margin:12px 0 4px; }
        .code { font-family: monospace; color:#444; }
      </style></head>
      <body><div class="box">
        ${svgData}
        <h2>${ponto.nome}</h2>
        <div class="code">${ponto.codigo}</div>
        ${ponto.descricao ? `<div style="margin-top:8px;color:#666;font-size:12px;">${ponto.descricao}</div>` : ''}
      </div></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    w.location.href = url;
    setTimeout(() => {
      try { w.focus(); w.print(); } catch {}
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 500);
  };


  return (
    <RondaLayout title="Pontos de Ronda" subtitle="Gerencie os QR Codes dos pontos de patrulha">
      {/* Posto selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedPosto}
          onChange={(e) => setSelectedPosto(e.target.value)}
          className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
        >
          {postos.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
        </select>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Ponto
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-lg">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">
            {editingId ? 'Editar Ponto' : 'Novo Ponto'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Portaria Principal"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código</label>
              <input
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                placeholder="QR-001"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ordem</label>
              <input
                type="number"
                value={form.ordem}
                onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
              <input
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Entrada lateral..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-all">
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button onClick={resetForm} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Points list */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        </div>
      ) : pontos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <QrCode className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum ponto cadastrado</p>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Crie o primeiro ponto de ronda para este posto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pontos.map(ponto => (
            <div
              key={ponto.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 ${!ponto.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{ponto.ordem}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{ponto.nome}</p>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">{ponto.codigo}</span>
                    {!ponto.ativo && <span className="text-xs text-red-500 font-medium">Inativo</span>}
                  </div>
                  {ponto.descricao && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ponto.descricao}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowQR(showQR === ponto.id ? null : ponto.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <QrCode className="w-5 h-5 text-slate-400" />
                  </button>
                  <button onClick={() => handleEdit(ponto)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Edit2 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => toggleAtivo(ponto)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <MapPin className={`w-4 h-4 ${ponto.ativo ? 'text-green-500' : 'text-red-500'}`} />
                  </button>
                  <button onClick={() => handleDelete(ponto.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              {showQR === ponto.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3">
                  <div id={`qr-print-${ponto.id}`} className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={ponto.codigo} size={200} level="H" includeMargin />
                    <p className="text-center text-sm font-mono text-slate-700 mt-2">{ponto.codigo}</p>
                    <p className="text-center text-xs text-slate-500">{ponto.nome}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => imprimirQR(ponto)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" /> Imprimir
                    </button>
                    <button
                      onClick={() => baixarQR(ponto)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                      <Download className="w-4 h-4" /> Baixar PNG
                    </button>
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
