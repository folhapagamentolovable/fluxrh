// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: 'Não autenticado' }, 401);
    const userId = claims.claims.sub;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: isAdminData } = await supabase.rpc('is_admin', { _user_id: userId });
    if (!isAdminData) return json({ error: 'Acesso restrito a administradores' }, 403);

    const { operacao_id, acao } = await req.json();
    if (!operacao_id) return json({ error: 'operacao_id obrigatório' }, 400);

    const { data: op, error: opErr } = await supabase.from('ia_auditoria_operacoes').select('*').eq('id', operacao_id).maybeSingle();
    if (opErr || !op) return json({ error: 'Operação não encontrada' }, 404);
    if (op.status !== 'pendente') return json({ error: `Operação já ${op.status}` }, 400);

    if (acao === 'cancelar') {
      await supabase.from('ia_auditoria_operacoes').update({ status: 'cancelada' }).eq('id', operacao_id);
      return json({ ok: true, status: 'cancelada' });
    }

    // Executar
    await supabase.from('ia_auditoria_operacoes').update({ status: 'confirmada' }).eq('id', operacao_id);
    const payload = op.payload_sugerido || {};
    const args = payload.args || payload;

    try {
      let executado: any;
      let idsAfetados: string[] = op.ids_afetados || [];

      if (op.tool_chamada === 'aplicar_aumento_salarial') {
        const preview: any[] = payload.preview || [];
        const rows = preview.map((p: any) => ({
          funcionario_id: p.funcionario_id,
          salario_base: p.salario_novo,
          data_inicio_vigencia: args.data_vigencia,
          motivo: args.motivo || `Aumento linear de ${args.percentual}% via IA`,
        }));
        // Fechar vigência anterior + inserir nova + atualizar funcionarios.salario_base
        for (const p of preview) {
          await supabase.from('historico_salarios').update({ data_fim_vigencia: subDay(args.data_vigencia) })
            .eq('funcionario_id', p.funcionario_id).is('data_fim_vigencia', null);
        }
        const { error: insErr } = await supabase.from('historico_salarios').insert(rows);
        if (insErr) throw new Error(insErr.message);
        for (const p of preview) {
          await supabase.from('funcionarios').update({ salario_base: p.salario_novo }).eq('id', p.funcionario_id);
        }
        idsAfetados = preview.map((p: any) => p.funcionario_id);
        executado = { total: preview.length };
      }
      else if (op.tool_chamada === 'atualizar_registro') {
        const { error } = await supabase.from(args.entidade).update(args.alteracoes).eq('id', args.id);
        if (error) throw new Error(error.message);
        idsAfetados = [args.id];
        executado = { id: args.id, alteracoes: args.alteracoes };
      }
      else if (op.tool_chamada === 'criar_registro') {
        const { data, error } = await supabase.from(args.entidade).insert(args.dados).select('id').single();
        if (error) throw new Error(error.message);
        idsAfetados = [data.id];
        executado = { id: data.id };
      }
      else if (op.tool_chamada === 'excluir_registro') {
        const { error } = await supabase.from(args.entidade).delete().eq('id', args.id);
        if (error) throw new Error(error.message);
        idsAfetados = [args.id];
        executado = { id: args.id };
      }
      else {
        throw new Error(`Tool não implementada: ${op.tool_chamada}`);
      }

      await supabase.from('ia_auditoria_operacoes').update({
        status: 'executada',
        payload_executado: executado,
        ids_afetados: idsAfetados,
      }).eq('id', operacao_id);

      return json({ ok: true, status: 'executada', executado, ids_afetados: idsAfetados });
    } catch (e: any) {
      await supabase.from('ia_auditoria_operacoes').update({
        status: 'erro', erro_mensagem: e.message || String(e),
      }).eq('id', operacao_id);
      return json({ error: e.message || String(e) }, 500);
    }
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});

function subDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
