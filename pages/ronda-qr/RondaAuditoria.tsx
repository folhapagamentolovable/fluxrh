import React, { useState, useEffect } from 'react';
import RondaLayout from './components/RondaLayout';
import { supabase } from '../../lib/supabase';
import { FileText, Loader2, Clock, User, Activity } from 'lucide-react';

export default function RondaAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rq_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setLogs(data);
    setLoading(false);
  };

  return (
    <RondaLayout title="Auditoria" subtitle="Trilha de auditoria completa do sistema">
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum registro de auditoria</p>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Os eventos do sistema serão registrados aqui</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Ação</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tabela</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Dispositivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{log.acao}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.tabela || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{log.dispositivo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </RondaLayout>
  );
}
