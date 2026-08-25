import React, { useState } from 'react';
import { Coffee, Plus, Edit2, Trash2, X } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { usePausasRonda, type PausaRonda } from '../../../hooks/useRondas';
import { useToast } from '../../../hooks/useToast';

const DIAS = [
  { key: 'seg', label: 'Seg' }, { key: 'ter', label: 'Ter' }, { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' }, { key: 'sex', label: 'Sex' }, { key: 'sab', label: 'Sáb' }, { key: 'dom', label: 'Dom' },
];

const EMPTY: Partial<PausaRonda> = { nome: '', hora_inicio: '12:00', hora_fim: '13:00', dias_semana: ['seg','ter','qua','qui','sex'], ativo: true };

export default function PausasRonda() {
  const { pausas, loading, salvar, remover } = usePausasRonda();
  const { showToast } = useToast();
  const [modal, setModal] = useState<Partial<PausaRonda> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const toggleDia = (dia: string) => {
    const dias = modal?.dias_semana || [];
    setModal(m => ({ ...m!, dias_semana: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia] }));
  };

  const handleSalvar = async () => {
    if (!modal?.nome?.trim()) { showToast('Nome obrigatório', 'error'); return; }
    setSalvando(true);
    try {
      await salvar(modal);
      showToast('Pausa salva!', 'success');
      setModal(null);
    } catch (e: any) { showToast('Erro: ' + e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const handleRemover = async (p: PausaRonda) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await remover(p.id); showToast('Excluído!', 'success'); }
    catch (e: any) { showToast('Erro: ' + e.message, 'error'); }
  };

  const diasLabel = (dias: string[]) => dias.map(d => DIAS.find(x => x.key === d)?.label || d).join(', ');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">{modal.id ? 'Editar Pausa' : 'Nova Pausa'}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Nome *" value={modal.nome || ''} onChange={e => setModal(m => ({ ...m!, nome: e.target.value }))} placeholder="Ex: Almoço, Jantar..." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Hora Início" type="time" value={modal.hora_inicio || '12:00'} onChange={e => setModal(m => ({ ...m!, hora_inicio: e.target.value }))} />
                <Input label="Hora Fim" type="time" value={modal.hora_fim || '13:00'} onChange={e => setModal(m => ({ ...m!, hora_fim: e.target.value }))} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Dias da Semana</p>
                <div className="flex gap-2 flex-wrap">
                  {DIAS.map(d => (
                    <button key={d.key} onClick={() => toggleDia(d.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        (modal.dias_semana || []).includes(d.key)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.ativo ?? true} onChange={e => setModal(m => ({ ...m!, ativo: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-foreground">Ativa</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSalvar} disabled={salvando} className="flex-1">{salvando ? 'Salvando...' : 'Salvar'}</Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coffee className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Pausas (Refeições)</h1>
              <p className="text-sm text-muted-foreground">Períodos de pausa que não geram inconsistências nos relatórios.</p>
            </div>
          </div>
          <Button onClick={() => setModal({ ...EMPTY })} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nova Pausa</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : pausas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coffee className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma pausa cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Horário</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Dias</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {pausas.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium text-foreground">{p.nome}</td>
                    <td className="py-2 px-3 text-muted-foreground">{p.hora_inicio} – {p.hora_fim}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{diasLabel(p.dias_semana)}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setModal({ ...p })} className="p-1.5 hover:bg-muted rounded"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => handleRemover(p)} className="p-1.5 hover:bg-muted rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
