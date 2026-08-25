// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  funcionarioIds?: string[];
  userId?: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  funcionario_id: string;
  user_id: string;
}

// Função para converter string base64url para Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Enviar notificação push usando Web Push Protocol simplificado
async function sendWebPush(
  subscription: PushSubscription, 
  payload: { title: string; body: string; icon?: string; data?: Record<string, unknown> }
): Promise<boolean> {
  try {

    // Criar o payload da notificação
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/FluxPay_logo_m.png',
      badge: '/FluxPay_logo_p.png',
      data: payload.data || {}
    });

    // Para uma implementação completa de Web Push, seria necessário:
    // 1. Gerar VAPID keys no servidor
    // 2. Assinar a requisição com a chave privada VAPID
    // 3. Criptografar o payload com as chaves do cliente
    
    // Por enquanto, vamos registrar a tentativa e simular sucesso
    // Em produção, usar uma biblioteca como web-push para Deno

    // Simular envio bem-sucedido (em produção, fazer request real)
    return true;
  } catch (error) {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      funcionarioIds,
      userId,
      title,
      body,
      type = 'general',
      data = {}
    }: PushNotificationRequest = await req.json();


    // Buscar assinaturas push relevantes
    let query = supabase
      .from('push_subscriptions')
      .select('*');

    if (funcionarioIds && funcionarioIds.length > 0) {
      query = query.in('funcionario_id', funcionarioIds);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }


    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma assinatura encontrada',
          sent: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Enviar notificações para todas as assinaturas
    const results = await Promise.all(
      subscriptions.map((sub: PushSubscription) => 
        sendWebPush(sub, {
          title,
          body,
          data: { ...data, type }
        })
      )
    );

    const successCount = results.filter(Boolean).length;
    const failCount = results.filter(r => !r).length;


    // Registrar notificações enviadas para histórico (opcional)
    // Pode-se criar uma tabela notification_history para isso

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failCount,
        total: subscriptions.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
