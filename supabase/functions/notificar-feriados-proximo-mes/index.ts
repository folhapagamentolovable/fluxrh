// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Determinar próximo mês (fuso Brasil: America/Sao_Paulo ~ UTC-3)
    const now = new Date();
    // Aproximação: usar UTC-3
    const brNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const year = brNow.getUTCFullYear();
    const month = brNow.getUTCMonth(); // 0-11 mês atual
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    const inicio = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
    const fimDate = new Date(Date.UTC(nextYear, nextMonth + 1, 0));
    const fim = `${fimDate.getUTCFullYear()}-${String(fimDate.getUTCMonth() + 1).padStart(2, "0")}-${String(fimDate.getUTCDate()).padStart(2, "0")}`;

    const { data: feriados, error: feriadosError } = await supabase
      .from("feriados")
      .select("data_feriado, nome_feriado, tipo_feriado")
      .gte("data_feriado", inicio)
      .lte("data_feriado", fim)
      .order("data_feriado", { ascending: true });

    if (feriadosError) throw feriadosError;

    if (!feriados || feriados.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Sem feriados no próximo mês", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const linhas = feriados.map(
      (f: any) => `${formatDateBR(f.data_feriado)} - ${f.nome_feriado}`,
    );
    const body = `Próximos feriados oficiais:\n${linhas.join("\n")}`;
    const title = `📅 Feriados de ${MESES[nextMonth]}/${nextYear}`;

    // Buscar todos os funcionários ativos
    const { data: funcionarios, error: funcError } = await supabase
      .from("funcionarios")
      .select("id")
      .eq("ativo", true);

    if (funcError) throw funcError;

    const funcionarioIds = (funcionarios || []).map((f: any) => f.id);

    if (funcionarioIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Sem funcionários ativos", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Invocar função de push
    const { data: pushResult, error: pushError } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: {
          funcionarioIds,
          title,
          body,
          type: "feriados",
          data: { type: "feriados", mes: nextMonth + 1, ano: nextYear },
        },
      },
    );

    if (pushError) throw pushError;

    // Registrar como mensagem broadcast (para aparecer no portal também)
    await supabase.from("mensagens_broadcast").insert({
      titulo: title,
      mensagem: body,
      tipo: "info",
      ativo: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        feriados: feriados.length,
        funcionarios: funcionarioIds.length,
        push: pushResult,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
