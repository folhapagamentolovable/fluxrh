# 🔐 Implementação de Segurança RLS - FluxPay

## ✅ O que foi implementado

### 1. Restrição do Dashboard para Admins
- ✅ Dashboard agora verifica se o usuário é admin
- ✅ Usuários comuns veem mensagem de "Acesso Negado"
- ✅ Redirecionamento automático para página inicial

### 2. Políticas RLS no Banco de Dados
- ✅ Script SQL completo em `migrations/enable_rls_policies.sql`
- ✅ RLS ativado para todas as 12 tabelas do sistema
- ✅ Admins: acesso total (CRUD)
- ✅ Users: apenas leitura (SELECT)

## 📋 Passo a Passo para Implementar

### Passo 1: Criar o Primeiro Admin (OBRIGATÓRIO)

**Antes de ativar RLS**, você precisa ter pelo menos um usuário admin:

1. Acesse o Supabase Dashboard → SQL Editor
2. Execute o script `migrations/create_first_admin.sql`
3. Siga as instruções no script para identificar seu usuário
4. Substitua o UUID e execute o INSERT

```sql
-- Exemplo:
INSERT INTO user_roles (user_id, role)
VALUES ('seu-uuid-aqui', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Passo 2: Ativar RLS e Políticas

1. Acesse o Supabase Dashboard → SQL Editor
2. Abra o arquivo `migrations/enable_rls_policies.sql`
3. Copie todo o conteúdo
4. Cole no SQL Editor
5. Execute (Run ou Ctrl+Enter)

### Passo 3: Verificar Implementação

Execute no SQL Editor:

```sql
-- Verificar RLS ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar políticas criadas
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar admins
SELECT ur.role, au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin';
```

### Passo 4: Testar no Frontend

1. **Como Admin:**
   - Faça login com usuário admin
   - Acesse o Dashboard → deve funcionar normalmente
   - Teste criar/editar/excluir registros → deve funcionar

2. **Como User:**
   - Faça login com usuário comum
   - Acesse o Dashboard → deve ver "Acesso Negado"
   - Tente criar/editar registros → deve falhar (apenas leitura)

## 🎯 Estrutura de Permissões

### Tabelas Protegidas

| Tabela | Admin | User |
|--------|-------|------|
| profiles | CRUD + Ver todos | Ver/Editar apenas próprio |
| user_roles | CRUD | Ver apenas próprias |
| empresas | CRUD | SELECT |
| cargos | CRUD | SELECT |
| postos_trabalho | CRUD | SELECT |
| funcionarios | CRUD | SELECT |
| feriados | CRUD | SELECT |
| regras_escalas | CRUD | SELECT |
| escala_mensal | CRUD | SELECT |
| folhas_ponto | CRUD | SELECT |
| folha_calculada | CRUD | SELECT |
| parametros_calculo | CRUD | SELECT |

## 🔧 Gerenciamento de Usuários

### Criar novo Admin
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'admin');
```

### Criar novo User (padrão)
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'user');
```

### Promover User para Admin
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Rebaixar Admin para User
```sql
DELETE FROM user_roles 
WHERE user_id = 'uuid-do-usuario' 
AND role = 'admin';
```

## ⚠️ Avisos Importantes

1. **Backup**: Sempre faça backup antes de ativar RLS
2. **Admin Obrigatório**: Crie pelo menos um admin ANTES de ativar RLS
3. **Teste**: Teste em desenvolvimento antes de aplicar em produção
4. **Service Role**: A Service Role Key bypassa RLS - guarde com segurança

## 🐛 Troubleshooting

### Problema: "Não consigo acessar nada após ativar RLS"
**Solução**: Você provavelmente não criou um admin. Execute:
```sql
-- Desativar RLS temporariamente
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Criar admin
INSERT INTO user_roles (user_id, role)
VALUES ('seu-uuid', 'admin');

-- Reativar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### Problema: "Erro ao inserir dados mesmo sendo admin"
**Solução**: Verifique se a política WITH CHECK está correta:
```sql
-- Ver políticas da tabela
SELECT * FROM pg_policies WHERE tablename = 'nome_da_tabela';
```

### Problema: "Dashboard não reconhece que sou admin"
**Solução**: Verifique se o role está correto:
```sql
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

## 📚 Arquivos Criados

```
migrations/
├── enable_rls_policies.sql      # Script principal com todas as políticas
├── create_first_admin.sql       # Helper para criar primeiro admin
└── README_RLS.md               # Documentação detalhada

docs/
└── IMPLEMENTACAO_RLS.md        # Este arquivo (guia de implementação)
```

## 🎉 Próximos Passos

Após implementar RLS:

1. ✅ Testar todas as funcionalidades como admin
2. ✅ Testar todas as funcionalidades como user
3. ✅ Criar usuários de teste para cada role
4. ✅ Documentar usuários admin do sistema
5. ✅ Configurar backup automático do banco
6. ✅ Monitorar logs de acesso

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase Dashboard
2. Execute as queries de verificação acima
3. Consulte a documentação oficial do Supabase RLS
