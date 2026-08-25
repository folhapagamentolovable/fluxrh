-- ============================================
-- CRIAR ADMIN PARA blogdoneozinho@gmail.com
-- ============================================

DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'blogdoneozinho@gmail.com';
BEGIN
    -- Buscar o UUID do usuário pelo email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email;
    
    -- Verificar se encontrou o usuário
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário com email % não encontrado', v_email;
    END IF;
    
    -- Inserir role de admin
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Confirmar sucesso
    RAISE NOTICE 'Admin criado com sucesso para: % (UUID: %)', v_email, v_user_id;
END $$;

-- Verificar se foi criado:
SELECT 
    ur.user_id, 
    ur.role, 
    au.email,
    p.user_name
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE au.email = 'blogdoneozinho@gmail.com';

-- Listar todos os admins:
SELECT 
    ur.role, 
    au.email,
    p.user_name,
    au.created_at
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY au.created_at;
