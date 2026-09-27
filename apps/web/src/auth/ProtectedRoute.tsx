import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <div className="auth-loading">Abrindo seu ambiente FluxRH…</div>;
  if (!user) return <Navigate to="/entrar" state={{ from: location }} replace />;
  if (user.user_metadata.must_change_password === true && location.pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" replace />;
  }
  return <Outlet />;
}
