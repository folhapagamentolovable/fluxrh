import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const isRequired = user?.user_metadata.must_change_password === true;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("As senhas informadas não coincidem.");
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { ...user?.user_metadata, must_change_password: false },
    });
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    navigate("/", { replace: true });
  }

  return <main className="onboarding-page"><form className="auth-card" onSubmit={submit}>
    <header>
      <span className="eyebrow">Segurança da conta</span>
      <h2>{isRequired ? "Defina sua nova senha" : "Alterar senha"}</h2>
      <p>{isRequired ? "A senha atual é provisória. Crie uma nova senha antes de acessar o FluxRH." : "Use pelo menos 8 caracteres para proteger sua conta."}</p>
    </header>
    <label>Nova senha<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
    <label>Confirmar nova senha<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
    {message && <div className="auth-message error" role="alert">{message}</div>}
    <button className="primary-button auth-submit" disabled={pending}>{pending ? "Alterando…" : "Salvar nova senha"}</button>
  </form></main>;
}
