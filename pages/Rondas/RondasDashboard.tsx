import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, Clock, TrendingDown, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import { fetchDashboardRondas } from '../../hooks/useRondas';
import { useToast } from '../../hooks/useToast';

interface DashStats {
  rondasHoje: number;
  rondasConcluidasHoje: number;
  conformidadeHoje: number;
  inconsistencias24h: number;
  minutosNaoRealizadosMes: number;
}

export default function RondasDashboard() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardRondas();
      setStats(data);
    } catch (e: any) {
      showToast('Erro ao carregar dashboard: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const horasNaoRealizadas = stats ? Math.floor(stats.minutosNaoRealizadosMes / 60) + 'h ' + (stats.minutosNaoRealizadosMes % 60) + 'min' : '—';

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rondas</h1>
            <p className="text-muted-foreground text-sm">Dashboard do módulo de rondas de segurança</p>
          </div>
        </div>
        <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rondas Hoje</p>
                <p className="text-2xl font-bold text-foreground">{stats?.rondasConcluidasHoje ?? 0}/{stats?.rondasHoje ?? 0}</p>
                <p className="text-xs text-green-600 font-medium">{stats?.conformidadeHoje ?? 0}% conformidade</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes Hoje</p>
                <p className="text-2xl font-bold text-foreground">{(stats?.rondasHoje ?? 0) - (stats?.rondasConcluidasHoje ?? 0)}</p>
                <p className="text-xs text-muted-foreground">em andamento ou não iniciadas</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inconsistências 24h</p>
                <p className="text-2xl font-bold text-foreground">{stats?.inconsistencias24h ?? 0}</p>
                <p className="text-xs text-muted-foreground">leituras fora do prazo</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Não Realizadas (mês)</p>
                <p className="text-2xl font-bold text-foreground">{horasNaoRealizadas}</p>
                <p className="text-xs text-muted-foreground">horas-ronda não cobertas</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Início Rápido</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-semibold text-foreground mb-1">1. Configure os Pontos</p>
            <p>Cadastre os pontos de QR Code do percurso de ronda em <strong>Configurações → Pontos de QR Code</strong>.</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-semibold text-foreground mb-1">2. Defina os Horários</p>
            <p>Crie os horários de ronda com intervalos e tolerâncias em <strong>Configurações → Horários de Ronda</strong>.</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-semibold text-foreground mb-1">3. Inicie a Operação</p>
            <p>O vigia acessa <strong>Operação → Leitura de QR Code</strong> para registrar as rondas em tempo real.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
