import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Lock, CheckCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      
      // Extrair parâmetros da URL
      // Formato: #/reset-password#access_token=xxx&type=recovery
      const fullHash = window.location.hash;
      let params = new URLSearchParams();
      
      // Procurar pelo segundo # que contém os parâmetros
      const hashParts = fullHash.split('#');
      
      if (hashParts.length > 2) {
        // Tem dois #, os parâmetros estão no terceiro elemento
        params = new URLSearchParams(hashParts[2]);
      } else if (hashParts.length === 2 && hashParts[1].includes('access_token')) {
        // Só tem um #, os parâmetros estão no segundo elemento
        params = new URLSearchParams(hashParts[1]);
      } else if (fullHash.includes('?')) {
        // Formato com ?
        const queryString = fullHash.split('?')[1];
        params = new URLSearchParams(queryString);
      }
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        
        // Estabelecer sessão com os tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError('Erro ao processar link de recuperação');
        } else {
          setValidToken(true);
        }
        return;
      }

      // Verificar sessão existente
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setValidToken(true);
      } else {
        setError('Link de recuperação inválido ou expirado');
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    // Timeout de segurança
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Tempo esgotado. Tente novamente.');
    }, 10000); // 10 segundos

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      clearTimeout(timeoutId);

      if (updateError) {
        setError(updateError.message || 'Erro ao redefinir senha');
        setLoading(false);
      } else {
        
        // Fazer logout IMEDIATAMENTE para limpar a sessão de recuperação
        await supabase.auth.signOut();
        
        setSuccess(true);
        setLoading(false);
        
        // Redirecionar após 1.5 segundos
        setTimeout(() => {
          // Forçar navegação para login
          window.location.hash = '#/login';
        }, 1500);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  if (!validToken && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <p className="text-gray-600">Verificando link de recuperação...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Senha Redefinida!</h2>
            <p className="text-gray-600 mb-4">
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Nova Senha</h1>
          <p className="text-gray-600">Digite sua nova senha</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {validToken && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nova Senha"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
            />

            <Input
              label="Confirmar Senha"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
