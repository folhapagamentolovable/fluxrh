# 🚀 Guia Rápido - Criar Admin e Ativar RLS

## ⚡ Método Rápido (Recomendado)

### 1️⃣ Criar Admin por Email

Abra o arquivo `create_admin_by_email.sql` e:

1. Substitua `'seu-email@exemplo.com'` pelo email do usuário
2. Execute o script completo no Supabase SQL Editor

```sql
-- Exemplo:
v_email text := 'admin@fluxpay.com'; -- Seu email aqui
```

### 2️⃣ Ativar RLS

Execute o arquivo `enable_rls_policies.sql` no Supabase SQL Editor.

### 3️⃣ Pronto! ✅

Faça login com o usuário admin e teste o Dashboard.

---

## 🔧 Método Manual (Alternativo)

Se preferir fazer manualmente:

### Passo 1: Descobrir o UUID do usuário

```sql
SELECT id, email FROM auth.users;
```

Copie o UUID (algo como: `12345678-1234-1234-1234-123456789abc`)

### Passo 2: Criar o admin

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('cole-o-uuid-aqui', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Passo 3: Verificar

```sql
SELECT ur.role, au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin';
```

### Passo 4: Ativar RLS

Execute o arquivo `enable_rls_policies.sql`

---

## ❌ Erro Comum

**Erro**: `invalid input syntax for type uuid: "SEU-USER-UUID-AQUI"`

**Causa**: Você executou o script sem substituir o placeholder.

**Solução**: Use o método por email (`create_admin_by_email.sql`) ou substitua o UUID corretamente.

---

## 📋 Checklist

- [ ] Criar pelo menos um admin
- [ ] Verificar que o admin foi criado
- [ ] Executar script de RLS
- [ ] Testar login como admin
- [ ] Testar acesso ao Dashboard
- [ ] Criar usuário comum para testar permissões

---

## 🆘 Precisa de Ajuda?

1. Liste todos os usuários: `SELECT id, email FROM auth.users;`
2. Liste todos os admins: `SELECT * FROM user_roles WHERE role = 'admin';`
3. Verifique RLS: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
