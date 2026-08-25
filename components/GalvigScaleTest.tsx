import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';

interface GalvigScaleTestProps {
    onClose?: () => void;
}

const GalvigScaleTest: React.FC<GalvigScaleTestProps> = ({ onClose }) => {
    const [selectedScale, setSelectedScale] = useState('GALVIGNOTURNOT1');
    const [selectedMonth, setSelectedMonth] = useState(1);
    const [selectedYear, setSelectedYear] = useState(2025);
    const [testResults, setTestResults] = useState<any[]>([]);

    const galvigScales = [
        {
            code: 'GALVIGNOTURNOT1',
            name: 'GALVIG Noturno T1',
            rule: 'VIGENCIA: 01/01/2025\nDIAS-ALTERNADOS: 19:00-22:00/22:00-07:00 (desde 01/01/25=TRABALHA)\nDOMINGOS: TRABALHA\nFERIADOS: TRABALHA\nALTERNANCIA: T1 (trabalha primeiro dia)\nOBSERVACAO: Horario refeicao suprimido - trabalha direto 19:00-7:00'
        },
        {
            code: 'GALVIGNOTURNOT2',
            name: 'GALVIG Noturno T2',
            rule: 'VIGENCIA: 01/01/2025\nDIAS-ALTERNADOS: 19:00-22:00/22:00-07:00 (desde 01/01/25=FOLGA)\nDOMINGOS: TRABALHA\nFERIADOS: TRABALHA\nALTERNANCIA: T2 (folga primeiro dia)\nOBSERVACAO: Horario refeicao suprimido - trabalha direto 19:00-7:00'
        },
        {
            code: 'GALVIGDIURNOT1',
            name: 'GALVIG Diurno T1',
            rule: 'VIGENCIA: 01/01/2025\nDIAS-ALTERNADOS: 07:00-12:00/13:00-19:00 (desde 01/01/25=TRABALHA)\nSÁBADOS, DOMINGOS E FERIADOS (QUANDO ESTIVER TRABALHANDO) 07:00-12:00/12:00-19:00\nDOMINGOS: TRABALHA\nFERIADOS: TRABALHA\nALTERNANCIA: T1 (trabalha primeiro dia)\nOBSERVACAO: Horario refeicao suprimido aos sábados, domingos e feriados - trabalha direto 07:00-19:00'
        },
        {
            code: 'GALVIGDIURNOT2',
            name: 'GALVIG Diurno T2',
            rule: 'VIGENCIA: 01/01/2025\nDIAS-ALTERNADOS: 07:00-12:00/13:00-19:00 (desde 01/01/25=FOLGA)\nSÁBADOS, DOMINGOS E FERIADOS (QUANDO ESTIVER TRABALHANDO) 07:00-12:00/12:00-19:00\nDOMINGOS: TRABALHA\nFERIADOS: TRABALHA\nALTERNANCIA: T2 (folga primeiro dia)\nOBSERVACAO: Horario refeicao suprimido aos sábados, domingos e feriados - trabalha direto 07:00-19:00'
        }
    ];

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month, 0).getDate();
    };

    const getWeekday = (day: number, month: number, year: number) => {
        const date = new Date(year, month - 1, day);
        return diasSemana[date.getDay()];
    };

    // Função de interpretação das escalas GALVIG (simplificada para teste)
    const interpretarEscalaGalvig = (codigoEscala: string, day: number, month: number, year: number) => {
        const diaSemana = getWeekday(day, month, year);
        
        // Lógica específica para escalas GALVIG
        if (codigoEscala.includes('GALVIGNOTURNO')) {
            const isT1 = codigoEscala.includes('T1');
            
            // Data de referência: 01/01/2025
            const dataReferencia = new Date(2025, 0, 1);
            const dataAtual = new Date(year, month - 1, day);
            const diasPassados = Math.floor((dataAtual.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24));
            
            let trabalhaHoje = false;
            
            if (isT1) {
                // T1: trabalha primeiro dia (01/01/25), depois alterna
                trabalhaHoje = diasPassados % 2 === 0;
            } else {
                // T2: folga primeiro dia (01/01/25), depois alterna
                trabalhaHoje = diasPassados % 2 === 1;
            }
            
            if (trabalhaHoje) {
                return {
                    trabalha: true,
                    folga: false,
                    horarios: {
                        entrada: '19:00',
                        inicio_refeicao: '22:00',
                        termino_refeicao: '22:00', // Refeição suprimida
                        saida: '07:00'
                    }
                };
            } else {
                return { trabalha: false, folga: true, horarios: {} };
            }
        }
        
        if (codigoEscala.includes('GALVIGDIURNO')) {
            const isT1 = codigoEscala.includes('T1');
            
            // Data de referência: 01/01/2025
            const dataReferencia = new Date(2025, 0, 1);
            const dataAtual = new Date(year, month - 1, day);
            const diasPassados = Math.floor((dataAtual.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24));
            
            let trabalhaHoje = false;
            
            if (isT1) {
                // T1: trabalha primeiro dia (01/01/25), depois alterna
                trabalhaHoje = diasPassados % 2 === 0;
            } else {
                // T2: folga primeiro dia (01/01/25), depois alterna
                trabalhaHoje = diasPassados % 2 === 1;
            }
            
            if (trabalhaHoje) {
                // Verificar se é sábado, domingo ou feriado para usar horário especial
                const isWeekend = diaSemana === 'Sáb' || diaSemana === 'Dom';
                
                if (isWeekend) {
                    return {
                        trabalha: true,
                        folga: false,
                        horarios: {
                            entrada: '07:00',
                            inicio_refeicao: '12:00',
                            termino_refeicao: '12:00', // Refeição suprimida em fins de semana
                            saida: '19:00'
                        }
                    };
                } else {
                    return {
                        trabalha: true,
                        folga: false,
                        horarios: {
                            entrada: '07:00',
                            inicio_refeicao: '12:00',
                            termino_refeicao: '13:00', // Horário normal de refeição
                            saida: '19:00'
                        }
                    };
                }
            } else {
                return { trabalha: false, folga: true, horarios: {} };
            }
        }
        
        return { trabalha: false, folga: true, horarios: {} };
    };

    const runTest = () => {
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const results = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayInfo = interpretarEscalaGalvig(selectedScale, day, selectedMonth, selectedYear);
            results.push({
                dia: day,
                diaSemana: getWeekday(day, selectedMonth, selectedYear),
                ...dayInfo
            });
        }
        
        setTestResults(results);
    };

    const getSelectedScaleInfo = () => {
        return galvigScales.find(s => s.code === selectedScale);
    };

    const calculateStats = () => {
        if (testResults.length === 0) return null;
        
        const diasTrabalhados = testResults.filter(d => d.trabalha).length;
        const diasFolga = testResults.filter(d => d.folga).length;
        const sabadosTrabalhados = testResults.filter(d => d.diaSemana === 'Sáb' && d.trabalha).length;
        const domingosTrabalhados = testResults.filter(d => d.diaSemana === 'Dom' && d.trabalha).length;
        
        return {
            diasTrabalhados,
            diasFolga,
            sabadosTrabalhados,
            domingosTrabalhados,
            total: testResults.length
        };
    };

    const stats = calculateStats();

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">🧪 Teste das Escalas GALVIG</h2>
                    {onClose && (
                        <Button variant="secondary" onClick={onClose} className="text-sm">
                            Fechar
                        </Button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <Select
                        label="Escala GALVIG"
                        value={selectedScale}
                        onChange={(e) => setSelectedScale(e.target.value)}
                    >
                        {galvigScales.map(scale => (
                            <option key={scale.code} value={scale.code}>
                                {scale.name}
                            </option>
                        ))}
                    </Select>
                    
                    <Select
                        label="Mês"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {months.map((month, index) => (
                            <option key={index} value={index + 1}>
                                {month}
                            </option>
                        ))}
                    </Select>
                    
                    <Select
                        label="Ano"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </Select>
                    
                    <div className="flex items-end">
                        <Button onClick={runTest} className="w-full">
                            Testar Escala
                        </Button>
                    </div>
                </div>
                
                {/* Informações da Escala Selecionada */}
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                    <h3 className="font-semibold mb-2">📋 Regra da Escala: {getSelectedScaleInfo()?.name}</h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {getSelectedScaleInfo()?.rule}
                    </pre>
                </div>
            </Card>

            {/* Estatísticas */}
            {stats && (
                <Card className="bg-green-50 border border-green-200">
                    <h3 className="text-lg font-semibold mb-3 text-green-800">
                        📊 Estatísticas - {months[selectedMonth - 1]}/{selectedYear}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.diasTrabalhados}</div>
                            <div className="text-green-700">Dias Trabalhados</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">{stats.diasFolga}</div>
                            <div className="text-gray-700">Dias de Folga</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.sabadosTrabalhados}</div>
                            <div className="text-purple-700">Sábados Trabalhados</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.domingosTrabalhados}</div>
                            <div className="text-blue-700">Domingos Trabalhados</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
                            <div className="text-orange-700">Total de Dias</div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Resultado do Teste */}
            {testResults.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">
                        📅 Resultado: {getSelectedScaleInfo()?.name} - {months[selectedMonth - 1]}/{selectedYear}
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dia</th>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sem.</th>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Entrada</th>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Início Ref.</th>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Término Ref.</th>
                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Saída</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {testResults.map((dia) => (
                                    <tr key={dia.dia} className={
                                        dia.folga ? 'bg-gray-50' : 
                                        dia.diaSemana === 'Sáb' || dia.diaSemana === 'Dom' ? 'bg-blue-50' :
                                        'hover:bg-gray-50'
                                    }>
                                        <td className="px-2 py-2 text-center font-semibold">
                                            {String(dia.dia).padStart(2, '0')}
                                        </td>
                                        <td className="px-2 py-2 text-center">{dia.diaSemana}</td>
                                        <td className="px-2 py-2 text-center">
                                            {dia.folga ? (
                                                <span className="text-gray-600">Folga</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">Trabalha</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-center">{dia.horarios?.entrada || '-'}</td>
                                        <td className="px-2 py-2 text-center">{dia.horarios?.inicio_refeicao || '-'}</td>
                                        <td className="px-2 py-2 text-center">
                                            {dia.horarios?.termino_refeicao || '-'}
                                            {dia.horarios?.inicio_refeicao === dia.horarios?.termino_refeicao && dia.horarios?.inicio_refeicao && (
                                                <span className="text-xs text-red-500 block">Suprimida</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-center">{dia.horarios?.saida || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default GalvigScaleTest;