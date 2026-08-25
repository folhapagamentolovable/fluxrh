import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, Send, AlertTriangle, Check, CircleSlash } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface Pendente {
    operacao_id: string;
    tool: string;
    descricao_humana: string;
    preview?: any[];
    diff?: any[];
    dados?: any;
    registro?: any;
    total_afetados?: number;
    total_incremento_mensal?: number;
    args?: any;
}

interface Turno {
    role: 'user' | 'assistant';
    content: string;
    pendentes?: Pendente[];
    erro?: string;
}

const AssistenteCadastrosChat: React.FC<Props> = ({ isOpen, onClose }) => {
    const [pergunta, setPergunta] = useState('');
    const [loading, setLoading] = useState(false);
    const [historico, setHistorico] = useState<Turno[]>([]);
    const [confirmando, setConfirmando] = useState<Pendente | null>(null);
    const [executandoId, setExecutandoId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
    }, [isOpen]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [historico, loading]);

    if (!isOpen) return null;

    const enviar = async () => {
        const p = pergunta.trim();
        if (!p || loading) return;
        setLoading(true);
        const novoHistorico: Turno[] = [...historico, { role: 'user', content: p }];
        setHistorico(novoHistorico);
        setPergunta('');
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistente-cadastros`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                    mensagens: novoHistorico.map((t) => ({ role: t.role, content: t.content })),
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                setHistorico((h) => [...h, { role: 'assistant', content: '', erro: data.error || `Erro ${resp.status}` }]);
            } else {
                setHistorico((h) => [...h, { role: 'assistant', content: data.resposta || '', pendentes: data.pendentes_confirmacao || [] }]);
            }
        } catch (e) {
            setHistorico((h) => [...h, { role: 'assistant', content: '', erro: e instanceof Error ? e.message : 'Erro de rede' }]);
        } finally {
            setLoading(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    };

    const executar = async (op: Pendente, acao: 'confirmar' | 'cancelar') => {
        setExecutandoId(op.operacao_id);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/executar-mutacao-cadastro`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ operacao_id: op.operacao_id, acao }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`);
            setHistorico((h) => [...h, { role: 'assistant', content: acao === 'confirmar' ? `✅ Operação executada com sucesso. IDs afetados: ${(data.ids_afetados || []).length}` : `❌ Operação cancelada.` }]);
        } catch (e) {
            setHistorico((h) => [...h, { role: 'assistant', content: '', erro: e instanceof Error ? e.message : 'Erro ao executar' }]);
        } finally {
            setExecutandoId(null);
            setConfirmando(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-popover text-popover-foreground w-full max-w-4xl h-[85vh] rounded-lg shadow-xl flex flex-col border border-border">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                            <h2 className="font-semibold">Assistente IA — Cadastros</h2>
                            <p className="text-xs text-muted-foreground">Consultas e alterações em cadastros com confirmação humana</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
                </div>

                {/* Mensagens */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {historico.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-12 space-y-2">
                            <Sparkles className="w-8 h-8 mx-auto text-purple-400" />
                            <div>Faça perguntas ou solicite alterações nos cadastros.</div>
                            <div className="text-xs">Exemplos:</div>
                            <ul className="text-xs space-y-1 max-w-md mx-auto text-left list-disc pl-5">
                                <li>"Quantos vigias ativos temos por empresa?"</li>
                                <li>"Aplique um aumento linear de 6,03% em todos os vigias a partir de 01/10/2026"</li>
                                <li>"Atualize o salário base do funcionário João da Silva para R$ 2.500"</li>
                                <li>"Liste os feriados de 2026"</li>
                            </ul>
                        </div>
                    )}

                    {historico.map((t, i) => (
                        <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${t.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}>
                                {t.erro ? (
                                    <div className="text-red-600 dark:text-red-400 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 mt-0.5" /> {t.erro}
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap">{t.content}</div>
                                )}
                                {t.pendentes?.map((p) => (
                                    <div key={p.operacao_id} className="mt-3 border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                                            <AlertTriangle className="w-4 h-4" /> Requer confirmação
                                        </div>
                                        <div className="text-sm text-foreground">{p.descricao_humana}</div>
                                        {p.total_afetados !== undefined && (
                                            <div className="text-xs text-muted-foreground">
                                                {p.total_afetados} registro(s) · Incremento mensal: R$ {(p.total_incremento_mensal || 0).toFixed(2)}
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => setConfirmando(p)}
                                                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
                                            >
                                                Ver preview e confirmar
                                            </button>
                                            <button
                                                onClick={() => executar(p, 'cancelar')}
                                                disabled={executandoId === p.operacao_id}
                                                className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/70 rounded"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Pensando...
                        </div>
                    )}
                </div>

                {/* Composer */}
                <div className="p-3 border-t border-border">
                    <div className="flex gap-2">
                        <textarea
                            ref={textareaRef}
                            value={pergunta}
                            onChange={(e) => setPergunta(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                            disabled={loading}
                            placeholder="Ex.: aumento de 6,03% para todos os vigias a partir de 01/10/2026..."
                            className="flex-1 resize-none border border-input bg-background rounded-md px-3 py-2 text-sm min-h-[52px] focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                        />
                        <button
                            onClick={enviar}
                            disabled={loading || !pergunta.trim()}
                            className="px-3 self-end h-[52px] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação Detalhada */}
            {confirmando && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-popover text-popover-foreground w-full max-w-3xl max-h-[85vh] rounded-lg shadow-xl flex flex-col border-2 border-amber-500">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <h3 className="font-semibold">Confirmar operação</h3>
                            </div>
                            <button onClick={() => setConfirmando(null)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-3">
                            <p className="font-medium">{confirmando.descricao_humana}</p>
                            {confirmando.preview && (
                                <div className="border rounded overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="p-2 text-left">Funcionário</th>
                                                <th className="p-2 text-left">Cargo</th>
                                                <th className="p-2 text-right">Atual</th>
                                                <th className="p-2 text-right">Novo</th>
                                                <th className="p-2 text-right">Δ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {confirmando.preview.map((p: any, i: number) => (
                                                <tr key={i} className="border-t">
                                                    <td className="p-2">{p.nome}</td>
                                                    <td className="p-2">{p.cargo}</td>
                                                    <td className="p-2 text-right">R$ {p.salario_atual.toFixed(2)}</td>
                                                    <td className="p-2 text-right font-semibold">R$ {p.salario_novo.toFixed(2)}</td>
                                                    <td className="p-2 text-right text-green-600">+R$ {p.diferenca.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {confirmando.diff && (
                                <div className="border rounded overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted"><tr><th className="p-2 text-left">Campo</th><th className="p-2 text-left">Antes</th><th className="p-2 text-left">Depois</th></tr></thead>
                                        <tbody>
                                            {confirmando.diff.map((d: any, i: number) => (
                                                <tr key={i} className="border-t">
                                                    <td className="p-2 font-mono">{d.campo}</td>
                                                    <td className="p-2 text-red-600">{JSON.stringify(d.antes)}</td>
                                                    <td className="p-2 text-green-600">{JSON.stringify(d.depois)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {confirmando.dados && (
                                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{JSON.stringify(confirmando.dados, null, 2)}</pre>
                            )}
                            {confirmando.registro && (
                                <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 p-3 rounded text-xs">
                                    <div className="font-semibold mb-1 text-red-700 dark:text-red-400">Registro a excluir:</div>
                                    <pre className="overflow-x-auto">{JSON.stringify(confirmando.registro, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => executar(confirmando, 'cancelar')}
                                disabled={executandoId === confirmando.operacao_id}
                                className="px-4 py-2 bg-muted hover:bg-muted/70 rounded text-sm flex items-center gap-1"
                            >
                                <CircleSlash className="w-4 h-4" /> Cancelar
                            </button>
                            <button
                                onClick={() => executar(confirmando, 'confirmar')}
                                disabled={executandoId === confirmando.operacao_id}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                            >
                                {executandoId === confirmando.operacao_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmar e executar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssistenteCadastrosChat;
