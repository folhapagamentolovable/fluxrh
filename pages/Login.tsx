import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: signInData, error: signInError } = await signIn(formData.email, formData.password);
      
      if (signInError) {
        setError(signInError.message || 'Erro ao fazer login');
        setLoading(false);
        return;
      }

      // Verificar role do usuário para redirecionamento
      const userId = signInData?.user?.id;
      if (userId) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const userRoles = roles?.map(r => r.role) || [];
        
        // Redirecionar com base na role
        if (userRoles.includes('admin') || userRoles.includes('manager')) {
          navigate('/dashboard');
        } else if (userRoles.includes('client')) {
          navigate('/portal-cliente');
        } else {
          // user role → portal do funcionário
          navigate('/portal');
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/FluxPay_logo.svg" 
            alt="FluxPay - Sistema de Folha de Pagamento" 
            className="mx-auto h-40 w-auto mb-4"
          />
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="seu@email.com"
          />

          <div className="relative">
            <Input
              label="Senha"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/forgot-password')}
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Esqueceu sua senha?
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Não tem acesso?{' '}
            <span className="text-gray-700 font-semibold">
              Entre em contato com o administrador
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
