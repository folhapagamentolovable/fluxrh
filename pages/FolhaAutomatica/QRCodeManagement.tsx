import React, { useState, useEffect, useRef } from 'react';
import { escreverEExibirJanela } from '../../utils/printUtils';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
import {
  QrCode, Building2, Download, Printer, Search,
  RefreshCw, FileText, MapPin, Trash2, Plus, X, Edit2, Check
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PostoTrabalho {
  id: string;
  nome_posto: string;
  cnpj: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  local_area: string | null;
  latitude: number | null;
  longitude: number | null;
  raio_validacao_metros: number | null;
  empresa_id: string | null;
  empresa?: { nome_empresa: string } | null;
}

// Agrupa postos pelo nome base (sem área), retornando grupos
function agruparPostos(postos: PostoTrabalho[]): Map<string, PostoTrabalho[]> {
  const grupos = new Map<string, PostoTrabalho[]>();
  for (const posto of postos) {
    const chave = `${posto.nome_posto}__${posto.cnpj}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(posto);
  }
  return grupos;
}

export default function QRCodeManagement() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [postos, setPostos] = useState<PostoTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [empresas, setEmpresas] = useState<{ id: string; nome_empresa: string }[]>([]);
  const [selectedPostos, setSelectedPostos] = useState<Set<string>>(new Set());
  // Modal para adicionar nova área a um posto existente
  const [modalArea, setModalArea] = useState<{ posto: PostoTrabalho } | null>(null);
  const [novaArea, setNovaArea] = useState('');
  const [salvandoArea, setSalvandoArea] = useState(false);
  // Edição inline de área
  const [editandoArea, setEditandoArea] = useState<{ id: string; valor: string } | null>(null);
  // Modal de confirmação de exclusão com funcionários vinculados
  const [modalExclusao, setModalExclusao] = useState<{
    postoId: string; label: string; area: string | null;
    funcionarios: { id: string; nome_completo: string }[];
  } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const { showToast } = useToast();
  const podeExcluir = isAdmin && !authLoading;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postosRes, empresasRes] = await Promise.all([
        supabase.from('postos_trabalho')
          .select('*, empresa:empresas(nome_empresa)')
          .neq('ativo', false)   // mostrar apenas postos ativos (null = ativo também)
          .order('nome_posto'),
        supabase.from('empresas').select('id, nome_empresa').order('nome_empresa')
      ]);
      if (postosRes.error) throw postosRes.error;
      if (empresasRes.error) throw empresasRes.error;
      setPostos(postosRes.data || []);
      setEmpresas(empresasRes.data || []);
    } catch (error: any) {
      showToast('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const postosFiltrados = postos.filter(posto => {
    const matchBusca = posto.nome_posto.toLowerCase().includes(busca.toLowerCase()) ||
      posto.cnpj.includes(busca) ||
      (posto.local_area || '').toLowerCase().includes(busca.toLowerCase());
    const matchEmpresa = !empresaFiltro || posto.empresa_id === empresaFiltro;
    return matchBusca && matchEmpresa;
  });

  const toggleSelectPosto = (id: string) => {
    const s = new Set(selectedPostos);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedPostos(s);
  };

  const selectAll = () => {
    if (selectedPostos.size === postosFiltrados.length) {
      setSelectedPostos(new Set());
    } else {
      setSelectedPostos(new Set(postosFiltrados.map(p => p.id)));
    }
  };

  const generateQRData = (posto: PostoTrabalho) => JSON.stringify({
    type: 'FLUXPAY_POSTO',
    id: posto.id,
    nome: posto.nome_posto,
    cnpj: posto.cnpj,
    ...(posto.local_area ? { area: posto.local_area } : {})
  });

  // Adicionar nova área: duplica o posto com local_area preenchido
  const adicionarArea = async () => {
    if (!modalArea || !novaArea.trim()) return;
    setSalvandoArea(true);
    try {
      const base = modalArea.posto;
      const { error } = await supabase.from('postos_trabalho').insert({
        nome_posto: base.nome_posto,
        cnpj: base.cnpj,
        endereco: base.endereco,
        cidade: base.cidade,
        estado: base.estado,
        local_area: novaArea.trim(),
        latitude: base.latitude,
        longitude: base.longitude,
        raio_validacao_metros: base.raio_validacao_metros,
        empresa_id: base.empresa_id,
      });
      if (error) throw error;
      showToast('Área adicionada com sucesso!', 'success');
      setModalArea(null);
      setNovaArea('');
      fetchData();
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error);
      if (msg?.includes('column') && msg?.includes('local_area')) {
        showToast('Execute a migration "add_local_area_postos_trabalho.sql" no Supabase SQL Editor primeiro.', 'error');
      } else if (msg?.includes('permission') || msg?.includes('policy') || error?.code === '42501') {
        showToast('Sem permissão para inserir. Verifique as políticas RLS da tabela postos_trabalho.', 'error');
      } else if (msg?.includes('unique') || msg?.includes('duplicate') || error?.code === '23505') {
        showToast('Já existe um registro com este CNPJ e área. Tente um nome de área diferente.', 'error');
      } else {
        showToast('Erro ao adicionar área: ' + msg, 'error');
      }
    } finally {
      setSalvandoArea(false);
    }
  };

  const salvarEdicaoArea = async (id: string) => {
    if (!editandoArea) return;
    try {
      const { error } = await supabase.from('postos_trabalho')
        .update({ local_area: editandoArea.valor.trim() || null })
        .eq('id', id);
      if (error) throw error;
      showToast('Área atualizada!', 'success');
      setEditandoArea(null);
      fetchData();
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error);
      showToast('Erro ao salvar: ' + msg, 'error');
    }
  };

  const atualizarGeolocalizacao = async (postoId: string) => {
    if (!navigator.geolocation) { showToast('Geolocalização não suportada', 'error'); return; }
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { error } = await supabase.from('postos_trabalho')
        .update({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        .eq('id', postoId);
      if (error) throw error;
      showToast('Localização atualizada!', 'success');
      fetchData();
    } catch (error: any) {
      showToast('Erro ao atualizar localização: ' + error.message, 'error');
    }
  };

  const deletarPosto = async (postoId: string, nomePosto: string, area: string | null) => {
    const label = area ? `${nomePosto} - ${area}` : nomePosto;

    // Posto principal (sem área) — verificar se tem funcionários ou registros filhos
    if (!area) {
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('id, nome_completo')
        .eq('posto_trabalho_id', postoId)
        .eq('ativo', true);

      // Verificar se tem QR Codes filhos (áreas)
      const { data: filhos } = await supabase
        .from('postos_trabalho')
        .select('id, local_area')
        .eq('cnpj', postos.find(p => p.id === postoId)?.cnpj || '')
        .not('local_area', 'is', null);

      const temFuncionarios = funcs && funcs.length > 0;
      const temFilhos = filhos && filhos.length > 0;

      if (temFuncionarios || temFilhos) {
        const motivo = temFuncionarios && temFilhos
          ? `Este posto possui ${funcs!.length} funcionário(s) vinculado(s) e ${filhos!.length} QR Code(s) de área.`
          : temFuncionarios
            ? `Este posto possui ${funcs!.length} funcionário(s) vinculado(s).`
            : `Este posto possui ${filhos!.length} QR Code(s) de área (${filhos!.map(f => f.local_area).join(', ')}).`;

        showToast(
          `Não é possível excluir o posto principal. ${motivo} Reatribua os funcionários a outro posto antes de excluir.`,
          'error'
        );
        return;
      }
    }

    // QR filho (com área) ou posto principal sem vínculos — pode deletar
    if (!globalThis.confirm(`Excluir "${label}"?\n\n⚠️ Esta ação não pode ser desfeita!`)) return;
    await executarExclusao(postoId, label, area, false);
  };

  const executarExclusao = async (
    postoId: string,
    label: string,
    area: string | null,
    desvincularFuncionarios: boolean
  ) => {
    setExcluindo(true);
    try {
      if (desvincularFuncionarios) {
        const { error: dvError } = await supabase
          .from('funcionarios')
          .update({ posto_trabalho_id: null })
          .eq('posto_trabalho_id', postoId)
          .eq('ativo', true);
        if (dvError) throw dvError;
      }

      // QR filho: deletar diretamente (sem FK de funcionários)
      // Posto principal sem vínculos: desativar para preservar histórico
      if (area) {
        const { error } = await supabase.from('postos_trabalho').delete().eq('id', postoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('postos_trabalho').update({ ativo: false }).eq('id', postoId);
        if (error) throw error;
      }

      showToast(`"${label}" excluído com sucesso!`, 'success');
      const s = new Set(selectedPostos); s.delete(postoId); setSelectedPostos(s);
      fetchData();
    } catch (error: any) {
      showToast('Erro: ' + (error?.message || JSON.stringify(error)), 'error');
    } finally {
      setExcluindo(false);
      setModalExclusao(null);
    }
  };

  const exportarPDFSelecionados = () => {
    if (selectedPostos.size === 0) { showToast('Selecione ao menos um QR Code', 'error'); return; }
    const lista = postosFiltrados.filter(p => selectedPostos.has(p.id));
    const printWindow = globalThis.open('', '_blank');
    if (!printWindow) { showToast('Popup bloqueado.', 'error'); return; }

    const itens = lista.map(posto => {
      const svgString = renderToStaticMarkup(
        <QRCodeSVG value={generateQRData(posto)} size={150} level="M" includeMargin />
      );
      return `
        <div class="qr-item">
          <div class="qr-code">${svgString}</div>
          <div class="posto-nome">${posto.nome_posto}</div>
          ${posto.local_area ? `<div class="posto-area">${posto.local_area}</div>` : ''}
          <div class="posto-info">CNPJ: ${posto.cnpj}</div>
          <div class="instrucao">Escaneie para registrar ponto</div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>QR Codes</title>
      <style>
        @media print { @page { margin: 0.3in; size: A4; } .qr-item { break-inside: avoid; } }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 4px 0 0; color: #666; font-size: 12px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .qr-item { border: 1px solid #ccc; padding: 16px; border-radius: 8px; text-align: center; }
        .qr-code { display: flex; justify-content: center; margin-bottom: 8px; }
        .qr-code svg { width: 150px; height: 150px; }
        .posto-nome { font-weight: bold; font-size: 13px; margin: 8px 0 2px; }
        .posto-area { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 4px; }
        .posto-info { font-size: 11px; color: #555; margin: 2px 0; }
        .instrucao { font-size: 10px; margin-top: 8px; padding: 4px; background: #f5f5f5; border-radius: 4px; color: #666; }
      </style></head><body>
      <div class="header">
        <h1>📱 FluxPay — QR Codes de Registro de Ponto</h1>
        <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
      <div class="grid">${itens}</div>
      </body></html>`;
    escreverEExibirJanela(printWindow, html, 'QR Codes');
  };

  // ─── Card individual de QR Code ───────────────────────────────────────────
  const QRCodeCard = ({ posto }: { posto: PostoTrabalho }) => {
    const qrRef = useRef<HTMLDivElement>(null);
    const isSelected = selectedPostos.has(posto.id);
    const empresa = posto.empresa && typeof posto.empresa === 'object' && 'nome_empresa' in posto.empresa
      ? posto.empresa as { nome_empresa: string } : null;
    const enderecoCompleto = [posto.endereco, posto.cidade, posto.estado].filter(Boolean).join(', ');

    const downloadQR = () => {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const sz = 400;
      const linhas = [posto.local_area, `CNPJ: ${posto.cnpj}`, enderecoCompleto].filter(Boolean);
      canvas.width = sz;
      canvas.height = sz + 20 + linhas.length * 20;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, sz, sz);
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(posto.nome_posto, canvas.width / 2, sz + 18);
        linhas.forEach((linha, i) => {
          ctx.font = i === 0 && posto.local_area ? 'bold 13px Arial' : '12px Arial';
          ctx.fillStyle = i === 0 && posto.local_area ? '#000' : '#444';
          ctx.fillText(linha!, canvas.width / 2, sz + 36 + i * 18);
        });
        const link = document.createElement('a');
        const slug = [posto.nome_posto, posto.local_area].filter(Boolean).join('-').replace(/\s+/g, '-').toLowerCase();
        link.download = `qrcode-${slug}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const printQR = () => {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) return;
      const printWindow = globalThis.open('', '_blank');
      if (!printWindow) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const enderecoCompleto = [posto.endereco, posto.cidade, posto.estado].filter(Boolean).join(', ');
      const html = `<!DOCTYPE html><html><head><title>QR Code - ${posto.nome_posto}</title>
        <style>
          @media print { @page { margin: 0.3in; size: A4 portrait; } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
          .container { text-align: center; border: 2px solid #000; border-radius: 10px; padding: 20px; width: 90vmin; max-width: 90vmin; }
          .logo { font-size: 22px; font-weight: bold; margin-bottom: 12px; color: #1a1a2e; }
          .qr { display: flex; justify-content: center; margin: 0 auto 12px; }
          .qr svg { width: 75vmin !important; height: 75vmin !important; max-width: 75vmin; max-height: 75vmin; }
          .area { font-size: 16px; font-weight: 700; color: #000; margin: 6px 0; }
          .info { font-size: 13px; color: #555; margin: 3px 0; }
          .instrucao { margin-top: 12px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 12px; color: #444; }
        </style></head><body>
        <div class="container">
          <div class="logo">${posto.nome_posto}</div>
          <div class="qr">${svgData}</div>
          ${posto.local_area ? `<div class="area">${posto.local_area}</div>` : ''}
          <div class="info">CNPJ: ${posto.cnpj}</div>
          <div class="instrucao">Escaneie o QR Code no app FluxPay para registrar seu ponto</div>
        </div>
        <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
        </body></html>`;
      escreverEExibirJanela(printWindow, html, `QR Code - ${posto.nome_posto}`);
    };

    return (
      <div
        className={`bg-card border rounded-lg p-4 transition-all cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
        onClick={() => toggleSelectPosto(posto.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectPosto(posto.id)}
              className="w-4 h-4 rounded flex-shrink-0" onClick={e => e.stopPropagation()} />
            <div className="min-w-0">
              <h4 className="font-semibold text-foreground text-sm truncate">{posto.nome_posto}</h4>
              {empresa && <p className="text-xs text-muted-foreground truncate">{empresa.nome_empresa}</p>}
            </div>
          </div>
          <span title={posto.latitude && posto.longitude ? 'GPS configurado' : 'Sem GPS'}>
            <MapPin className={`w-4 h-4 flex-shrink-0 ${posto.latitude && posto.longitude ? 'text-green-500' : 'text-muted-foreground'}`} />
          </span>
        </div>

        {/* Área/Setor */}
        <div className="mb-2 min-h-[24px]" onClick={e => e.stopPropagation()}>
          {editandoArea?.id === posto.id ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={editandoArea.valor}
                onChange={e => setEditandoArea({ id: posto.id, valor: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') salvarEdicaoArea(posto.id); if (e.key === 'Escape') setEditandoArea(null); }}
                className="flex-1 text-xs border rounded px-2 py-1 bg-background text-foreground"
                placeholder="Nome da área/setor"
              />
              <button onClick={() => salvarEdicaoArea(posto.id)} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditandoArea(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditandoArea({ id: posto.id, valor: posto.local_area || '' })}
              className="flex items-center gap-1 text-xs group w-full text-left"
              title="Clique para editar a área/setor"
            >
              {posto.local_area
                ? <span className="font-semibold text-blue-600 dark:text-blue-400">{posto.local_area}</span>
                : <span className="text-muted-foreground italic">Sem área definida</span>}
              <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0" />
            </button>
          )}
        </div>

        {/* QR Code */}
        <div ref={qrRef} className="flex justify-center p-3 bg-white rounded-lg mb-2" onClick={e => e.stopPropagation()}>
          <QRCodeSVG value={generateQRData(posto)} size={130} level="M" />
        </div>

        {/* Infos */}
        <div className="text-xs text-muted-foreground text-center mb-1">CNPJ: {posto.cnpj}</div>
        {enderecoCompleto && (
          <div className="text-xs text-muted-foreground text-center mb-2 truncate" title={enderecoCompleto}>{enderecoCompleto}</div>
        )}

        {/* Ações */}
        <div className="flex gap-1.5 justify-center flex-wrap" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={downloadQR} className="flex items-center gap-1 text-xs px-2">
            <Download className="w-3 h-3" /> Baixar
          </Button>
          <Button size="sm" variant="outline" onClick={printQR} className="flex items-center gap-1 text-xs px-2">
            <Printer className="w-3 h-3" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => atualizarGeolocalizacao(posto.id)}
            className="flex items-center gap-1 text-xs px-2" title="Definir GPS atual">
            <MapPin className="w-3 h-3" /> GPS
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => { setModalArea({ posto }); setNovaArea(''); }}
            className="flex items-center gap-1 text-xs px-2 text-blue-600 hover:text-blue-700 hover:border-blue-300"
            title="Adicionar nova área/setor para este posto">
            <Plus className="w-3 h-3" /> Área
          </Button>
        </div>

        {podeExcluir && (
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deletarPosto(posto.id, posto.nome_posto, posto.local_area)}
              className="w-full flex items-center justify-center gap-1 text-xs px-2 text-destructive hover:border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" /> Excluir QR Code
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ─── Render principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Modal: adicionar nova área */}
      {modalArea && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Adicionar Área / Setor</h3>
              <button onClick={() => setModalArea(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Posto: <strong>{modalArea.posto.nome_posto}</strong><br />
              Será criado um novo QR Code para este posto com a área informada.
            </p>
            <Input
              label="Nome da Área / Setor"
              placeholder="Ex: Portaria, Refeitório, Guarita, Bloco A..."
              value={novaArea}
              onChange={e => setNovaArea(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') adicionarArea(); }}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <Button onClick={adicionarArea} disabled={!novaArea.trim() || salvandoArea} className="flex-1">
                {salvandoArea ? 'Salvando...' : 'Criar QR Code'}
              </Button>
              <Button variant="outline" onClick={() => setModalArea(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <QrCode className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciamento de QR Codes</h1>
            <p className="text-muted-foreground text-sm">
              Gere QR Codes por posto e por área/setor. Use o botão <strong>+ Área</strong> para criar sublocais.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input label="" placeholder="Buscar por nome, área ou CNPJ..."
              value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
          </div>
          <Select label="" value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button onClick={fetchData} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            <Button onClick={exportarPDFSelecionados} disabled={selectedPostos.size === 0} className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> PDF ({selectedPostos.size})
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            QR Codes ({postosFiltrados.length})
          </h2>
          <Button size="sm" variant="outline" onClick={selectAll}>
            {selectedPostos.size === postosFiltrados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : postosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum posto de trabalho encontrado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(agruparPostos(postosFiltrados)).map(([chave, grupo]) => {
              const base = grupo[0];
              const empresa = base.empresa && typeof base.empresa === 'object' && 'nome_empresa' in base.empresa
                ? (base.empresa as { nome_empresa: string }).nome_empresa : null;
              return (
                <div key={chave}>
                  {/* Cabeçalho do grupo */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                    <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground">{base.nome_posto}</span>
                      {empresa && <span className="text-xs text-muted-foreground ml-2">— {empresa}</span>}
                      <span className="text-xs text-muted-foreground ml-2">CNPJ: {base.cnpj}</span>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{grupo.length} QR {grupo.length === 1 ? 'Code' : 'Codes'}</span>
                  </div>
                  {/* Cards do grupo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {grupo.map(posto => (
                      <QRCodeCard key={posto.id} posto={posto} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal: confirmar exclusão com funcionários vinculados */}
      {modalExclusao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Desativar "{modalExclusao.label}"</h3>
                <p className="text-sm text-muted-foreground">Este posto possui funcionários vinculados</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                {modalExclusao.funcionarios.length} funcionário(s) vinculado(s):
              </p>
              <ul className="space-y-1">
                {modalExclusao.funcionarios.map(f => (
                  <li key={f.id} className="text-sm text-amber-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {f.nome_completo}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Para desativar este posto, os funcionários ativos abaixo serão desvinculados.
              O histórico de registros será preservado.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => executarExclusao(modalExclusao.postoId, modalExclusao.label, modalExclusao.area, true)}
                disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {excluindo ? 'Desativando...' : 'Desvincular e Desativar'}
              </Button>
              <Button variant="outline" onClick={() => setModalExclusao(null)} disabled={excluindo}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

