import React, { useState, useEffect, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
import { QrCode, Plus, Edit2, Trash2, Star, GripVertical, X, Printer, Building2, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { usePontosQRCode, type PontoQRCode } from '../../../hooks/useRondas';
import { useToast } from '../../../hooks/useToast';
import { escreverEExibirJanela } from '../../../utils/printUtils';
import { supabase } from '../../../lib/supabase';

interface Empresa { id: string; nome_empresa: string; }
interface Posto { id: string; nome_posto: string; empresa_id: string | null; }

const EMPTY: Partial<PontoQRCode> = { nome: '', numero_sequencial: 1, tipo: 'filho', descricao: '', ativo: true };

export default function PontosQRCode() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [postoId, setPostoId] = useState<string>('');

  const { pontos, loading, salvar, remover, reordenar } = usePontosQRCode(postoId || null);
  const { showToast } = useToast();
  const [modal, setModal] = useState<Partial<PontoQRCode> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [qrModal, setQrModal] = useState<PontoQRCode | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [emp, pos] = await Promise.all([
        supabase.from('empresas').select('id, nome_empresa').order('nome_empresa'),
        supabase.from('postos_trabalho').select('id, nome_posto, empresa_id').is('local_area', null).order('nome_posto'),
      ]);
      setEmpresas(emp.data || []);
      setPostos(pos.data || []);
    })();
  }, []);

  const postosFiltrados = useMemo(
    () => empresaId ? postos.filter(p => p.empresa_id === empresaId) : postos,
    [postos, empresaId]
  );

  useEffect(() => {
    if (postoId && !postosFiltrados.find(p => p.id === postoId)) setPostoId('');
  }, [empresaId, postosFiltrados, postoId]);

  const abrirNovo = () => {
    if (!postoId) { showToast('Selecione um Posto de Trabalho primeiro', 'error'); return; }
    setModal({ ...EMPTY, numero_sequencial: pontos.length + 1 });
  };
  const abrirEditar = (p: PontoQRCode) => setModal({ ...p });

  const handleSalvar = async () => {
    if (!modal?.nome?.trim()) { showToast('Nome obrigatório', 'error'); return; }
    setSalvando(true);
    try {
      await salvar(modal);
      showToast('Ponto salvo!', 'success');
      setModal(null);
    } catch (e: any) { showToast('Erro: ' + e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const handleRemover = async (p: PontoQRCode) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await remover(p.id); showToast('Excluído!', 'success'); }
    catch (e: any) { showToast('Erro: ' + e.message, 'error'); }
  };

  const handleDrop = async (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const lista = [...pontos];
    const fromIdx = lista.findIndex(p => p.id === dragging);
    const toIdx = lista.findIndex(p => p.id === targetId);
    const [moved] = lista.splice(fromIdx, 1);
    lista.splice(toIdx, 0, moved);
    setDragging(null);
    try { await reordenar(lista); }
    catch (e: any) { showToast('Erro ao reordenar: ' + e.message, 'error'); }
  };

  const imprimirQR = (p: PontoQRCode) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('Popup bloqueado. Permita popups para imprimir.', 'error'); return; }
    const qrData = JSON.stringify({ type: 'FLUXPAY_RONDA', id: p.id, nome: p.nome, tipo: p.tipo });
    let svgString = renderToStaticMarkup(
      <QRCodeSVG value={qrData} size={400} level="H" includeMargin />
    );
    // Garantir xmlns para renderização correta via Blob URL
    if (!svgString.includes('xmlns=')) {
      svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>QR Ronda - ${p.nome}</title>
<style>
  @media print { @page { margin: 0.5in; } }
  body { font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; box-sizing:border-box; }
  .qr-container { text-align:center; border:2px solid #000; padding:20px; border-radius:8px; }
  .logo { font-size:24px; font-weight:bold; margin-bottom:20px; color:#1a1a2e; }
  .qr-code { margin:20px 0; }
  .qr-code svg { width:400px; height:400px; display:block; margin:0 auto; }
  .posto-nome { font-size:24px; font-weight:bold; margin:10px 0; }
  .posto-info { font-size:14px; color:#666; margin:5px 0; }
  .tipo-badge { display:inline-block; padding:4px 12px; border-radius:4px; font-size:12px; font-weight:bold; letter-spacing:1px; color:#fff; background:${p.tipo === 'pai' ? '#7c3aed' : '#2563eb'}; margin-bottom:10px; }
  .instrucao { margin-top:20px; padding:10px; background:#f0f0f0; border-radius:4px; font-size:12px; }
</style>
</head>
<body>
  <div class="qr-container">
    <div class="logo">FluxPay - Ronda QR</div>
    
    <div class="qr-code">${svgString}</div>
    <div class="posto-nome">${p.nome}</div>
    <div class="posto-info">Sequência: ${p.numero_sequencial}</div>
    ${p.descricao ? `<div class="posto-info">${p.descricao}</div>` : ''}
    <div class="instrucao">Escaneie o QR Code no app FluxPay para registrar a ronda</div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      }, 400);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    printWindow.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Modal QR */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">{qrModal.nome}</h3>
              <button onClick={() => setQrModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex justify-center p-4 bg-white rounded-lg mb-4">
              <QRCodeSVG value={JSON.stringify({ type: 'FLUXPAY_RONDA', id: qrModal.id, nome: qrModal.nome, tipo: qrModal.tipo })} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">ID: {qrModal.id}</p>
            <Button onClick={() => imprimirQR(qrModal)} className="w-full flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir QR Code
            </Button>
          </div>
        </div>
      )}

      {/* Modal Formulário */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">{modal.id ? 'Editar Ponto' : 'Novo Ponto'}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Nome do Ponto *" value={modal.nome || ''} onChange={e => setModal(m => ({ ...m!, nome: e.target.value }))} placeholder="Ex: Portaria Principal, Bloco A..." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Sequência" type="number" value={modal.numero_sequencial || 1} onChange={e => setModal(m => ({ ...m!, numero_sequencial: +e.target.value }))} />
                <Select label="Tipo" value={modal.tipo || 'filho'} onChange={e => setModal(m => ({ ...m!, tipo: e.target.value as 'pai' | 'filho' }))}>
                  <option value="pai">Pai (início/fim)</option>
                  <option value="filho">Filho (intermediário)</option>
                </Select>
              </div>
              <Input label="Descrição (opcional)" value={modal.descricao || ''} onChange={e => setModal(m => ({ ...m!, descricao: e.target.value }))} placeholder="Observações sobre o ponto..." />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.ativo ?? true} onChange={e => setModal(m => ({ ...m!, ativo: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-foreground">Ativo</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSalvar} disabled={salvando} className="flex-1">{salvando ? 'Salvando...' : 'Salvar'}</Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <QrCode className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Pontos de QR Code</h1>
                <p className="text-sm text-muted-foreground">Configure os pontos do percurso de ronda. Arraste para reordenar.</p>
              </div>
            </div>
            <Button onClick={abrirNovo} disabled={!postoId} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Ponto
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1">
                <Building2 className="w-4 h-4" /> Empresa
              </label>
              <Select value={empresaId} onChange={e => setEmpresaId(e.target.value)}>
                <option value="">Todas as empresas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
              </Select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1">
                <MapPin className="w-4 h-4" /> Posto de Trabalho *
              </label>
              <Select value={postoId} onChange={e => setPostoId(e.target.value)}>
                <option value="">Selecione um posto...</option>
                {postosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nome_posto}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {!postoId ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Selecione um Posto de Trabalho acima para gerenciar seus pontos de QR Code.</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : pontos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum ponto cadastrado neste posto. Clique em "Novo Ponto" para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pontos.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragging(p.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(p.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  p.tipo === 'pai' ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700' : 'border-border bg-card hover:bg-muted/30'
                } ${dragging === p.id ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{p.numero_sequencial}</span>
                {p.tipo === 'pai' && <Star className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{p.nome}</p>
                  {p.descricao && <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.tipo === 'pai' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                  {p.tipo === 'pai' ? 'PAI' : 'FILHO'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setQrModal(p)} className="p-1.5 hover:bg-muted rounded" title="Ver QR Code"><QrCode className="w-4 h-4 text-primary" /></button>
                  <button onClick={() => abrirEditar(p)} className="p-1.5 hover:bg-muted rounded"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => handleRemover(p)} className="p-1.5 hover:bg-muted rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
