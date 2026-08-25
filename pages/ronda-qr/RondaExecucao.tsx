import React, { useState, useEffect, useCallback } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import QRCodeScanner from '../../components/QRCodeScanner';
import {
  Shield, QrCode, Clock, CheckCircle2, AlertTriangle, XCircle,
  Play, MapPin, Building2, User, Camera, ChevronRight, Loader2,
  Volume2, Coffee, BellRing, Timer
} from 'lucide-react';
import {
  gerarCiclosTurno, getCicloAtual, formatarHora, formatarHoraCompleta,
  getStatusColor, getStatusLabel, determinarStatusLeitura,
  getPausaAtual, getPausaProxima, PAUSAS_PADRAO, resolverDataTurno,
  type CicloInfo, type PontoGrade
} from './utils/rondaUtils';
import {
  classificarDesvioTempo, classificarSequenciaIncorreta,
  registrarNaoConformidade, getNivelColor, getNivelLabel
} from './utils/naoConformidades';

interface FuncionarioSelecionado {
  id: string;
  nome: string;
  empresa: string;
  posto: string;
  postoId: string;
  empresaId: string;
}

interface PontoRonda {
  id: string;
  nome: string;
  codigo: string;
  ordem: number;
  descricao: string | null;
  posto_trabalho_id?: string;
}

type QRPayload = {
  type?: string;
  id?: string;
  code?: string;
  codigo?: string;
  nome?: string;
  tipo?: string;
  postoId?: string;
  posto_id?: string;
  postoTrabalhoId?: string;
};

interface LeituraRealizada {
  pontoId: string;
  codigo: string;
  horario: Date;
  status: string;
  ordem: number;
}

