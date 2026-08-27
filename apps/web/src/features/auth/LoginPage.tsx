import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export function LoginPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/entrar`,
        },
      });
    setPending(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (result.data.session) navigate(destination, { replace: true });
    else setMessage("Cadastro recebido. Confirme o e-mail para concluir o acesso.");
  }

  return <main className="auth-page">
    <section className="auth-brand-panel"><div className="brand"><span className="brand-mark">F</span><span>Flux<strong>RH</strong></span></div><div><span className="eyebrow">Operação inteligente</span><h1>Seu RH em um único fluxo.</h1><p>Pessoas, jornada, documentos e folha com segurança e rastreabilidade.</p></div></section>
    <section className="auth-form-panel"><form className="auth-card" onSubmit={submit}>
      <header><span className="eyebrow">Acesso seguro</span><h2>{mode === "login" ? "Entre no FluxRH" : "Crie seu acesso"}</h2><p>{mode === "login" ? "Use o e-mail cadastrado na sua organização." : "O primeiro acesso poderá criar a organização administradora."}</p></header>
      {!isSupabaseConfigured && <div className="auth-message error">Integração Supabase ainda não configurada.</div>}
      {mode === "signup" && <label>Nome completo<input required value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" /></label>}
      <label>E-mail<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>Senha<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      {message && <div className={`auth-message ${message.includes("Confirme") ? "success" : "error"}`}>{message}</div>}
      <button className="primary-button auth-submit" disabled={pending || !isSupabaseConfigured}>{pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar acesso"}</button>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Primeiro acesso? Criar conta" : "Já possui acesso? Entrar"}</button>
    </form></section>
  </main>;
}
