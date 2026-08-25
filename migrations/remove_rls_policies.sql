-- ============================================
-- REMOVER POLÍTICAS RLS EXISTENTES
-- ============================================
-- Execute este script se precisar recriar as políticas
-- ou se encontrar erro de "policy already exists"
-- ============================================

-- Remover políticas da tabela profiles
DROP POLICY IF EXISTS "Admins têm acesso total a profiles" ON profiles;
DROP POLICY IF EXISTS "Users podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users podem atualizar seu próprio perfil" ON profiles;

-- Remover políticas da tabela user_roles
DROP POLICY IF EXISTS "Admins têm acesso total a user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users podem ver suas próprias roles" ON user_roles;

-- Remover políticas da tabela empresas
DROP POLICY IF EXISTS "Admins têm acesso total a empresas" ON empresas;
DROP POLICY IF EXISTS "Users podem ler empresas" ON empresas;

-- Remover políticas da tabela cargos
DROP POLICY IF EXISTS "Admins têm acesso total a cargos" ON cargos;
DROP POLICY IF EXISTS "Users podem ler cargos" ON cargos;

-- Remover políticas da tabela postos_trabalho
DROP POLICY IF EXISTS "Admins têm acesso total a postos_trabalho" ON postos_trabalho;
DROP POLICY IF EXISTS "Users podem ler postos_trabalho" ON postos_trabalho;

-- Remover políticas da tabela funcionarios
DROP POLICY IF EXISTS "Admins têm acesso total a funcionarios" ON funcionarios;
DROP POLICY IF EXISTS "Users podem ler funcionarios" ON funcionarios;

-- Remover políticas da tabela feriados
DROP POLICY IF EXISTS "Admins têm acesso total a feriados" ON feriados;
DROP POLICY IF EXISTS "Users podem ler feriados" ON feriados;

-- Remover políticas da tabela regras_escalas
DROP POLICY IF EXISTS "Admins têm acesso total a regras_escalas" ON regras_escalas;
DROP POLICY IF EXISTS "Users podem ler regras_escalas" ON regras_escalas;

-- Remover políticas da tabela escala_mensal
DROP POLICY IF EXISTS "Admins têm acesso total a escala_mensal" ON escala_mensal;
DROP POLICY IF EXISTS "Users podem ler escala_mensal" ON escala_mensal;

-- Remover políticas da tabela folhas_ponto
DROP POLICY IF EXISTS "Admins têm acesso total a folhas_ponto" ON folhas_ponto;
DROP POLICY IF EXISTS "Users podem ler folhas_ponto" ON folhas_ponto;

-- Remover políticas da tabela folha_calculada
DROP POLICY IF EXISTS "Admins têm acesso total a folha_calculada" ON folha_calculada;
DROP POLICY IF EXISTS "Users podem ler folha_calculada" ON folha_calculada;

-- Remover políticas da tabela parametros_calculo
DROP POLICY IF EXISTS "Admins têm acesso total a parametros_calculo" ON parametros_calculo;
DROP POLICY IF EXISTS "Users podem ler parametros_calculo" ON parametros_calculo;

-- Remover função auxiliar
DROP FUNCTION IF EXISTS is_admin();

-- Desativar RLS (opcional - comente se quiser manter RLS ativo)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cargos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE postos_trabalho DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE funcionarios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE feriados DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE regras_escalas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE escala_mensal DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE folhas_ponto DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE folha_calculada DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE parametros_calculo DISABLE ROW LEVEL SECURITY;

SELECT 'Políticas removidas com sucesso!' as status;
