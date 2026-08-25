# Instruções para Remover a Role MANAGER

## ✅ CONCLUÍDO - Mudanças Aplicadas

### 1. Scripts SQL Criados
- ✅ `remove_manager_role_simple.sql` - Script recomendado (desabilita manager sem quebrar dependências)
- ✅ `remove_manager_role_safe.sql` - Script alternativo com transação
- ✅ `remove_manager_role.sql` - Script original (pode falhar por dependências)

### 2. Código TypeScript Atualizado
- ✅ `src/integrations/supabase/types.ts` - Removido 'manager' do enum app_role e função is_manager
- ✅ `contexts/AuthContext.tsx` - Removido isManager e referências
- ✅ `pages/UserManagement.tsx` - Removido opções de manager nos selects
- ✅ `App.tsx` - Removido ManagerDashboard, rota dashboard-gerencial e alterado todas as rotas para requireAdmin
- ✅ `components/ProtectedRoute.tsx` - Removido requireAdminOrManager e isManager
- ✅ `pages/ManagerDashboard.tsx` - Arquivo deletado
- ✅ `pages/lista_arquivos.txt` - Atualizado

### 3. Conflito de Merge Resolvido
- ✅ Removidos marcadores de conflito `<<<<<<< Updated upstream` e `>>>>>>> Stashed changes`
- ✅ Todas as rotas agora usam `requireAdmin={true}` em vez de `requireAdminOrManager={true}`

## 📋 PRÓXIMOS PASSOS

### Execute o SQL no Supabase
1. Acesse o painel do Supabase
2. Vá para SQL Editor  
3. Execute o conteúdo do arquivo `remove_manager_role_simple.sql`

### O que o Script SQL Faz
- Remove todas as policies que usam `is_manager()`
- Converte todos os usuários 'manager' para 'user'
- Modifica `is_admin_or_manager()` para só verificar admin
- Cria `is_manager()` que sempre retorna false
- Mantém o enum intacto (evita problemas de dependência)

### Resultado Final
- ✅ Role 'manager' existe no enum mas está completamente desabilitada
- ✅ Nenhum usuário tem role 'manager' (todos convertidos para 'user')
- ✅ Nenhuma policy usa role 'manager'
- ✅ Interface simplificada com apenas 2 roles: admin e user
- ✅ Apenas admins têm acesso CRUD às funcionalidades

## 🔄 Rollback (se necessário)
Se precisar reverter:
1. Restaurar o código TypeScript dos commits anteriores
2. Recriar as policies para managers no banco
3. Alterar usuários de volta para 'manager' se necessário

### 3. Atualizar Tipos TypeScript (Já Feito)
Os seguintes arquivos já foram atualizados:
- ✅ `src/integrations/supabase/types.ts` - Removido 'manager' do enum app_role
- ✅ `contexts/AuthContext.tsx` - Removido isManager e referências
- ✅ `pages/UserManagement.tsx` - Removido opções de manager
- ✅ `App.tsx` - Removido ManagerDashboard e rota dashboard-gerencial
- ✅ `pages/ManagerDashboard.tsx` - Arquivo deletado

### 4. O que foi Removido

#### Policies Removidas:
- "Managers têm acesso CRUD a escala_mensal"
- "Managers têm acesso CRUD a ferias" 
- "Managers têm acesso CRUD a folha_calculada"
- "Managers têm acesso CRUD a sugestoes_reclamacoes"
- "Managers têm acesso CRUD a portal_visibility_config"

#### Funções Removidas:
- `public.is_manager(uuid)`
- `public.is_admin_or_manager(uuid)` - Recriada apenas verificando admin

#### Interface Removida:
- Dashboard Gerencial (rota /dashboard-gerencial)
- Opções de role "manager" nos selects de usuário
- Componente ManagerDashboard.tsx

### 5. Impacto
- Usuários que eram 'manager' agora são 'user' (somente leitura)
- Apenas admins têm acesso CRUD às tabelas
- Interface simplificada com apenas 2 roles: admin e user

### 6. Rollback (se necessário)
Se precisar reverter, você pode:
1. Recriar o enum com 'manager'
2. Recriar as funções is_manager e is_admin_or_manager
3. Recriar as policies para managers
4. Restaurar o código TypeScript dos commits anteriores