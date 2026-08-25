import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, DollarSign, TrendingUp, TrendingDown, Calendar, 
    Building2, Briefcase, AlertTriangle, ChevronDown, Filter,
    BarChart3, PieChart, Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, LineChart, Line, PieChart as RechartsPie, 
    Pie, Cell, Legend 
} from 'recharts';

interface FolhaCalculada {
    id: string;
    funcionario_id: string;
    nome_funcionario: string;
    mes: number;
    ano: number;
    salario_base: number;
    total_proventos: number;
    total_descontos: number;
    salario_liquido: number;
    fgts: number;
    inss_patronal: number;
    adicional_insalubridade: number;
    adicional_noturno: number;
    horas_extras_50: number;
    horas_extras_100: number;
    empresa_id: string;
    posto_trabalho_id: string;
}

interface Funcionario {
    id: string;
    nome_completo: string;
    data_admissao: string;
    ativo: boolean;
    demitido: boolean;
    empresa_id: string;
    posto_trabalho_id: string;
    cargo_id: string;
}

interface Empresa {
    id: string;
    nome_empresa: string;
}

interface Posto {
    id: string;
    nome_posto: string;
}

interface Ferias {
    id: string;
    funcionario_id: string;
    status: string;
    data_limite_concessivo: string;
}

const ManagerDashboard: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [folhasCalculadas, setFolhasCalculadas] = useState<FolhaCalculada[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [postos, setPostos] = useState<Posto[]>([]);
    const [ferias, setFerias] = useState<Ferias[]>([]);
    
    // Filtros
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');
    const [filtroPosto, setFiltroPosto] = useState<string>('');

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            
            const [folhasRes, funcRes, empRes, postosRes, feriasRes] = await Promise.all([
                supabase.from('folha_calculada').select('*').order('ano', { ascending: false }).order('mes', { ascending: false }),
                supabase.from('funcionarios').select('*'),
                supabase.from('empresas').select('id, nome_empresa'),
                supabase.from('postos_trabalho').select('id, nome_posto').is('local_area', null),
                supabase.from('ferias').select('id, funcionario_id, status, data_limite_concessivo')
            ]);

            if (folhasRes.error) throw folhasRes.error;
            if (funcRes.error) throw funcRes.error;
            if (empRes.error) throw empRes.error;
            if (postosRes.error) throw postosRes.error;
            if (feriasRes.error) throw feriasRes.error;

            setFolhasCalculadas(folhasRes.data || []);
            setFuncionarios(funcRes.data || []);
            setEmpresas(empRes.data || []);
            setPostos(postosRes.data || []);
            setFerias(feriasRes.data || []);
        } catch (error) {
            showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar dados
    const folhasFiltradas = useMemo(() => {
        return folhasCalculadas.filter(f => {
            if (filtroAno && f.ano !== filtroAno) return false;
            if (filtroEmpresa && f.empresa_id !== filtroEmpresa) return false;
            if (filtroPosto && f.posto_trabalho_id !== filtroPosto) return false;
            return true;
        });
    }, [folhasCalculadas, filtroAno, filtroEmpresa, filtroPosto]);

    const funcionariosFiltrados = useMemo(() => {
        return funcionarios.filter(f => {
            if (filtroEmpresa && f.empresa_id !== filtroEmpresa) return false;
            if (filtroPosto && f.posto_trabalho_id !== filtroPosto) return false;
            return true;
        });
    }, [funcionarios, filtroEmpresa, filtroPosto]);

    // Indicadores de Headcount
    const headcountIndicadores = useMemo(() => {
        const ativos = funcionariosFiltrados.filter(f => f.ativo && !f.demitido).length;
        const demitidos = funcionariosFiltrados.filter(f => f.demitido).length;
        const inativos = funcionariosFiltrados.filter(f => !f.ativo && !f.demitido).length;
        const total = funcionariosFiltrados.length;

        // Admissões/Demissões por mês no ano
        const anoAtual = filtroAno;
        const admissoesPorMes = Array(12).fill(0);
        const demissoesPorMes = Array(12).fill(0);

        funcionariosFiltrados.forEach(f => {
            const dataAdm = new Date(f.data_admissao);
            if (dataAdm.getFullYear() === anoAtual) {
                admissoesPorMes[dataAdm.getMonth()]++;
            }
        });

        return { ativos, demitidos, inativos, total, admissoesPorMes };
    }, [funcionariosFiltrados, filtroAno]);

    // Indicadores de Custo
    const custoIndicadores = useMemo(() => {
        // Agrupar por mês
        const custosPorMes: { [key: string]: { proventos: number; descontos: number; liquido: number; fgts: number; encargos: number; count: number } } = {};
        
        folhasFiltradas.forEach(f => {
            const key = `${f.ano}-${String(f.mes).padStart(2, '0')}`;
            if (!custosPorMes[key]) {
                custosPorMes[key] = { proventos: 0, descontos: 0, liquido: 0, fgts: 0, encargos: 0, count: 0 };
            }
            custosPorMes[key].proventos += f.total_proventos || 0;
            custosPorMes[key].descontos += f.total_descontos || 0;
            custosPorMes[key].liquido += f.salario_liquido || 0;
            custosPorMes[key].fgts += f.fgts || 0;
            custosPorMes[key].encargos += (f.fgts || 0) + (f.inss_patronal || 0);
            custosPorMes[key].count++;
        });

        // Converter para array ordenado
        const meses = Object.keys(custosPorMes).sort();
        const dados = meses.map(m => ({
            mes: m,
            mesLabel: new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            ...custosPorMes[m]
        }));

        // Totais do período
        const totalProventos = folhasFiltradas.reduce((acc, f) => acc + (f.total_proventos || 0), 0);
        const totalLiquido = folhasFiltradas.reduce((acc, f) => acc + (f.salario_liquido || 0), 0);
        const totalFGTS = folhasFiltradas.reduce((acc, f) => acc + (f.fgts || 0), 0);
        const totalEncargos = folhasFiltradas.reduce((acc, f) => acc + (f.fgts || 0) + (f.inss_patronal || 0), 0);
        
        // Média mensal
        const mesesUnicos = new Set(folhasFiltradas.map(f => `${f.ano}-${f.mes}`)).size || 1;
        const mediaProventos = totalProventos / mesesUnicos;
        const mediaLiquido = totalLiquido / mesesUnicos;

        // Custo total (salários + encargos)
        const custoTotal = totalProventos + totalEncargos;

        return { dados, totalProventos, totalLiquido, totalFGTS, totalEncargos, custoTotal, mediaProventos, mediaLiquido };
    }, [folhasFiltradas]);

    // Distribuição por componente
    const distribuicaoSalarial = useMemo(() => {
        const total = {
            salarioBase: 0,
            horasExtras: 0,
            adicionalNoturno: 0,
            insalubridade: 0,
            outros: 0
        };

        folhasFiltradas.forEach(f => {
            total.salarioBase += f.salario_base || 0;
            total.horasExtras += (f.horas_extras_50 || 0) + (f.horas_extras_100 || 0);
            total.adicionalNoturno += f.adicional_noturno || 0;
            total.insalubridade += f.adicional_insalubridade || 0;
            total.outros += (f.total_proventos || 0) - (f.salario_base || 0) - 
                           (f.horas_extras_50 || 0) - (f.horas_extras_100 || 0) - 
                           (f.adicional_noturno || 0) - (f.adicional_insalubridade || 0);
        });

        return [
            { name: 'Salário Base', value: total.salarioBase },
            { name: 'Horas Extras', value: total.horasExtras },
            { name: 'Adicional Noturno', value: total.adicionalNoturno },
            { name: 'Insalubridade', value: total.insalubridade },
            { name: 'Outros', value: Math.max(0, total.outros) }
        ].filter(d => d.value > 0);
    }, [folhasFiltradas]);

    // Tendência salarial (comparação com período anterior)
    const tendenciaSalarial = useMemo(() => {
        const anoAtual = filtroAno;
        const anoAnterior = filtroAno - 1;

        const custoAnoAtual = folhasCalculadas
            .filter(f => f.ano === anoAtual)
            .reduce((acc, f) => acc + (f.total_proventos || 0), 0);

        const custoAnoAnterior = folhasCalculadas
            .filter(f => f.ano === anoAnterior)
            .reduce((acc, f) => acc + (f.total_proventos || 0), 0);

        const variacao = custoAnoAnterior > 0 
            ? ((custoAnoAtual - custoAnoAnterior) / custoAnoAnterior) * 100 
            : 0;

        return { custoAnoAtual, custoAnoAnterior, variacao };
    }, [folhasCalculadas, filtroAno]);

    // Alertas de férias
    const alertasFerias = useMemo(() => {
        const hoje = new Date();
        const alertas = ferias.filter(f => {
            if (f.status === 'gozada') return false;
            const limite = new Date(f.data_limite_concessivo);
            const diasRestantes = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            return diasRestantes <= 60; // Alerta para vencer em até 60 dias
        });
        return alertas.length;
    }, [ferias]);

    const formatarMoeda = (valor: number) => {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Gerencial</h1>
                    <p className="text-gray-600 dark:text-gray-400">Visão consolidada de custos, headcount e tendências</p>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filtroAno}
                        onChange={(e) => setFiltroAno(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        {[2024, 2025, 2026].map(ano => (
                            <option key={ano} value={ano}>{ano}</option>
                        ))}
                    </select>
                    <select
                        value={filtroEmpresa}
                        onChange={(e) => setFiltroEmpresa(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="">Todas as Empresas</option>
                        {empresas.map(e => (
                            <option key={e.id} value={e.id}>{e.nome_empresa}</option>
                        ))}
                    </select>
                    <select
                        value={filtroPosto}
                        onChange={(e) => setFiltroPosto(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="">Todos os Postos</option>
                        {postos.map(p => (
                            <option key={p.id} value={p.id}>{p.nome_posto}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cards de Indicadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Headcount */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-dark-card border border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Funcionários Ativos</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{headcountIndicadores.ativos}</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                            {headcountIndicadores.demitidos} demitidos • {headcountIndicadores.inativos} inativos
                        </span>
                    </div>
                </div>

                {/* Custo Total */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-dark-card border border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Custo Total ({filtroAno})</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatarMoeda(custoIndicadores.custoTotal)}</p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                            Salários: {formatarMoeda(custoIndicadores.totalProventos)}
                        </span>
                    </div>
                </div>

                {/* Tendência */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-dark-card border border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Variação vs Ano Anterior</p>
                            <p className={`text-3xl font-bold ${tendenciaSalarial.variacao >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {tendenciaSalarial.variacao >= 0 ? '+' : ''}{tendenciaSalarial.variacao.toFixed(1)}%
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg ${tendenciaSalarial.variacao >= 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {tendenciaSalarial.variacao >= 0 
                                ? <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                                : <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                            }
                        </div>
                    </div>
                    <div className="mt-3 flex items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                            {filtroAno - 1}: {formatarMoeda(tendenciaSalarial.custoAnoAnterior)}
                        </span>
                    </div>
                </div>

                {/* Alertas */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-dark-card border border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Alertas de Férias</p>
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{alertasFerias}</p>
                        </div>
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Vencendo em até 60 dias</span>
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolução de Custos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Evolução de Custos Mensais
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={custoIndicadores.dados}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip 
                                    formatter={(value: number) => formatarMoeda(value)}
                                    labelFormatter={(label) => `Mês: ${label}`}
                                />
                                <Legend />
                                <Bar dataKey="proventos" name="Proventos" fill="#3b82f6" />
                                <Bar dataKey="encargos" name="Encargos" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribuição Salarial */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-500" />
                        Composição dos Proventos
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={distribuicaoSalarial}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {distribuicaoSalarial.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatarMoeda(value)} />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tendência de Custo por Funcionário */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        Custo Médio por Funcionário (Evolução Mensal)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={custoIndicadores.dados}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatarMoeda(v)} />
                                <Tooltip formatter={(value: number) => formatarMoeda(value)} />
                                <Line 
                                    type="monotone" 
                                    dataKey="proventos" 
                                    name="Custo Médio"
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Resumo Detalhado */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Resumo do Período</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Total Proventos</p>
                        <p className="text-lg font-bold text-gray-900">{formatarMoeda(custoIndicadores.totalProventos)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Total Líquido</p>
                        <p className="text-lg font-bold text-gray-900">{formatarMoeda(custoIndicadores.totalLiquido)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Total FGTS</p>
                        <p className="text-lg font-bold text-gray-900">{formatarMoeda(custoIndicadores.totalFGTS)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Total Encargos</p>
                        <p className="text-lg font-bold text-gray-900">{formatarMoeda(custoIndicadores.totalEncargos)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Média Mensal</p>
                        <p className="text-lg font-bold text-gray-900">{formatarMoeda(custoIndicadores.mediaProventos)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Folhas Processadas</p>
                        <p className="text-lg font-bold text-gray-900">{folhasFiltradas.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
