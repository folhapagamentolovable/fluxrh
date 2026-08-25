// Componente de teste para verificar escalas PALMVIGDIURNO
import React, { useState, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { converterRegraVisualParaJSON } from '../utils/converterRegraVisualParaJSON';
import { interpretarRegraEscala } from '../utils/interpretadorRegrasEscala';

interface TestePalmvigEscalasProps {
  onClose?: () => void;
}

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Dados das escalas conforme banco de dados
const escalasPalmvig = {
  PALMVIGDIURNOT1: {
    codigo_escala: 'PALMVIGDIURNOT1',
    nome_escala: 'Vigia Diurno Palmeiras T1',
    turno: 'diurno',
    data_vigencia: '2025-01-01',
    trabalha_segunda: true,
    trabalha_terca: true,
    trabalha_quarta: true,
    trabalha_quinta: true,
    trabalha_sexta: true,
    trabalha_sabado: true,
    trabalha_domingo: true,
    trabalha_feriado: true,
    tipo_alternancia: 'DIAS_ALTERNADOS_T1',
    horarios_segunda: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_terca: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_quarta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_quinta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_sexta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_sabado: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_domingo: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_feriado: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' }
  },
  PALMVIGDIURNOT2: {
    codigo_escala: 'PALMVIGDIURNOT2',
    nome_escala: 'Vigia Diurno Palmeiras T2',
    turno: 'diurno',
    data_vigencia: '2025-01-01',
    trabalha_segunda: true,
    trabalha_terca: true,
    trabalha_quarta: true,
    trabalha_quinta: true,
    trabalha_sexta: true,
    trabalha_sabado: true,
    trabalha_domingo: true,
    trabalha_feriado: true,
    tipo_alternancia: 'DIAS_ALTERNADOS_T2',
    horarios_segunda: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_terca: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_quarta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_quinta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_sexta: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_sabado: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_domingo: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' },
    horarios_feriado: { entrada: '06:00', saida: '18:00', inicio_almoco: '12:00', termino_almoco: '12:00' }
  }
};

export const TestePalmvigEscalas: React.FC<TestePalmvigEscalasProps> = ({ onClose }) => {
  const [mes, setMes] = useState(12);
  const [ano, setAno] = useState(2025);

  const resultado = useMemo(() => {
    const regrasT1 = converterRegraVisualParaJSON(escalasPalmvig.PALMVIGDIURNOT1);
    const regrasT2 = converterRegraVisualParaJSON(escalasPalmvig.PALMVIGDIURNOT2);
    
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const dias: Array<{
      dia: number;
      diaSemana: string;
      trabalhaT1: boolean;
      trabalhaT2: boolean;
      correto: boolean;
    }> = [];

    let diasTrabalhoT1 = 0;
    let diasTrabalhoT2 = 0;

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mes - 1, dia);
      const diaSemana = diasSemana[data.getDay()];
      
      const resultT1 = interpretarRegraEscala(regrasT1, dia, mes, ano, diaSemana, false);
      const resultT2 = interpretarRegraEscala(regrasT2, dia, mes, ano, diaSemana, false);
      
      const trabalhaT1 = resultT1?.trabalha ?? true;
      const trabalhaT2 = resultT2?.trabalha ?? true;
      
      if (trabalhaT1) diasTrabalhoT1++;
      if (trabalhaT2) diasTrabalhoT2++;
      
      dias.push({
        dia,
        diaSemana,
        trabalhaT1,
        trabalhaT2,
        correto: trabalhaT1 !== trabalhaT2
      });
    }

    return {
      regrasT1,
      regrasT2,
      dias,
      diasTrabalhoT1,
      diasTrabalhoT2,
      diasNoMes
    };
  }, [mes, ano]);

  const erros = resultado.dias.filter(d => !d.correto).length;

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-foreground">Teste Escalas PALMVIGDIURNO</h2>
        {onClose && (
          <Button onClick={onClose} variant="outline" size="sm">Fechar</Button>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Mês</label>
          <select 
            value={mes} 
            onChange={(e) => setMes(Number(e.target.value))}
            className="border rounded px-3 py-2 bg-background text-foreground"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Ano</label>
          <select 
            value={ano} 
            onChange={(e) => setAno(Number(e.target.value))}
            className="border rounded px-3 py-2 bg-background text-foreground"
          >
            {[2024, 2025, 2026].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
          <h3 className="font-semibold text-blue-700 dark:text-blue-300">T1 - Alternância</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Tipo: {resultado.regrasT1.tipo}<br />
            Turma: {resultado.regrasT1.alternancia?.turma}<br />
            Trabalha 1º dia: {resultado.regrasT1.alternancia?.trabalha_primeiro_dia ? 'Sim' : 'Não'}
          </p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
          <h3 className="font-semibold text-green-700 dark:text-green-300">T2 - Alternância</h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            Tipo: {resultado.regrasT2.tipo}<br />
            Turma: {resultado.regrasT2.alternancia?.turma}<br />
            Trabalha 1º dia: {resultado.regrasT2.alternancia?.trabalha_primeiro_dia ? 'Sim' : 'Não'}
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 rounded bg-muted/50">
        <h3 className="font-semibold mb-2">Resumo</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">T1:</span> {resultado.diasTrabalhoT1} trabalho / {resultado.diasNoMes - resultado.diasTrabalhoT1} folga
          </div>
          <div>
            <span className="text-green-600 font-medium">T2:</span> {resultado.diasTrabalhoT2} trabalho / {resultado.diasNoMes - resultado.diasTrabalhoT2} folga
          </div>
          <div>
            <span className={erros > 0 ? 'text-red-600' : 'text-emerald-600'}>
              {erros > 0 ? `❌ ${erros} erros` : '✅ Todos alternando corretamente'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="text-left py-2 px-2">Dia</th>
              <th className="text-left py-2 px-2">Semana</th>
              <th className="text-center py-2 px-2">T1</th>
              <th className="text-center py-2 px-2">T2</th>
              <th className="text-center py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {resultado.dias.map(d => (
              <tr key={d.dia} className={`border-b ${!d.correto ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                <td className="py-1 px-2 font-mono">{d.dia.toString().padStart(2, '0')}</td>
                <td className="py-1 px-2">{d.diaSemana}</td>
                <td className={`py-1 px-2 text-center ${d.trabalhaT1 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                  {d.trabalhaT1 ? 'TRABALHO' : 'FOLGA'}
                </td>
                <td className={`py-1 px-2 text-center ${d.trabalhaT2 ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                  {d.trabalhaT2 ? 'TRABALHO' : 'FOLGA'}
                </td>
                <td className="py-1 px-2 text-center">
                  {d.correto ? '✅' : '❌'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TestePalmvigEscalas;
