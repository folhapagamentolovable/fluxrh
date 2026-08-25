import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';

const ForceLogout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const forceLogout = async () => {
      
      // Fazer logout no Supabase
      await supabase.auth.signOut();
      
      // Limpar localStorage
      localStorage.clear();
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      
      // Aguardar 1 segundo e redirecionar
      setTimeout(() => {
        navigate('/login');
        window.location.reload();
      }, 1000);
    };

    forceLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <div className="text-6xl mb-4">🚪</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Saindo...</h2>
          <p className="text-gray-600">
            Limpando sessão e redirecionando para login...
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ForceLogout;
