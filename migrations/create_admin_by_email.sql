-- ============================================
-- CRIAR ADMIN POR EMAIL (MAIS FÁCIL)
-- ============================================
-- Este script cria um admin usando o email
-- ao invés do UUID, tornando mais fácil de usar
-- ============================================

-- PASSO 1: Substitua 'seu-email@exemplo.com' pelo email do usuário
-- PASSO 2: Execute o script completo

DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'seu-email@exemplo.com'; -- ⚠️ SUBSTITUA ESTE EMAIL
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
SELECT ur.user_id, ur.role, au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin';
