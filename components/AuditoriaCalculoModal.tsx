import React, { useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import Button from './ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  funcionario: any;
  folha: any;
  mes: number;
  ano: number;
}

type Item = {
  campo: string;
  rotulo: string;
  valor: number;
  origem: string;
  observacao?: string;
};

const fmt = (v: number) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Modal de auditoria por funcionário: lista TODOS os campos da folha_calculada
 * usados nos cálculos de Benefícios, Descontos e Faltas — inclusive os zerados —
 * para permitir rastrear divergências rapidamente.
 */
const AuditoriaCalculoModal: React.FC<Props> = ({ isOpen, onClose, funcionario, folha, mes, ano }) => {
  const [filtro, setFiltro] = useState('');
  const [mostrarZerados, setMostrarZerados] = useState(true);

  const grupos = useMemo(() => {
    const f = folha || {};
    const n = (k: string): number => Number(f[k] || 0);

    const beneficios: Item[] = [
      { campo: 'vale_transporte_mes_anterior', rotulo: 'VT Mês Anterior', valor: n('vale_transporte_mes_anterior'), origem: 'folha_calculada' },
      { campo: 'vale_transporte_mes_atual', rotulo: 'VT Mês Atual', valor: n('vale_transporte_mes_atual'), origem: 'folha_calculada' },
      { campo: 'vale_transporte', rotulo: 'Vale Transporte (total, fallback)', valor: n('vale_transporte'), origem: 'folha_calculada', observacao: 'usado quando não há separação por mês' },
      { campo: 'vale_alimentacao_mes_anterior', rotulo: 'VA Mês Anterior', valor: n('vale_alimentacao_mes_anterior'), origem: 'folha_calculada' },
      { campo: 'vale_alimentacao_mes_atual', rotulo: 'VA Mês Atual', valor: n('vale_alimentacao_mes_atual'), origem: 'folha_calculada' },
      { campo: 'vale_alimentacao', rotulo: 'Vale Alimentação (total, fallback)', valor: n('vale_alimentacao'), origem: 'folha_calculada', observacao: 'usado quando não há separação por mês' },
      { campo: 'valor_vt_folgas_trabalhadas', rotulo: 'VT Folgas Trabalhadas', valor: n('valor_vt_folgas_trabalhadas'), origem: 'folha_calculada' },
      { campo: 'valor_va_folgas_trabalhadas', rotulo: 'VA Folgas Trabalhadas', valor: n('valor_va_folgas_trabalhadas'), origem: 'folha_calculada' },
      { campo: 'cesta_basica', rotulo: 'Cesta Básica', valor: n('cesta_basica'), origem: 'folha_calculada' },
      { campo: 'plr', rotulo: 'PLR', valor: n('plr'), origem: 'folha_calculada' },
      { campo: 'premio_permanencia', rotulo: 'Prêmio de Permanência', valor: n('premio_permanencia'), origem: 'folha_calculada' },
      { campo: 'reembolsos_uber', rotulo: 'Reembolsos', valor: n('reembolsos_uber'), origem: 'folha_calculada' },
      { campo: 'folga_trabalhada', rotulo: 'Folga(s) Trabalhada(s)', valor: n('folga_trabalhada'), origem: 'folha_calculada' },
      { campo: 'desc_ajuste_beneficios', rotulo: 'Desc. Ajuste dos Benefícios', valor: -n('desc_ajuste_beneficios'), origem: 'folha_calculada', observacao: 'subtraído do total de benefícios' },
      { campo: 'desc_rondas_nao_realizadas_benef', rotulo: 'Desc. Rondas (Benefício)', valor: -n('desc_rondas_nao_realizadas_benef'), origem: 'folha_calculada', observacao: 'subtraído do total de benefícios' },
    ];

    const faltas: Item[] = [
      { campo: 'desconto_faltas', rotulo: 'Faltas (salário)', valor: n('desconto_faltas'), origem: 'folha_calculada', observacao: 'reduz salário bruto — vai para Descontos' },
      { campo: 'desconto_dsr_faltas', rotulo: 'DSR s/ Faltas', valor: n('desconto_dsr_faltas'), origem: 'folha_calculada', observacao: 'DSR perdido por falta (LIM/ZEL)' },
      { campo: 'desconto_atrasos', rotulo: 'Atrasos', valor: n('desconto_atrasos'), origem: 'folha_calculada' },
      { campo: 'desconto_vt_faltas', rotulo: 'Devolução de VT por Faltas', valor: -n('desconto_vt_faltas'), origem: 'folha_calculada', observacao: 'aparece como negativo em Benefícios (devolução do VT pago adiantado)' },
      { campo: 'desconto_va_faltas', rotulo: 'Devolução de VA por Faltas', valor: -n('desconto_va_faltas'), origem: 'folha_calculada', observacao: 'aparece como negativo em Benefícios (devolução do VA pago adiantado)' },
    ];

    const descontos: Item[] = [
      { campo: 'desconto_inss', rotulo: 'INSS', valor: n('desconto_inss'), origem: 'folha_calculada' },
      { campo: 'desconto_irrf', rotulo: 'IRRF', valor: n('desconto_irrf'), origem: 'folha_calculada' },
      { campo: 'desconto_vt', rotulo: 'Vale Transporte (6%)', valor: n('desconto_vt'), origem: 'folha_calculada' },
      { campo: 'desconto_seguro_vida', rotulo: 'Seguro de Vida', valor: n('desconto_seguro_vida'), origem: 'folha_calculada' },
      { campo: 'desconto_convenio_odonto', rotulo: 'Convênio Odonto', valor: n('desconto_convenio_odonto'), origem: 'folha_calculada' },
      { campo: 'desconto_contribuicao_assistencial', rotulo: 'Contribuição Assistencial', valor: n('desconto_contribuicao_assistencial'), origem: 'folha_calculada' },
      { campo: 'desconto_pensao_alimenticia', rotulo: 'Pensão Alimentícia', valor: n('desconto_pensao_alimenticia'), origem: 'folha_calculada' },
      { campo: 'desconto_plr', rotulo: 'Desc. PLR', valor: n('desconto_plr'), origem: 'folha_calculada' },
      { campo: 'desconto_rondas_nao_realizadas', rotulo: 'Rondas não Realizadas (Salário)', valor: n('desconto_rondas_nao_realizadas'), origem: 'folha_calculada' },
      { campo: 'desconto_adiantamento_quinzenal', rotulo: 'Adiantamento Quinzenal', valor: n('desconto_adiantamento_quinzenal'), origem: 'folha_calculada' },
      { campo: 'desconto_adiantamento_salario', rotulo: 'Adiantam. de Salário', valor: n('desconto_adiantamento_salario'), origem: 'folha_calculada' },
      { campo: 'desconto_complemento_anterior', rotulo: 'Complemento Anterior', valor: n('desconto_complemento_anterior'), origem: 'folha_calculada' },
      { campo: 'desc_avaria_utilitario', rotulo: 'Avaria Utilitário (Parcela)', valor: n('desc_avaria_utilitario'), origem: 'folha_calculada' },
      { campo: 'inss_13', rotulo: 'INSS 13º', valor: n('inss_13'), origem: 'folha_calculada' },
      { campo: 'inss_ferias', rotulo: 'INSS Férias', valor: n('inss_ferias'), origem: 'folha_calculada' },
      { campo: 'adiantamento_13_salario', rotulo: 'Adiantam. 13º Salário', valor: n('adiantamento_13_salario'), origem: 'folha_calculada' },
      { campo: 'adiantamento_vantagens_13', rotulo: 'Adiantam. Vantagens 13º', valor: n('adiantamento_vantagens_13'), origem: 'folha_calculada' },
    ];

    // Eventos excepcionais (JSON) — agrupados por tipo
    const eventos: Item[] = [];
    if (Array.isArray(f.eventos_excepcionais)) {
      f.eventos_excepcionais.forEach((ev: any, idx: number) => {
        eventos.push({
          campo: `eventos_excepcionais[${idx}]`,
          rotulo: `${ev?.tipo || '?'} — ${ev?.descricao || '(sem descrição)'}`,
          valor: Number(ev?.valor || 0),
          origem: 'folha_calculada.eventos_excepcionais (JSON)',
        });
      });
    }

    return { beneficios, faltas, descontos, eventos };
  }, [folha]);

  if (!isOpen) return null;

  const totais = {
    beneficios: grupos.beneficios.reduce((s, i) => s + i.valor, 0),
    faltas: grupos.faltas.reduce((s, i) => s + i.valor, 0),
    descontos: grupos.descontos.reduce((s, i) => s + i.valor, 0),
    eventos: grupos.eventos.reduce((s, i) => s + i.valor, 0),
  };

  const filtrar = (items: Item[]) => {
    const q = filtro.trim().toLowerCase();
    return items.filter((it) => {
      if (!mostrarZerados && !it.valor) return false;
      if (!q) return true;
      return (
        it.campo.toLowerCase().includes(q) ||
        it.rotulo.toLowerCase().includes(q) ||
        (it.observacao || '').toLowerCase().includes(q)
      );
    });
  };

  const Secao = ({ titulo, cor, items, total }: { titulo: string; cor: string; items: Item[]; total: number }) => {
    const visiveis = filtrar(items);
    return (
      <div className="mb-6">
        <div className={`flex justify-between items-center px-3 py-2 rounded-t ${cor}`}>
          <h3 className="font-bold text-white">{titulo} ({visiveis.length}/{items.length})</h3>
          <span className="font-bold text-white">{fmt(total)}</span>
        </div>
        <div className="border border-t-0 rounded-b overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2">Campo (BD)</th>
                <th className="text-left px-3 py-2">Rótulo</th>
                <th className="text-right px-3 py-2 w-32">Valor</th>
                <th className="text-left px-3 py-2">Observação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((it) => (
                <tr key={it.campo} className={`border-t ${!it.valor ? 'text-gray-400' : ''}`}>
                  <td className="px-3 py-1 font-mono text-xs">{it.campo}</td>
                  <td className="px-3 py-1">{it.rotulo}</td>
                  <td className={`px-3 py-1 text-right font-mono ${it.valor < 0 ? 'text-red-600' : ''}`}>{fmt(it.valor)}</td>
                  <td className="px-3 py-1 text-xs italic">{it.observacao || ''}</td>
                </tr>
              ))}
              {visiveis.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-3 text-center text-gray-500 italic">Nenhum item.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">🔍 Auditoria de Cálculo — {funcionario?.nome_completo}</h2>
            <p className="text-xs text-gray-600">
              Competência {String(mes).padStart(2, '0')}/{ano} · Campos de origem em <code>folha_calculada</code>
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 border-b flex flex-wrap gap-3 items-center bg-gray-50">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              placeholder="Filtrar por campo, rótulo ou observação…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mostrarZerados} onChange={(e) => setMostrarZerados(e.target.checked)} />
            Mostrar campos zerados
          </label>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <Secao titulo="Benefícios" cor="bg-blue-600" items={grupos.beneficios} total={totais.beneficios} />
          <Secao titulo="Faltas / Atrasos (origem)" cor="bg-amber-600" items={grupos.faltas} total={totais.faltas} />
          <Secao titulo="Descontos" cor="bg-red-600" items={grupos.descontos} total={totais.descontos} />
          {grupos.eventos.length > 0 && (
            <Secao titulo="Eventos Excepcionais (JSON)" cor="bg-purple-600" items={grupos.eventos} total={totais.eventos} />
          )}
        </div>

        <div className="px-6 py-3 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaCalculoModal;
