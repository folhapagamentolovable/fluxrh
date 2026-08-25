import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    funcionarioId: string;
    funcionarioNome: string;
    mes: number;
    ano: number;
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Turno {
    pergunta: string;
    resposta?: string;
    erro?: string;
}

const AnaliseIAModal: React.FC<Props> = ({ isOpen, onClose, funcionarioId, funcionarioNome, mes, ano }) => {
    const [pergunta, setPergunta] = useState('');
    const [loading, setLoading] = useState(false);
    const [historico, setHistorico] = useState<Turno[]>([]);

    if (!isOpen) return null;

    const enviar = async () => {
        const p = pergunta.trim();
        if (!p || loading) return;
        setLoading(true);
        const turnoIndex = historico.length;
        setHistorico((h) => [...h, { pergunta: p }]);
        setPergunta('');
        try {
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisar-folha`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ funcionario_id: funcionarioId, mes, ano, pergunta: p }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                setHistorico((h) => h.map((t, i) => i === turnoIndex ? { ...t, erro: data.error || `Erro ${resp.status}` } : t));
            } else {
                setHistorico((h) => h.map((t, i) => i === turnoIndex ? { ...t, resposta: data.resposta } : t));
            }
        } catch (e) {
            setHistorico((h) => h.map((t, i) => i === turnoIndex ? { ...t, erro: e instanceof Error ? e.message : 'Erro de rede' } : t));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-popover text-popover-foreground w-full max-w-3xl max-h-[90vh] rounded-lg shadow-xl flex flex-col border border-border">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                            <h2 className="font-semibold">Análise por IA — {funcionarioNome}</h2>
                            <p className="text-xs text-muted-foreground">
                                Comparando {MESES[mes - 1]}/{ano} com {MESES[(mes === 1 ? 12 : mes - 1) - 1]}/{mes === 1 ? ano - 1 : ano}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {historico.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            Faça uma pergunta livre sobre a folha deste funcionário.
                            <br />
                            Ex.: <em>"Por que há um estouro do mês anterior de -R$ 832,26?"</em>
                        </div>
                    )}
                    {historico.map((t, i) => (
                        <div key={i} className="space-y-2">
                            <div className="bg-primary/10 rounded-lg p-3 text-sm">
                                <div className="font-semibold text-xs uppercase mb-1 text-primary">Pergunta</div>
                                {t.pergunta}
                            </div>
                            {t.resposta && (
                                <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                                    <div className="font-semibold text-xs uppercase mb-1 text-purple-500">Resposta</div>
                                    {t.resposta}
                                </div>
                            )}
                            {t.erro && (
                                <div className="bg-red-500/10 text-red-600 rounded-lg p-3 text-sm">
                                    <div className="font-semibold text-xs uppercase mb-1">Erro</div>
                                    {t.erro}
                                </div>
                            )}
                            {!t.resposta && !t.erro && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Analisando dados dos dois meses...
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                        <textarea
                            value={pergunta}
                            onChange={(e) => setPergunta(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    enviar();
                                }
                            }}
                            disabled={loading}
                            placeholder="Digite sua pergunta sobre a folha deste funcionário..."
                            className="flex-1 resize-none border border-input bg-background rounded-md px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                        />
                        <button
                            onClick={enviar}
                            disabled={loading || !pergunta.trim()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md text-sm font-medium self-end"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Perguntar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnaliseIAModal;
