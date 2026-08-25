// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "create": {
        const { email, password, userName, role } = params;

        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { user_name: userName },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Assign role based on the provided role
        if (role !== 'user') {
          // Delete the default 'user' role if we want a different role
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", newUser.user.id);
            
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: newUser.user.id, role: role });
        }

        return new Response(JSON.stringify({ user: newUser.user, userId: newUser.user.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { userId } = params;

        // Prevent self-deletion
        if (userId === requestingUser.id) {
          return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "updateRole": {
        const { userId, newRole } = params;

        // Prevent self role change
        if (userId === requestingUser.id) {
          return new Response(JSON.stringify({ error: "Você não pode alterar sua própria permissão" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete existing roles
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Insert new role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (roleError) {
          return new Response(JSON.stringify({ error: roleError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "updateUser": {
        const { userId, email, userName } = params;

        // Prevent self editing
        if (userId === requestingUser.id) {
          return new Response(JSON.stringify({ error: "Você não pode editar sua própria conta por aqui" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update email in auth.users
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { 
            email,
            user_metadata: { user_name: userName }
          }
        );

        if (updateAuthError) {
          return new Response(JSON.stringify({ error: updateAuthError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({ 
            id: userId, 
            user_name: userName,
            email: email
          });

        if (profileError) {
          // Não retornar erro aqui pois o principal (auth) já foi atualizado
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list": {
        // Get all users from auth
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          return new Response(JSON.stringify({ error: listError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get all roles
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role");

        // Get all profiles
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, user_name, email");

        // Combine data
        const usersWithData = users.map((user) => ({
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          profile: profiles?.find((p) => p.id === user.id) || { user_name: user.user_metadata?.user_name },
          roles: roles?.filter((r) => r.user_id === user.id) || [],
        }));

        return new Response(JSON.stringify({ users: usersWithData }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação não reconhecida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
