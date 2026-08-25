# Políticas RLS (Row Level Security) - FluxPay

## 📋 Visão Geral

Este arquivo contém as políticas de segurança em nível de linha (RLS) para o sistema FluxPay.

### Regras de Acesso:
- **Admins**: Acesso total (SELECT, INSERT, UPDATE, DELETE) em todas as tabelas
- **Users**: Apenas leitura (SELECT) em todas as tabelas

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `enable_rls_policies.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter`

### Opção 2: Via CLI do Supabase

```bash
# Se você tem o Supabase CLI instalado
supabase db push migrations/enable_rls_policies.sql
```

### Opção 3: Via psql (PostgreSQL CLI)

```bash
psql -h <seu-host>.supabase.co -U postgres -d postgres -f migrations/enable_rls_policies.sql
```

## 🔍 Verificação

Após aplicar as políticas, você pode verificar se foram criadas corretamente:

### Verificar se RLS está ativo:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Listar todas as políticas:
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Testar como usuário comum:
```sql
-- Simular um usuário comum (não admin)
SET ROLE authenticated;
SELECT * FROM empresas; -- Deve funcionar (leitura)
INSERT INTO empresas (nome_empresa, cnpj) VALUES ('Teste', '12345678000190'); -- Deve falhar
```

### Testar como admin:
```sql
-- Simular um admin
SET ROLE authenticated;
-- Certifique-se de que o usuário tem role 'admin' na tabela user_roles
SELECT * FROM empresas; -- Deve funcionar
INSERT INTO empresas (nome_empresa, cnpj) VALUES ('Teste', '12345678000190'); -- Deve funcionar
```

## 📊 Tabelas Protegidas

As seguintes tabelas têm RLS ativado:

1. ✅ `profiles` - Perfis de usuários
2. ✅ `user_roles` - Roles dos usuários
3. ✅ `empresas` - Empresas cadastradas
4. ✅ `cargos` - Cargos/Posições
5. ✅ `postos_trabalho` - Postos de trabalho
6. ✅ `funcionarios` - Funcionários
7. ✅ `feriados` - Feriados
8. ✅ `regras_escalas` - Regras de escala
9. ✅ `escala_mensal` - Escalas mensais
10. ✅ `folhas_ponto` - Folhas de ponto
11. ✅ `folha_calculada` - Folhas calculadas
12. ✅ `parametros_calculo` - Parâmetros de cálculo

## 🔐 Função Auxiliar

O script cria uma função `is_admin()` que verifica se o usuário atual tem role de admin:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## ⚠️ Importante

1. **Backup**: Sempre faça backup do banco antes de aplicar políticas RLS
2. **Teste**: Teste as políticas em ambiente de desenvolvimento primeiro
3. **Admin**: Certifique-se de ter pelo menos um usuário com role 'admin' antes de ativar RLS
4. **Service Role**: O Supabase Service Role Key bypassa RLS - use com cuidado

## 🛠️ Criar Primeiro Admin

Se você ainda não tem um admin, execute antes de ativar RLS:

```sql
-- Substitua 'user-uuid-aqui' pelo ID do usuário que será admin
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-aqui', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Para descobrir o UUID do usuário:
```sql
SELECT id, email FROM auth.users;
```

## 🔄 Remover Políticas (Rollback)

Se precisar remover as políticas:

```sql
-- Desativar RLS em todas as tabelas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE cargos DISABLE ROW LEVEL SECURITY;
ALTER TABLE postos_trabalho DISABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE feriados DISABLE ROW LEVEL SECURITY;
ALTER TABLE regras_escalas DISABLE ROW LEVEL SECURITY;
ALTER TABLE escala_mensal DISABLE ROW LEVEL SECURITY;
ALTER TABLE folhas_ponto DISABLE ROW LEVEL SECURITY;
ALTER TABLE folha_calculada DISABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_calculo DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DROP POLICY IF EXISTS "Admins têm acesso total a profiles" ON profiles;
DROP POLICY IF EXISTS "Users podem ver seu próprio perfil" ON profiles;
-- ... (continue para todas as políticas)
```

## 📚 Referências

- [Documentação RLS do Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
