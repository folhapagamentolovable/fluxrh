import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, QrCode, CheckCircle2, AlertTriangle, Square, Clock, ChevronRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useRondasOperacao, useHorariosRonda, usePontosQRCode, detectarHorarioAtivoParaFuncionario, type HorarioRonda } from '../../../hooks/useRondas';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

// ── Web Audio API ────────────────────────────────────────────
function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch { /* silencioso em ambientes sem áudio */ }
}

const sons = {
  ok: () => beep(880, 200),
  inicio: () => { beep(660, 300); setTimeout(() => beep(880, 300), 350); },
  alerta: () => { beep(440, 400, 'sawtooth', 0.4); setTimeout(() => beep(330, 400, 'sawtooth', 0.4), 450); },
};

// ── Banner de status ─────────────────────────────────────────
type BannerType = 'success' | 'warning' | 'error' | 'info' | null;
interface Banner { type: BannerType; msg: string }

const bannerClasses: Record<NonNullable<BannerType>, string> = {
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-400 text-yellow-900',
  error: 'bg-red-500 text-white animate-pulse',
  info: 'bg-blue-500 text-white',
};

export default function LeituraQRCode() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { horarios } = useHorariosRonda();
  const { pontos } = usePontosQRCode();
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null);
  const [funcionarioNome, setFuncionarioNome] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState<HorarioRonda | null>(null);
  const { sessaoAtiva, leituras, fetchSessaoAtiva, iniciarSessao, registrarLeitura, encerrarSessao } = useRondasOperacao(funcionarioId);

  const [scanning, setScanning] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [banner, setBanner] = useState<Banner>({ type: null, msg: '' });
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carregar funcionário vinculado ao usuário logado
  useEffect(() => {
    if (!user) return;
    supabase.from('funcionarios').select('id, nome_completo').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) { setFuncionarioId(data.id); setFuncionarioNome(data.nome_completo); }
      });
  }, [user]);

  // Detectar automaticamente o horário ativo para este funcionário (considera escala mensal)
  useEffect(() => {
    if (horarios.length === 0 || !funcionarioId) return;
    const detectar = () => {
      detectarHorarioAtivoParaFuncionario(horarios, funcionarioId)
        .then(h => setHorarioSelecionado(h));
    };
    detectar();
    const interval = setInterval(detectar, 60000);
    return () => clearInterval(interval);
  }, [horarios, funcionarioId]);

  const mostrarBanner = useCallback((type: BannerType, msg: string, duracao = 4000) => {
    setBanner({ type, msg });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner({ type: null, msg: '' }), duracao);
  }, []);

  // Contador regressivo para próxima leitura
  useEffect(() => {
    if (!sessaoAtiva || !horarioSelecionado || leituras.length === 0) { setTempoRestante(null); return; }
    const ultima = leituras[leituras.length - 1];
    const proxPrevisto = new Date(ultima.lido_em).getTime() + horarioSelecionado.intervalo_entre_qrcodes_minutos * 60000;
    const tick = () => {
      const diff = Math.round((proxPrevisto - Date.now()) / 1000);
      setTempoRestante(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessaoAtiva, leituras, horarioSelecionado]);

  const iniciarScanner = async () => {
    setScanning(true);
    try {
      const scanner = new Html5Qrcode('ronda-qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        async (decoded) => {
          await scanner.stop().catch(() => {});
          setScanning(false);
          await processarQR(decoded);
        },
        () => {}
      );
    } catch (e: any) {
      setScanning(false);
      showToast('Erro ao iniciar câmera: ' + e.message, 'error');
    }
  };

  const pararScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const processarQR = async (data: string) => {
    if (processando) return;
    setProcessando(true);
    try {
      let qr: { type: string; id: string; nome: string; tipo: string };
      try { qr = JSON.parse(data); } catch { throw new Error('QR Code inválido'); }
      if (qr.type !== 'FLUXPAY_RONDA') throw new Error('Este QR Code não é de ronda');

      const ponto = pontos.find(p => p.id === qr.id);
      if (!ponto) throw new Error('Ponto não encontrado: ' + qr.nome);

      // QR PAI: inicia ou encerra sessão
      if (ponto.tipo === 'pai') {
        if (!sessaoAtiva) {
          await iniciarSessao(horarioSelecionado?.id);
          await registrarLeitura(ponto.id, horarioSelecionado || undefined);
          sons.inicio();
          mostrarBanner('info', `🚀 Ronda iniciada! Ponto: ${ponto.nome}`, 5000);
        } else {
          // Verificar se todos os filhos foram lidos
          const pontosHorario = horarioSelecionado ? pontos.filter(p => (horarioSelecionado.pontos_ids || []).includes(p.id) && p.tipo === 'filho') : [];
          const leitosIds = new Set(leituras.map(l => l.ponto_id));
          const faltam = pontosHorario.filter(p => !leitosIds.has(p.id));
          if (faltam.length > 0) {
            mostrarBanner('warning', `⚠️ Ainda faltam ${faltam.length} ponto(s): ${faltam.map(p => p.nome).join(', ')}`, 6000);
            sons.alerta();
          } else {
            await encerrarSessao();
            sons.inicio();
            mostrarBanner('info', '✅ Ronda encerrada com sucesso!', 5000);
          }
        }
        return;
      }

      // QR FILHO
      if (!sessaoAtiva) {
        mostrarBanner('error', '❌ Inicie a ronda primeiro escaneando o ponto PAI', 5000);
        sons.alerta();
        return;
      }

      const resultado = await registrarLeitura(ponto.id, horarioSelecionado || undefined);
      const status = resultado?.status;

      if (status === 'no_prazo') {
        sons.ok();
        mostrarBanner('success', `✅ ${ponto.nome} — Leitura no prazo!`);
      } else if (status === 'antecipado') {
        sons.ok();
        mostrarBanner('warning', `⚡ ${ponto.nome} — Leitura antecipada`);
      } else if (status === 'atrasado') {
        sons.alerta();
        mostrarBanner('error', `⏰ ${ponto.nome} — Leitura em ATRASO!`, 6000);
      }
    } catch (e: any) {
      mostrarBanner('error', '❌ ' + e.message, 5000);
      sons.alerta();
    } finally {
      setProcessando(false);
    }
  };

  const pontosHorario = horarioSelecionado
    ? pontos.filter(p => (horarioSelecionado.pontos_ids || []).includes(p.id)).sort((a, b) => a.numero_sequencial - b.numero_sequencial)
    : [];
  const leitosIds = new Set(leituras.map(l => l.ponto_id));
  const progresso = pontosHorario.length > 0 ? Math.round((leitosIds.size / pontosHorario.length) * 100) : 0;
  const proximoPonto = pontosHorario.find(p => !leitosIds.has(p.id));

  const formatTempo = (seg: number) => {
    if (seg < 0) return `${Math.abs(seg)}s atrasado`;
    const m = Math.floor(seg / 60), s = seg % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Banner de status */}
      {banner.type && (
        <div className={`fixed top-0 left-0 right-0 z-50 py-4 px-6 text-center text-lg font-bold shadow-lg transition-all ${bannerClasses[banner.type]}`}>
          {banner.msg}
        </div>
      )}

      <div className="p-4 max-w-lg mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Leitura de Ronda</h1>
            {funcionarioNome && <p className="text-sm text-muted-foreground">Vigia: {funcionarioNome}</p>}
          </div>
        </div>

        {/* Horário ativo (detectado automaticamente) */}
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0" />
            {horarioSelecionado ? (
              <div>
                <p className="text-sm font-semibold text-foreground">{horarioSelecionado.nome}</p>
                <p className="text-xs text-muted-foreground">{horarioSelecionado.hora_inicio} – {horarioSelecionado.hora_fim}</p>
              </div>
            ) : funcionarioId && horarios.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-foreground">Sem ronda ativa agora</p>
                <p className="text-xs text-muted-foreground">Fora do horário ou não escalado para hoje</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">Carregando...</p>
              </div>
            )}
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${horarioSelecionado ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {horarioSelecionado ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </Card>

        {/* Status da sessão */}
        {sessaoAtiva && (
          <Card className="mb-4 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-green-700 dark:text-green-400">Ronda em andamento</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Iniciada: {new Date(sessaoAtiva.iniciada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {pontosHorario.length > 0 && (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium text-foreground">{leitosIds.size}/{pontosHorario.length} pontos</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 mb-3">
                  <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progresso}%` }} />
                </div>
              </>
            )}

            {proximoPonto && (
              <div className="flex items-center gap-2 text-sm">
                <ChevronRight className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Próximo:</span>
                <span className="font-medium text-foreground">{proximoPonto.nome}</span>
                {tempoRestante !== null && (
                  <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded ${tempoRestante < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />{formatTempo(tempoRestante)}
                  </span>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Scanner */}
        <Card className="mb-4">
          <div id="ronda-qr-reader" className={`w-full rounded-lg overflow-hidden bg-muted ${scanning ? 'min-h-[280px]' : 'hidden'}`} />
          {!scanning && (
            <div className="flex flex-col items-center py-8 gap-4">
              <QrCode className="w-16 h-16 text-primary opacity-60" />
              <Button
                onClick={iniciarScanner}
                disabled={processando || !funcionarioId}
                className="w-full max-w-xs text-lg py-4 flex items-center justify-center gap-3"
              >
                <QrCode className="w-6 h-6" />
                {processando ? 'Processando...' : 'Escanear QR Code'}
              </Button>
              {!funcionarioId && <p className="text-xs text-muted-foreground text-center">Seu usuário não está vinculado a um funcionário.</p>}
            </div>
          )}
          {scanning && (
            <Button variant="outline" onClick={pararScanner} className="w-full mt-3 flex items-center justify-center gap-2">
              <Square className="w-4 h-4" /> Cancelar
            </Button>
          )}
        </Card>

        {/* Histórico da sessão */}
        {leituras.length > 0 && (
          <Card>
            <h3 className="font-semibold text-foreground mb-3 text-sm">Leituras desta sessão</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...leituras].reverse().map(l => (
                <div key={l.id} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                  l.status === 'no_prazo' ? 'bg-green-50 dark:bg-green-900/20' :
                  l.status === 'antecipado' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                  'bg-red-50 dark:bg-red-900/20'
                }`}>
                  {l.status === 'no_prazo' ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> :
                   l.status === 'antecipado' ? <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" /> :
                   <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  <span className="flex-1 font-medium text-foreground">{(l.ponto as any)?.nome || 'Ponto'}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.lido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {l.diferenca_minutos !== 0 && (
                    <span className={`text-xs font-mono ${l.diferenca_minutos > 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {l.diferenca_minutos > 0 ? '+' : ''}{l.diferenca_minutos}min
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
