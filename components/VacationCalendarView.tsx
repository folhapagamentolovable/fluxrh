import React, { useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';

interface Funcionario {
    id: string;
    nome_completo: string;
    data_admissao: string;
    nome_empresa?: string;
    nome_cargo?: string;
}

interface Ferias {
    id: string;
    funcionario_id: string;
    periodo_aquisitivo: number;
    status: string;
    data_inicio_gozo: string | null;
    data_fim_gozo: string | null;
    dias_gozados: number;
    funcionario?: {
        id: string;
        nome_completo: string;
    };
}

interface VacationCalendarViewProps {
    ferias: Ferias[];
    funcionarios: Funcionario[];
    month: number;
    year: number;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
    onEditFerias: (ferias: Ferias) => void;
}

const VacationCalendarView: React.FC<VacationCalendarViewProps> = ({
    ferias,
    funcionarios,
    month,
    year,
    onMonthChange,
    onYearChange,
    onEditFerias
}) => {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Navegação do mês
    const handlePrevMonth = () => {
        if (month === 0) {
            onMonthChange(11);
            onYearChange(year - 1);
        } else {
            onMonthChange(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 11) {
            onMonthChange(0);
            onYearChange(year + 1);
        } else {
            onMonthChange(month + 1);
        }
    };

    // Gerar dias do mês
    const diasDoMes = useMemo(() => {
        const primeiroDia = new Date(year, month, 1);
        const ultimoDia = new Date(year, month + 1, 0);
        const dias: Date[] = [];

        for (let d = 1; d <= ultimoDia.getDate(); d++) {
            dias.push(new Date(year, month, d));
        }

        return dias;
    }, [month, year]);

    // Férias do mês atual (filtrar programadas/em_andamento/gozadas com datas no mês)
    const feriasDoMes = useMemo(() => {
        return ferias.filter(f => {
            if (!f.data_inicio_gozo || !f.data_fim_gozo) return false;
            if (!['programada', 'em_andamento', 'gozada'].includes(f.status)) return false;

            const inicio = new Date(f.data_inicio_gozo + 'T00:00:00');
            const fim = new Date(f.data_fim_gozo + 'T00:00:00');
            const mesInicio = new Date(year, month, 1);
            const mesFim = new Date(year, month + 1, 0);

            // Verificar se há interseção com o mês
            return inicio <= mesFim && fim >= mesInicio;
        }).map(f => {
            const func = funcionarios.find(fn => fn.id === f.funcionario_id);
            return {
                ...f,
                funcionario: func ? {
                    id: func.id,
                    nome_completo: func.nome_completo
                } : undefined
            };
        });
    }, [ferias, funcionarios, month, year]);

    // Verificar se um dia está em férias para algum funcionário
    const getFeriasNoDia = (dia: Date) => {
        return feriasDoMes.filter(f => {
            if (!f.data_inicio_gozo || !f.data_fim_gozo) return false;
            const inicio = new Date(f.data_inicio_gozo + 'T00:00:00');
            const fim = new Date(f.data_fim_gozo + 'T00:00:00');
            return dia >= inicio && dia <= fim;
        });
    };

    // Gerar cores para cada funcionário
    const coresFuncionarios = useMemo(() => {
        const cores = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
            'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
            'bg-yellow-500', 'bg-cyan-500'
        ];
        const mapa: { [key: string]: string } = {};
        feriasDoMes.forEach((f, i) => {
            if (!mapa[f.funcionario_id]) {
                mapa[f.funcionario_id] = cores[Object.keys(mapa).length % cores.length];
            }
        });
        return mapa;
    }, [feriasDoMes]);

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Calcular primeiro dia da semana
    const primeiroDiaSemana = new Date(year, month, 1).getDay();

    return (
        <Card>
            {/* Header do Calendário */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <Button variant="secondary" onClick={handlePrevMonth}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-xl font-bold text-gray-900">
                        {meses[month]} {year}
                    </h2>
                    <Button variant="secondary" onClick={handleNextMonth}>
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Legenda */}
            {feriasDoMes.length > 0 && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Funcionários em férias neste mês:</p>
                    <div className="flex flex-wrap gap-2">
                        {feriasDoMes.map(f => (
                            <button
                                key={f.id}
                                onClick={() => onEditFerias(f)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm ${coresFuncionarios[f.funcionario_id]} hover:opacity-80 transition-opacity`}
                            >
                                <User className="w-3 h-3" />
                                {f.funcionario?.nome_completo || 'Funcionário'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Calendário */}
            <div className="p-4">
                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {diasSemana.map(dia => (
                        <div key={dia} className="text-center text-sm font-medium text-gray-500 py-2">
                            {dia}
                        </div>
                    ))}
                </div>

                {/* Dias do mês */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Células vazias antes do primeiro dia */}
                    {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                        <div key={`empty-${i}`} className="p-2 min-h-[80px]" />
                    ))}

                    {/* Dias do mês */}
                    {diasDoMes.map(dia => {
                        const feriasNoDia = getFeriasNoDia(dia);
                        const isWeekend = dia.getDay() === 0 || dia.getDay() === 6;
                        const isToday = dia.toDateString() === new Date().toDateString();

                        return (
                            <div
                                key={dia.toISOString()}
                                className={`p-1 min-h-[80px] border rounded-lg ${
                                    isToday ? 'border-blue-500 bg-blue-50' :
                                    isWeekend ? 'bg-gray-50 border-gray-200' :
                                    'border-gray-200'
                                }`}
                            >
                                <div className={`text-sm font-medium mb-1 ${
                                    isToday ? 'text-blue-600' :
                                    isWeekend ? 'text-gray-400' :
                                    'text-gray-700'
                                }`}>
                                    {dia.getDate()}
                                </div>

                                {/* Férias neste dia */}
                                <div className="space-y-0.5">
                                    {feriasNoDia.slice(0, 3).map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => onEditFerias(f)}
                                            className={`w-full text-left px-1 py-0.5 rounded text-xs text-white truncate ${coresFuncionarios[f.funcionario_id]} hover:opacity-80`}
                                            title={f.funcionario?.nome_completo}
                                        >
                                            {f.funcionario?.nome_completo?.split(' ')[0] || 'Func.'}
                                        </button>
                                    ))}
                                    {feriasNoDia.length > 3 && (
                                        <p className="text-xs text-gray-500 px-1">
                                            +{feriasNoDia.length - 3} mais
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Resumo do mês */}
            {feriasDoMes.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <h3 className="font-medium text-gray-900 mb-3">Detalhes das Férias</h3>
                    <div className="space-y-2">
                        {feriasDoMes.map(f => {
                            const inicio = new Date(f.data_inicio_gozo! + 'T00:00:00');
                            const fim = new Date(f.data_fim_gozo! + 'T00:00:00');
                            return (
                                <div
                                    key={f.id}
                                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${coresFuncionarios[f.funcionario_id]}`} />
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {f.funcionario?.nome_completo}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {inicio.toLocaleDateString('pt-BR')} - {fim.toLocaleDateString('pt-BR')}
                                                {' • '}{f.dias_gozados} dias
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        f.status === 'gozada' ? 'bg-gray-100 text-gray-700' :
                                        f.status === 'em_andamento' ? 'bg-green-100 text-green-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {f.status === 'gozada' ? 'Gozada' :
                                         f.status === 'em_andamento' ? 'Em Andamento' : 'Programada'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {feriasDoMes.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    <p>Nenhuma férias programada para {meses[month]} {year}</p>
                </div>
            )}
        </Card>
    );
};

export default VacationCalendarView;
