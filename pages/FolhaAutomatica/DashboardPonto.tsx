import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, 
  Clock, 
  Users, 
  Building2, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Registro {
  id: string;
  data_registro: string;
  primeiro_registro: string | null;
  quarto_registro: string | null;
  status: string;
  validacao_geolocalizacao: boolean;
  nome_funcionario: string;
  nome_posto: string;
  funcionario_id: string;
  posto_trabalho_id: string;
}

interface EstatisticasPosto {
  nome: string;
  totalRegistros: number;
  completos: number;
  incompletos: number;
}

interface EstatisticasDia {
  data: string;
  registros: number;
  completos: number;
  foraRaio: number;
}

const DashboardPonto: React.FC = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    carregarDados();
  }, [periodo]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

      const { data, error } = await supabase
        .from('folha_ponto_automatica')
        .select('*')
        .gte('data_registro', dataInicio.toISOString().split('T')[0])
        .order('data_registro', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas gerais
  const totalRegistros = registros.length;
  const registrosCompletos = registros.filter(r => r.status === 'finalizado' || (r.primeiro_registro && r.quarto_registro)).length;
  const registrosIncompletos = registros.filter(r => r.primeiro_registro && !r.quarto_registro && r.status !== 'finalizado').length;
  const registrosForaRaio = registros.filter(r => r.validacao_geolocalizacao === false).length;
  const funcionariosUnicos = new Set(registros.map(r => r.funcionario_id)).size;
  const postosUnicos = new Set(registros.map(r => r.posto_trabalho_id)).size;

  // Calcular horas médias trabalhadas
  const calcularHorasTrabalhadas = (registro: Registro): number => {
    if (!registro.primeiro_registro || !registro.quarto_registro) return 0;
    const entrada = new Date(`2000-01-01T${registro.primeiro_registro}`);
    const saida = new Date(`2000-01-01T${registro.quarto_registro}`);
    let diff = (saida.getTime() - entrada.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return Math.min(diff, 16); // Max 16h para evitar outliers
  };

  const horasTotais = registros.reduce((acc, r) => acc + calcularHorasTrabalhadas(r), 0);
  const horasMedias = registrosCompletos > 0 ? (horasTotais / registrosCompletos).toFixed(1) : '0';

  // Dados para gráfico de pizza (status)
  const dadosPizza = [
    { name: 'Completos', value: registrosCompletos, color: 'hsl(var(--chart-2))' },
    { name: 'Incompletos', value: registrosIncompletos, color: 'hsl(var(--chart-4))' },
    { name: 'Fora do Raio', value: registrosForaRaio, color: 'hsl(var(--chart-5))' }
  ].filter(d => d.value > 0);

  // Dados para gráfico de barras por posto
  const registrosPorPosto: Record<string, EstatisticasPosto> = {};
  registros.forEach(r => {
    if (!registrosPorPosto[r.nome_posto]) {
      registrosPorPosto[r.nome_posto] = {
        nome: r.nome_posto,
        totalRegistros: 0,
        completos: 0,
        incompletos: 0
      };
    }
    registrosPorPosto[r.nome_posto].totalRegistros++;
    if (r.status === 'finalizado' || (r.primeiro_registro && r.quarto_registro)) {
      registrosPorPosto[r.nome_posto].completos++;
    } else if (r.primeiro_registro && !r.quarto_registro) {
      registrosPorPosto[r.nome_posto].incompletos++;
    }
  });
  const dadosBarras = Object.values(registrosPorPosto)
    .sort((a, b) => b.totalRegistros - a.totalRegistros)
    .slice(0, 10);

  // Dados para gráfico de linha (tendência por dia)
  const registrosPorDia: Record<string, EstatisticasDia> = {};
  registros.forEach(r => {
    if (!registrosPorDia[r.data_registro]) {
      registrosPorDia[r.data_registro] = {
        data: r.data_registro,
        registros: 0,
        completos: 0,
        foraRaio: 0
      };
    }
    registrosPorDia[r.data_registro].registros++;
    if (r.status === 'finalizado' || (r.primeiro_registro && r.quarto_registro)) {
      registrosPorDia[r.data_registro].completos++;
    }
    if (r.validacao_geolocalizacao === false) {
      registrosPorDia[r.data_registro].foraRaio++;
    }
  });
  const dadosLinha = Object.values(registrosPorDia)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(d => ({
      ...d,
      dataFormatada: new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Ponto</h1>
          <p className="text-muted-foreground">Análise de registros de ponto via QR Code</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Período:</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as '7' | '30' | '90')}
            className="px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalRegistros}</p>
              <p className="text-sm text-muted-foreground">Total de Registros</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{registrosCompletos}</p>
              <p className="text-sm text-muted-foreground">Completos</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{registrosIncompletos}</p>
              <p className="text-sm text-muted-foreground">Incompletos</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{registrosForaRaio}</p>
              <p className="text-sm text-muted-foreground">Fora do Raio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{funcionariosUnicos}</p>
              <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{postosUnicos}</p>
              <p className="text-sm text-muted-foreground">Postos de Trabalho</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{horasMedias}h</p>
              <p className="text-sm text-muted-foreground">Média de Horas/Dia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de linha - Tendência */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendência de Registros
          </h3>
          {dadosLinha.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosLinha}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="dataFormatada" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="registros" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Total"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completos" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Completos"
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Sem dados para exibir
            </div>
          )}
        </div>

        {/* Gráfico de pizza - Status */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Distribuição por Status
          </h3>
          {dadosPizza.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Sem dados para exibir
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de barras - Por Posto */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Registros por Posto de Trabalho
        </h3>
        {dadosBarras.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosBarras} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="nome" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="completos" name="Completos" fill="hsl(var(--chart-2))" stackId="a" />
              <Bar dataKey="incompletos" name="Incompletos" fill="hsl(var(--chart-4))" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Sem dados para exibir
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPonto;
