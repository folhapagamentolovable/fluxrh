-- ============================================
-- CRIAR PRIMEIRO ADMINISTRADOR
-- ============================================
-- Execute este script ANTES de ativar RLS
-- para garantir que você terá acesso ao sistema
-- ============================================

-- PASSO 1: Veja todos os usuários cadastrados
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at;

-- PASSO 2: Copie o UUID do usuário acima e cole no comando abaixo
-- IMPORTANTE: Remova os comentários (--) da linha do INSERT e substitua o UUID

-- Exemplo de como deve ficar (remova o -- do início):
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('12345678-1234-1234-1234-123456789abc', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar se foi criado:
SELECT ur.user_id, ur.role, au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin';

-- ============================================
-- EXEMPLO PRÁTICO
-- ============================================
-- Se o resultado do SELECT acima mostrou:
-- id: 12345678-1234-1234-1234-123456789abc
-- email: admin@fluxpay.com
--
-- Então execute:
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('12345678-1234-1234-1234-123456789abc', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- CRIAR MÚLTIPLOS ADMINS
-- ============================================
-- Se precisar criar vários admins de uma vez:
/*
INSERT INTO user_roles (user_id, role)
VALUES 
  ('uuid-admin-1', 'admin'),
  ('uuid-admin-2', 'admin'),
  ('uuid-admin-3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- ============================================
-- REMOVER ADMIN (se necessário)
-- ============================================
-- DELETE FROM user_roles 
-- WHERE user_id = 'uuid-do-usuario' 
-- AND role = 'admin';