export default function RondaExecucao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [funcionario, setFuncionario] = useState<FuncionarioSelecionado | null>(null);
  const [pontos, setPontos] = useState<PontoRonda[]>([]);
  const [leituras, setLeituras] = useState<LeituraRealizada[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [rondaIniciada, setRondaIniciada] = useState(false);
  const [proximoPontoIndex, setProximoPontoIndex] = useState(0);
  const [mensagem, setMensagem] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [horaAtual, setHoraAtual] = useState(new Date());

  // Pause state — resolve effective shift date using the same current time reference
  const dataTurno = resolverDataTurno(horaAtual);
  const pausaAtual = getPausaAtual(horaAtual, dataTurno);
  const pausaProxima = getPausaProxima(horaAtual, dataTurno, 5);

  const cicloAtual = getCicloAtual(dataTurno, horaAtual);
  const intervaloMinutos = 7;
  const toleranciaMinutos = 3;

  // Update clock every second for pause detection
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('ronda_funcionario');
    if (stored) {
      setFuncionario(JSON.parse(stored));
    } else {
      navigate('/ronda-qr/selecao');
    }
  }, []);

  useEffect(() => {
    if (funcionario?.postoId) {
      loadPontos(funcionario.postoId);
    }
  }, [funcionario]);

  const loadPontos = async (postoId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rq_pontos_ronda')
      .select('id, nome, codigo, ordem, descricao')
      .eq('posto_trabalho_id', postoId)
      .eq('ativo', true)
      .order('ordem');

    if (!error && data) {
      setPontos(data);
    }
    setLoading(false);
  };

  // Calculate expected schedule for current cycle
  const gradeHoraria: PontoGrade[] = [];
  if (cicloAtual && pontos.length > 0) {
    const pontosOrdenados = [...pontos].sort((a, b) => a.ordem - b.ordem);
    
    pontosOrdenados.forEach((ponto, index) => {
      const ideal = new Date(cicloAtual.horaInicioDate);
      ideal.setMinutes(ideal.getMinutes() + index * intervaloMinutos);
      
      const minimo = new Date(ideal);
      minimo.setMinutes(minimo.getMinutes() - toleranciaMinutos);
      
      const maximo = new Date(ideal);
      maximo.setMinutes(maximo.getMinutes() + toleranciaMinutos);
      
      gradeHoraria.push({
        ordem: ponto.ordem,
        pontoId: ponto.id,
        pontoNome: ponto.nome,
        pontoCodigo: ponto.codigo,
        horarioIdeal: ideal,
        horarioMinimo: minimo,
        horarioMaximo: maximo,
      });
    });

    // Return to QR0
    const pontoInicial = pontosOrdenados.find(p => p.ordem === 0);
    if (pontoInicial) {
      const idealRetorno = new Date(cicloAtual.horaInicioDate);
      idealRetorno.setMinutes(idealRetorno.getMinutes() + pontosOrdenados.length * intervaloMinutos);
      
      gradeHoraria.push({
        ordem: 999,
        pontoId: pontoInicial.id,
        pontoNome: `${pontoInicial.nome} (Retorno)`,
        pontoCodigo: pontoInicial.codigo,
        horarioIdeal: idealRetorno,
        horarioMinimo: new Date(idealRetorno.getTime() - toleranciaMinutos * 60000),
        horarioMaximo: new Date(idealRetorno.getTime() + toleranciaMinutos * 60000),
      });
    }
  }

  const proximoPonto = gradeHoraria[proximoPontoIndex];
  const rondaConcluida = proximoPontoIndex >= gradeHoraria.length;

  // Count out-of-order reads in this session for gravissima detection
  const sequenceViolationsInSession = leituras.filter(l => l.status === 'fora_de_ordem').length;

  const handleQRScan = useCallback((result: string) => {
    // Block scans during pause
    if (pausaAtual) {
      setShowScanner(false);
      setMensagem({ text: `⛔ Horário de refeição em vigor (${pausaAtual.pausa.descricao}). Leituras não são computadas.`, type: 'error' });
      return;
    }

    setShowScanner(false);
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];

    if (!proximoPonto) {
      setMensagem({ text: 'Ronda já concluída!', type: 'success' });
      return;
    }

    // Normalize the scanned value: trim whitespace and handle JSON-wrapped payloads
    let codigoLido = (result || '').trim();
    let qrPayload: QRPayload | null = null;
    if (codigoLido.startsWith('{')) {
      try {
        qrPayload = JSON.parse(codigoLido) as QRPayload;
        codigoLido = (qrPayload.codigo || qrPayload.code || qrPayload.id || '').toString().trim();
      } catch {
        qrPayload = null;
      }
    }

    // Match by codigo OR by id (UUID) — physical QR codes may contain either value
    const codigoLower = codigoLido.toLowerCase();
    const pontoLido = pontos.find(p =>
      (p.codigo || '').trim().toLowerCase() === codigoLower ||
      (p.id || '').trim().toLowerCase() === codigoLower
    );

    const postoQrPayload = qrPayload?.postoId || qrPayload?.posto_id || qrPayload?.postoTrabalhoId || null;
    const postoQrInvalido = Boolean(
      postoQrPayload &&
      funcionario?.postoId &&
      postoQrPayload !== funcionario.postoId
    );

    if (!pontoLido || postoQrInvalido) {
      const codigosDisponiveis = pontos.map(p => p.codigo).join(', ');
      setMensagem({
        text: `QR Code "${codigoLido}" não pertence a este posto. Códigos válidos: ${codigosDisponiveis || '(nenhum ponto cadastrado)'}`,
        type: 'error',
      });
      return;
    }

    // Use the canonical codigo for downstream comparisons
    codigoLido = pontoLido.codigo;

    if (leituras.some(l => l.codigo === codigoLido && l.ordem === proximoPontoIndex)) {
      setMensagem({ text: 'Ponto já registrado neste ciclo!', type: 'warning' });
      return;
    }

    const codigoEsperado = proximoPonto.pontoCodigo;
    if (codigoLido !== codigoEsperado) {
      // Out of sequence — classify non-conformity
      const vezesNoTurno = sequenceViolationsInSession + 1;
      const nc = classificarSequenciaIncorreta(funcionario?.nome || '', pontoLido.nome, vezesNoTurno);

      setLeituras(prev => [...prev, {
        pontoId: pontoLido.id,
        codigo: codigoLido,
        horario: agora,
        status: 'fora_de_ordem',
        ordem: proximoPontoIndex,
      }]);
      setMensagem({ text: nc.alerta_funcionario, type: 'error' });

      // Persist non-conformity
      if (funcionario) {
        registrarNaoConformidade({
          funcionario_id: funcionario.id,
          data_ronda: hoje,
          ciclo_numero: cicloAtual?.numero,
          nc,
        });
      }
      return;
    }

    const status = determinarStatusLeitura(agora, proximoPonto.horarioIdeal, toleranciaMinutos);
    
    // Calculate exact difference in minutes for non-conformity detection
    const diffMs = agora.getTime() - proximoPonto.horarioIdeal.getTime();
    const diffMinutos = Math.round(diffMs / 60000);

    setLeituras(prev => [...prev, {
      pontoId: pontoLido.id,
      codigo: codigoLido,
      horario: agora,
      status,
      ordem: proximoPontoIndex,
    }]);

    // Check for timing non-conformity
    const nc = classificarDesvioTempo(diffMinutos, funcionario?.nome || '', pontoLido.nome);
    if (nc && funcionario) {
      setMensagem({ text: nc.alerta_funcionario, type: nc.nivel === 'leve' ? 'warning' : 'error' });
      registrarNaoConformidade({
        funcionario_id: funcionario.id,
        data_ronda: hoje,
        ciclo_numero: cicloAtual?.numero,
        nc,
      });
    } else if (status === 'adiantado') {
      setMensagem({ text: 'Leitura adiantada. Registrada com sucesso.', type: 'warning' });
    } else if (status === 'atrasado') {
      setMensagem({ text: 'Leitura atrasada. Favor justificar.', type: 'warning' });
    } else {
      setMensagem({ text: 'Ponto correto! Registrado com sucesso.', type: 'success' });
    }

    setProximoPontoIndex(prev => prev + 1);

    if (proximoPontoIndex + 1 >= gradeHoraria.length) {
      setTimeout(() => {
        setMensagem({ text: 'Ciclo encerrado com sucesso!', type: 'success' });
      }, 1500);
    }
  }, [proximoPonto, pontos, leituras, proximoPontoIndex, gradeHoraria.length, pausaAtual, funcionario, cicloAtual, sequenceViolationsInSession]);

  const iniciarRonda = () => {
    if (pausaAtual) {
      setMensagem({ text: `⛔ Não é possível iniciar durante a pausa (${pausaAtual.pausa.descricao}).`, type: 'error' });
      return;
    }
    setRondaIniciada(true);
    setLeituras([]);
    setProximoPontoIndex(0);
    setMensagem(null);
  };

  if (!funcionario) return null;

  return (
    <RondaLayout title="Execução da Ronda" subtitle={`Ciclo ${cicloAtual?.numero || '-'} — ${cicloAtual?.horaInicio || '--:--'}`}>
      
      {/* ===== PAUSE APPROACHING ALERT (5 min before) ===== */}
      {pausaProxima && !pausaAtual && (
        <div className="mb-4 p-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/30 animate-pulse border-2 border-amber-300">
          <div className="flex items-center gap-3 mb-2">
            <BellRing className="w-10 h-10 flex-shrink-0 animate-bounce" />
            <div>
              <p className="text-2xl sm:text-3xl font-black leading-tight">
                ⏰ ATENÇÃO!
              </p>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 leading-snug">
            Em <span className="text-3xl sm:text-4xl underline decoration-4">{pausaProxima.minutosRestantes} minuto{pausaProxima.minutosRestantes > 1 ? 's' : ''}</span> inicia o intervalo de refeição.
          </p>
          <p className="text-lg sm:text-xl font-semibold mt-2 opacity-90">
            🍽️ {pausaProxima.pausa.descricao}
          </p>
          <p className="text-base sm:text-lg font-medium mt-3 bg-white/20 rounded-xl p-3">
            Durante o intervalo, <strong>NÃO faça rondas</strong>. As leituras não serão computadas.
          </p>
        </div>
      )}

      {/* ===== ACTIVE PAUSE BANNER ===== */}
      {pausaAtual && (
        <div className="mb-4 p-6 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 text-white shadow-2xl shadow-amber-500/40 border-2 border-yellow-300">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Coffee className="w-12 h-12 flex-shrink-0" />
            <p className="text-3xl sm:text-4xl font-black text-center">
              HORÁRIO DE REFEIÇÃO
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl sm:text-3xl font-bold">
              🍽️ {pausaAtual.pausa.descricao}
            </p>
            <p className="text-xl sm:text-2xl font-semibold bg-white/20 rounded-xl py-3 px-4 mt-3">
              ⛔ Leituras de QR Code <strong>NÃO</strong> serão computadas
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 text-lg font-medium opacity-90">
              <Timer className="w-5 h-5" />
              <span>Retorno previsto às <strong className="text-2xl">{pausaAtual.pausa.fim}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Header info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{funcionario.nome}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">{funcionario.empresa}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">{funcionario.posto}</span>
          </div>
        </div>
      </div>

      {/* Pause schedule info card */}
      <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/50 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Intervalos de Refeição</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {PAUSAS_PADRAO.map((p, i) => (
            <span key={i} className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm font-semibold">
              🍽️ {p.inicio} — {p.fim}
            </span>
          ))}
        </div>
      </div>

      {/* Message banner */}
      {mensagem && (
        <div className={`mb-4 p-4 rounded-2xl text-center font-semibold text-base transition-all animate-in fade-in duration-300
          ${mensagem.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : ''}
          ${mensagem.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : ''}
          ${mensagem.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' : ''}
        `}>
          {mensagem.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        </div>
      ) : !cicloAtual ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Clock className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-700 dark:text-slate-300">Fora do horário de ronda</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">As rondas ocorrem entre 19:00 e 06:00</p>
        </div>
      ) : pontos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <QrCode className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum ponto cadastrado</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Configure os pontos de ronda para este posto</p>
        </div>
      ) : !rondaIniciada ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pronto para iniciar</p>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {pontos.length} pontos na rota • Intervalo de {intervaloMinutos} min • Tolerância de ±{toleranciaMinutos} min
          </p>
          <button
            onClick={iniciarRonda}
            disabled={!!pausaAtual}
            className={`px-8 py-4 font-bold rounded-2xl shadow-xl transition-all duration-200 text-lg
              ${pausaAtual 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-1'
              }`}
          >
            <Play className="w-6 h-6 inline mr-2" />
            {pausaAtual ? 'Aguarde o fim da pausa' : 'Iniciar Ronda'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Next point + scan button */}
          {!rondaConcluida && proximoPonto && (
            <div className={`rounded-2xl p-5 border ${
              pausaAtual 
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
                : 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800'
            }`}>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                Próximo Ponto
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {proximoPonto.pontoNome}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                Código: <span className="font-mono font-bold">{proximoPonto.pontoCodigo}</span>
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                <span>Ideal: <strong>{formatarHora(proximoPonto.horarioIdeal)}</strong></span>
                <span>Min: {formatarHora(proximoPonto.horarioMinimo)}</span>
                <span>Max: {formatarHora(proximoPonto.horarioMaximo)}</span>
              </div>
              <button
                onClick={() => {
                  if (pausaAtual) {
                    setMensagem({ text: `⛔ Horário de refeição em vigor. Leituras suspensas até ${pausaAtual.pausa.fim}.`, type: 'error' });
                    return;
                  }
                  setShowScanner(true);
                }}
                disabled={!!pausaAtual}
                className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all duration-200 text-lg flex items-center justify-center gap-2
                  ${pausaAtual
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-0.5'
                  }`}
              >
                {pausaAtual ? (
                  <>
                    <Coffee className="w-6 h-6" />
                    Em Pausa — Aguarde
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    Ler QR Code
                  </>
                )}
              </button>
            </div>
          )}

          {rondaConcluida && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">Ronda Concluída!</p>
              <p className="text-green-600 dark:text-green-400 mt-1">{leituras.length} pontos registrados</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Cronograma da Ronda</h3>
            <div className="space-y-3">
              {gradeHoraria.map((ponto, index) => {
                const leitura = leituras.find(l => l.ordem === index);
                const isCurrent = index === proximoPontoIndex && !rondaConcluida;
                const isPending = index > proximoPontoIndex;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all
                      ${isCurrent ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 shadow-sm' : ''}
                      ${leitura ? 'bg-slate-50 dark:bg-slate-700/30' : ''}
                      ${isPending ? 'opacity-50' : ''}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${leitura
                        ? leitura.status === 'no_prazo' ? 'bg-green-500 text-white' :
                          leitura.status === 'adiantado' ? 'bg-amber-500 text-white' :
                          leitura.status === 'atrasado' ? 'bg-red-500 text-white' :
                          'bg-red-600 text-white'
                        : isCurrent ? 'bg-emerald-500 text-white animate-pulse' :
                          'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {leitura ? (
                        leitura.status === 'no_prazo' ? <CheckCircle2 className="w-4 h-4" /> :
                        leitura.status === 'fora_de_ordem' ? <XCircle className="w-4 h-4" /> :
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {ponto.pontoNome}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatarHora(ponto.horarioIdeal)}
                        {leitura && ` → ${formatarHoraCompleta(leitura.horario)}`}
                      </p>
                    </div>

                    {leitura && (
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${getStatusColor(leitura.status)}`}>
                        {getStatusLabel(leitura.status)}
                      </span>
                    )}
                    {isCurrent && !leitura && (
                      <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        ATUAL
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <span className="font-semibold">Ler QR Code</span>
              </div>
              <button onClick={() => setShowScanner(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-center text-sm text-slate-600 dark:text-slate-300 mb-3">
                Aponte a câmera para o QR Code: <strong>{proximoPonto?.pontoCodigo}</strong>
              </p>
              <QRCodeScanner
                onScan={handleQRScan}
                onClose={() => setShowScanner(false)}
                autoStart
              />
            </div>
          </div>
        </div>
      )}
    </RondaLayout>
  );
}
