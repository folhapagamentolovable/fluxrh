-- ============================================
-- CRIAR ADMIN PARA USUÁRIO NEO
-- ============================================
-- UUID: 50c50185-6b5a-4032-bf09-328c6f257cc4
-- Username: neo
-- ============================================

-- Criar role de admin para o usuário neo
INSERT INTO user_roles (user_id, role)
VALUES ('50c50185-6b5a-4032-bf09-328c6f257cc4', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se foi criado com sucesso
SELECT 
    ur.user_id, 
    ur.role, 
    au.email,
    p.user_name
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.user_id = '50c50185-6b5a-4032-bf09-328c6f257cc4';

-- Listar todos os admins do sistema
SELECT 
    ur.user_id, 
    ur.role, 
    au.email,
    p.user_name,
    au.created_at
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY au.created_at;
