import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, X, Users } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useHorariosRonda, usePontosQRCode, type HorarioRonda } from '../../../hooks/useRondas';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';

const DIAS = [
  { key: 'seg', label: 'Seg' }, { key: 'ter', label: 'Ter' }, { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' }, { key: 'sex', label: 'Sex' }, { key: 'sab', label: 'Sáb' }, { key: 'dom', label: 'Dom' },
];

const EMPTY: Partial<HorarioRonda> = {
  nome: '', hora_inicio: '19:00', hora_fim: '06:00',
  intervalo_entre_qrcodes_minutos: 60, tolerancia_minutos_antes: 5, tolerancia_minutos_depois: 10,
  dias_semana: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'],
  pontos_ids: [], funcionarios_ids: [], ativo: true,
};

interface Funcionario {
  id: string;
  nome_completo: string;
  codigo_escala: string | null;
  empresa_id: string | null;
  posto_trabalho_id: string | null;
  nome_empresa: string | null;
  nome_posto: string | null;
}

type Turno = 'todos' | 'diurno' | 'noturno';

export default function HorariosRonda() {
  const { horarios, loading, salvar, remover } = useHorariosRonda();
  const { pontos } = usePontosQRCode();
  const { showToast } = useToast();
  const [modal, setModal] = useState<Partial<HorarioRonda> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');
  const [filtroPosto, setFiltroPosto] = useState<string>('');
  const [filtroTurno, setFiltroTurno] = useState<Turno>('todos');

  useEffect(() => {
    supabase
      .from('funcionarios')
      .select('id, nome_completo, codigo_escala, empresa_id, posto_trabalho_id, nome_empresa, nome_posto')
      .eq('ativo', true)
      .eq('demitido', false)
      .order('nome_completo')
      .then(({ data }) => {
        setFuncionarios((data || []) as Funcionario[]);
      });
  }, []);

  const empresas = Array.from(new Map(funcionarios.filter(f => f.empresa_id).map(f => [f.empresa_id!, f.nome_empresa || '—'])).entries());
  const postos = Array.from(new Map(
    funcionarios
      .filter(f => f.posto_trabalho_id && (!filtroEmpresa || f.empresa_id === filtroEmpresa))
      .map(f => [f.posto_trabalho_id!, f.nome_posto || '—'])
  ).entries());

  const inferirTurno = (cod: string | null): Turno => {
    const c = (cod || '').toUpperCase();
    if (c.includes('NOTURNO') || c.includes('NOT')) return 'noturno';
    if (c.includes('DIURNO') || c.includes('DIU')) return 'diurno';
    return 'todos';
  };

  const funcionariosFiltrados = funcionarios.filter(f => {
    if (filtroEmpresa && f.empresa_id !== filtroEmpresa) return false;
    if (filtroPosto && f.posto_trabalho_id !== filtroPosto) return false;
    if (filtroTurno !== 'todos') {
      const t = inferirTurno(f.codigo_escala);
      if (t !== filtroTurno) return false;
    }
    return true;
  });


  const toggleDia = (dia: string) => {
    const dias = modal?.dias_semana || [];
    setModal(m => ({ ...m, dias_semana: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia] }));
  };

  const togglePonto = (id: string) => {
    const ids = modal?.pontos_ids || [];
    setModal(m => ({ ...m, pontos_ids: ids.includes(id) ? ids.filter(p => p !== id) : [...ids, id] }));
  };

  const toggleFuncionario = (id: string) => {
    const ids = modal?.funcionarios_ids || [];
    setModal(m => ({ ...m, funcionarios_ids: ids.includes(id) ? ids.filter(f => f !== id) : [...ids, id] }));
  };

  const handleSalvar = async () => {
    if (!modal?.nome?.trim()) { showToast('Nome obrigatório', 'error'); return; }
    setSalvando(true);
    try {
      await salvar(modal);
      showToast('Horário salvo!', 'success');
      setModal(null);
    } catch (e: any) { showToast('Erro: ' + e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const handleRemover = async (h: HorarioRonda) => {
    if (!confirm(`Excluir "${h.nome}"?`)) return;
    try { await remover(h.id); showToast('Excluído!', 'success'); }
    catch (e: any) { showToast('Erro: ' + e.message, 'error'); }
  };

  const diasLabel = (dias: string[]) => dias.map(d => DIAS.find(x => x.key === d)?.label || d).join(', ');

  const vigiaLabel = (ids: string[]) => {
    if (!ids?.length) return '—';
    return ids.map(id => funcionarios.find(f => f.id === id)?.nome_completo?.split(' ')[0] || '?').join(', ');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-border rounded-xl p-6 w-full max-w-lg my-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">{modal.id ? 'Editar Horário' : 'Novo Horário'}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Nome *" value={modal.nome || ''} onChange={e => setModal(m => ({ ...m, nome: e.target.value }))} placeholder="Ex: Ronda Noturna 1" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Hora Início" type="time" value={modal.hora_inicio || '19:00'} onChange={e => setModal(m => ({ ...m, hora_inicio: e.target.value }))} />
                <Input label="Hora Fim" type="time" value={modal.hora_fim || '06:00'} onChange={e => setModal(m => ({ ...m, hora_fim: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Intervalo (min)" type="number" value={modal.intervalo_entre_qrcodes_minutos || 60} onChange={e => setModal(m => ({ ...m, intervalo_entre_qrcodes_minutos: +e.target.value }))} />
                <Input label="Tolerância Antes" type="number" value={modal.tolerancia_minutos_antes || 5} onChange={e => setModal(m => ({ ...m, tolerancia_minutos_antes: +e.target.value }))} />
                <Input label="Tolerância Depois" type="number" value={modal.tolerancia_minutos_depois || 10} onChange={e => setModal(m => ({ ...m, tolerancia_minutos_depois: +e.target.value }))} />
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

              {/* Vigias associados */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Vigias responsáveis
                  <span className="text-xs text-muted-foreground font-normal">(deixe vazio para todos)</span>
                </p>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={filtroEmpresa}
                    onChange={e => { setFiltroEmpresa(e.target.value); setFiltroPosto(''); }}
                    className="text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                  >
                    <option value="">Todas empresas</option>
                    {empresas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                  </select>
                  <select
                    value={filtroPosto}
                    onChange={e => setFiltroPosto(e.target.value)}
                    className="text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                  >
                    <option value="">Todos postos</option>
                    {postos.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                  </select>
                  <select
                    value={filtroTurno}
                    onChange={e => setFiltroTurno(e.target.value as Turno)}
                    className="text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                  >
                    <option value="todos">Todos turnos</option>
                    <option value="diurno">Diurno</option>
                    <option value="noturno">Noturno</option>
                  </select>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {funcionariosFiltrados.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-1">Nenhum funcionário encontrado para os filtros.</p>
                  ) : funcionariosFiltrados.map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted/50 rounded">
                      <input
                        type="checkbox"
                        checked={(modal.funcionarios_ids || []).includes(f.id)}
                        onChange={() => toggleFuncionario(f.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-foreground">
                        {f.nome_completo}
                        {f.codigo_escala && <span className="text-muted-foreground ml-1">({f.codigo_escala})</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>


              {pontos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Pontos de QR Code associados</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                    {pontos.filter(p => p.ativo).map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted/50 rounded">
                        <input type="checkbox" checked={(modal.pontos_ids || []).includes(p.id)} onChange={() => togglePonto(p.id)} className="w-4 h-4" />
                        <span className="text-xs text-foreground">{p.numero_sequencial}. {p.nome} <span className="text-muted-foreground">({p.tipo})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.ativo ?? true} onChange={e => setModal(m => ({ ...m, ativo: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-foreground">Ativo</span>
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
            <Clock className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Horários de Ronda</h1>
              <p className="text-sm text-muted-foreground">Configure horários, vigias e pontos de cada ronda.</p>
            </div>
          </div>
          <Button onClick={() => setModal({ ...EMPTY })} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Horário</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : horarios.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum horário cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Horário</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Intervalo</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Dias</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Vigias</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {horarios.map(h => (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium text-foreground">{h.nome}</td>
                    <td className="py-2 px-3 text-muted-foreground">{h.hora_inicio} – {h.hora_fim}</td>
                    <td className="py-2 px-3 text-muted-foreground">{h.intervalo_entre_qrcodes_minutos} min</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{diasLabel(h.dias_semana)}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs max-w-[160px] truncate" title={vigiaLabel(h.funcionarios_ids)}>
                      {vigiaLabel(h.funcionarios_ids)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${h.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {h.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setModal({ ...h })} className="p-1.5 hover:bg-muted rounded"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => handleRemover(h)} className="p-1.5 hover:bg-muted rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
