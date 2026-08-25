import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { useEscalas } from '../hooks/useSupabase';

interface GalvigScaleInserterProps {
    onClose?: () => void;
    onSuccess?: () => void;
}

const GalvigScaleInserter: React.FC<GalvigScaleInserterProps> = ({ onClose, onSuccess }) => {
    const { insert } = useEscalas();
    const [inserting, setInserting] = useState(false);
    const [results, setResults] = useState<string[]>([]);

    const escalasGalvig = [
        {
            codigo_escala: 'GALVIGNOTURNOT2',
            nome_escala: 'GALVIG Noturno T2 - Alternância Diária',
            regra_escala: `VIGENCIA: 01/01/2025
DIAS-ALTERNADOS: 19:00-22:00/22:00-07:00 (desde 01/01/25=FOLGA)
DOMINGOS: TRABALHA
FERIADOS: TRABALHA
ALTERNANCIA: T2 (folga primeiro dia)
OBSERVACAO: Horario refeicao suprimido - trabalha direto 19:00-7:00`,
            data_inicio: '2025-01-01'
        },
        {
            codigo_escala: 'GALVIGNOTURNOT1',
            nome_escala: 'GALVIG Noturno T1 - Alternância Diária',
            regra_escala: `VIGENCIA: 01/01/2025
DIAS-ALTERNADOS: 19:00-22:00/22:00-7:00 (desde 01/01/25=TRABALHA)
DOMINGOS: TRABALHA
FERIADOS: TRABALHA
ALTERNANCIA: T1 (trabalha primeiro dia)
OBSERVACAO: Horario refeicao suprimido - trabalha direto 19:00-7:00`,
            data_inicio: '2025-01-01'
        },
        {
            codigo_escala: 'GALVIGDIURNOT2',
            nome_escala: 'GALVIG Diurno T2 - Alternância Diária',
            regra_escala: `VIGENCIA: 01/01/2025
DIAS-ALTERNADOS: 07:00-12:00/13:00-19:00 (desde 01/01/25=FOLGA)
SÁBADOS, DOMINGOS E FERIADOS (QUANDO ESTIVER TRABALHANDO) 07:00-12:00/12:00-19:00 
DOMINGOS: TRABALHA
FERIADOS: TRABALHA
ALTERNANCIA: T2 (folga primeiro dia)
OBSERVACAO: Horario refeicao suprimido aos sábados, domingos e feriados - trabalha direto 07:00-19:00`,
            data_inicio: '2025-01-01'
        },
        {
            codigo_escala: 'GALVIGDIURNOT1',
            nome_escala: 'GALVIG Diurno T1 - Alternância Diária',
            regra_escala: `VIGENCIA: 01/01/2025
DIAS-ALTERNADOS: 07:00-12:00/13:00-19:00 (desde 01/01/25=TRABALHA)
SÁBADOS, DOMINGOS E FERIADOS (QUANDO ESTIVER TRABALHANDO) 07:00-12:00/12:00-19:00 
DOMINGOS: TRABALHA
FERIADOS: TRABALHA
ALTERNANCIA: T1 (trabalha primeiro dia)
OBSERVACAO: Horario refeicao suprimido aos sábados, domingos e feriados - trabalha direto 07:00-19:00`,
            data_inicio: '2025-01-01'
        }
    ];

    const insertAllScales = async () => {
        setInserting(true);
        setResults([]);
        const newResults: string[] = [];

        for (const escala of escalasGalvig) {
            try {
                newResults.push(`📝 Inserindo escala: ${escala.codigo_escala}...`);
                setResults([...newResults]);

                const result = await insert(escala);

                if (result.success) {
                    newResults.push(`✅ Escala ${escala.codigo_escala} inserida com sucesso!`);
                } else {
                    newResults.push(`❌ Erro ao inserir escala ${escala.codigo_escala}: ${result.error || 'Erro desconhecido'}`);
                }
                setResults([...newResults]);
            } catch (error) {
                newResults.push(`❌ Erro ao inserir escala ${escala.codigo_escala}: ${error}`);
                setResults([...newResults]);
            }
        }

        setInserting(false);
        if (onSuccess) onSuccess();
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Inserir Escalas GALVIG</h2>
            <Button onClick={insertAllScales} disabled={inserting}>
                {inserting ? 'Inserindo...' : 'Inserir Todas as Escalas'}
            </Button>
            {results.length > 0 && (
                <div className="mt-4 space-y-2">
                    {results.map((result, index) => (
                        <div key={index} className="text-sm">{result}</div>
                    ))}
                </div>
            )}
            {onClose && (
                <Button onClick={onClose} className="mt-4">
                    Fechar
                </Button>
            )}
        </Card>
    );
};

export default GalvigScaleInserter;