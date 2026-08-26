import { useEffect, useState, type FormEvent } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

export function OrganizationGate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function loadMembership() {
    if (!user) return;
    const { data, error: queryError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);
    setHasOrganization(Boolean(data?.length));
    setError(queryError?.message ?? "");
    setLoading(false);
  }

  useEffect(() => { void loadMembership(); }, [user?.id]);

  async function createOrganization(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("create_organization", {
      organization_name: name.trim(),
      organization_document: document.replace(/\D/g, ""),
    });
    setPending(false);
    if (rpcError) setError(rpcError.message);
    else await loadMembership();
  }

  if (loading) return <div className="auth-loading">Preparando sua organização…</div>;
  if (hasOrganization) return <Outlet />;
  return <main className="onboarding-page"><form className="auth-card" onSubmit={createOrganization}>
    <header><span className="eyebrow">Configuração inicial</span><h2>Crie sua organização</h2><p>Seu acesso será definido como proprietário. Os dados desta organização ficarão isolados das demais.</p></header>
    <label>Nome da organização<input required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Grupo Flux" /></label>
    <label>CNPJ<input required minLength={14} value={document} onChange={event => setDocument(event.target.value)} placeholder="00.000.000/0001-00" /></label>
    {error && <div className="auth-message error">{error}</div>}
    <button className="primary-button auth-submit" disabled={pending}>{pending ? "Criando…" : "Criar organização"}</button>
  </form></main>;
}
