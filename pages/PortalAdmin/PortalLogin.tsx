import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// PortalLogin agora redireciona para o login unificado
const PortalLogin: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};

export default PortalLogin;
