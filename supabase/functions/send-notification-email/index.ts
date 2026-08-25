// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  employeeName: string;
  messageType: "sugestao" | "reclamacao";
  theme: string;
  originalMessage: string;
  companyResponse: string;
  responseDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify user is admin
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!roles?.some((r: any) => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden - admin only' }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { 
      to, 
      employeeName, 
      messageType, 
      theme, 
      originalMessage, 
      companyResponse,
      responseDate 
    }: NotificationEmailRequest = await req.json();

    // Input validation
    if (!to || !employeeName || !messageType || !theme || !originalMessage || !companyResponse) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }


    const typeLabel = messageType === "sugestao" ? "Sugestão" : "Reclamação";

    // Escape HTML to prevent injection
    const escapeHtml = (str: string): string =>
      str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m] || m));

    const emailResponse = await resend.emails.send({
      from: "FluxPay <onboarding@resend.dev>",
      to: [to],
      subject: `Sua ${typeLabel} foi respondida - FluxPay`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-right: 8px; }
            .badge-theme { background: #dbeafe; color: #1e40af; }
            .badge-type { background: #fef3c7; color: #92400e; }
            .message-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0; }
            .response-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; margin: 15px 0; }
            .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
            .footer { background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📬 Sua mensagem foi respondida!</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${escapeHtml(employeeName)}</strong>!</p>
            <p>Temos boas notícias! A empresa respondeu à sua ${escapeHtml(typeLabel.toLowerCase())} enviada anteriormente.</p>
            <div style="margin: 20px 0;">
              <span class="badge badge-theme">${escapeHtml(theme)}</span>
              <span class="badge badge-type">${escapeHtml(typeLabel)}</span>
            </div>
            <div class="label">Sua mensagem original:</div>
            <div class="message-box">${escapeHtml(originalMessage)}</div>
            <div class="label">Resposta da empresa:</div>
            <div class="response-box">${escapeHtml(companyResponse)}</div>
            <p style="font-size: 12px; color: #64748b;">Respondido em: ${escapeHtml(responseDate || '')}</p>
            <p>Acesse o <strong>Portal do Funcionário</strong> para ver mais detalhes.</p>
          </div>
          <div class="footer">
            <p>Este é um email automático do sistema FluxPay.</p>
            <p>Por favor, não responda diretamente a este email.</p>
          </div>
        </body>
        </html>
      `,
    });


    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
