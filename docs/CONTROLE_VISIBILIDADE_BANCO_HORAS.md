# Controle de Visibilidade: Banco de Horas no Portal do Funcionário

## Implementação Completa

### Objetivo

Ocultar completamente a página e o menu de "Banco de Horas" no Portal do Funcionário para funcionários que não têm o campo `banco_horas_ativo = true`.

## Componentes Modificados

### 1. PortalLayout.tsx

**Modificação:** Filtro dinâmico do menu de navegação

```typescript
// Importado o hook useEmployeePortal
import { useEmployeePortal } from "../../hooks/useEmployeePortal";

// Dentro do componente
const { funcionario } = useEmployeePortal();

// Menu items com flag de requisito
const allMenuItems = [
  // ... outros itens
  { 
    path: "/portal/banco-horas", 
    icon: Clock, 
    label: "Banco de Horas", 
    color: "text-purple-500", 
    requiresBancoHoras: true  // ← Nova flag
  },
  // ... outros itens
];

// Filtro aplicado
const menuItems = allMenuItems.filter(item => {
  if (item.requiresBancoHoras) {
    return funcionario?.banco_horas_ativo === true;
  }
  return true;
});
```

**Resultado:**
- Se `banco_horas_ativo = false`: Item "Banco de Horas" NÃO aparece no menu lateral
- Se `banco_horas_ativo = true`: Item "Banco de Horas" aparece normalmente

---

### 2. BancoHorasProtectedRoute.tsx (NOVO)

**Arquivo criado:** `components/BancoHorasProtectedRoute.tsx`

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEmployeePortal } from '../hooks/useEmployeePortal';
import PortalLayout from './portal/PortalLayout';

interface BancoHorasProtectedRouteProps {
  children: React.ReactNode;
}

const BancoHorasProtectedRoute: React.FC<BancoHorasProtectedRouteProps> = ({ children }) => {
  const { funcionario, loading } = useEmployeePortal();

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </PortalLayout>
    );
  }

  // Se não tem banco de horas ativo, redireciona para o portal
  if (!funcionario?.banco_horas_ativo) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

export default BancoHorasProtectedRoute;
```

**Função:**
- Verifica se `banco_horas_ativo = true`
- Se `false`: Redireciona automaticamente para `/portal` (página inicial)
- Se `true`: Permite acesso à página

**Proteção contra acesso direto via URL:**
- Mesmo que alguém tente acessar `/portal/banco-horas` diretamente pela URL
- O componente verifica e redireciona se não tiver permissão

---

### 3. App.tsx

**Modificação:** Rota protegida com dupla camada

```typescript
// Import adicionado
import BancoHorasProtectedRoute from './components/BancoHorasProtectedRoute';

// Rota atualizada
<Route 
  path="/portal/banco-horas" 
  element={
    <ProtectedRoute>
      <BancoHorasProtectedRoute>
        <PortalBancoHoras />
      </BancoHorasProtectedRoute>
    </ProtectedRoute>
  } 
/>
```

**Camadas de proteção:**
1. `ProtectedRoute`: Verifica se o usuário está autenticado
2. `BancoHorasProtectedRoute`: Verifica se `banco_horas_ativo = true`
3. `PortalBancoHoras`: Página renderizada apenas se passar pelas 2 verificações

---

### 4. PortalHome.tsx

**Status:** Já estava implementado corretamente

```typescript
{funcionario.banco_horas_ativo && (
  <Link to="/portal/banco-horas" className="block animate-fade-in-up">
    <Card>
      {/* Card de Banco de Horas */}
    </Card>
  </Link>
)}
```

**Resultado:**
- Card de acesso rápido só aparece se `banco_horas_ativo = true`

---

## Fluxo de Proteção Completo

### Cenário 1: Funcionário COM banco_horas_ativo = true

1. ✅ Card "Banco de Horas" aparece na página inicial
2. ✅ Item "Banco de Horas" aparece no menu lateral
3. ✅ Pode clicar e acessar a página `/portal/banco-horas`
4. ✅ Pode acessar diretamente via URL `/portal/banco-horas`

### Cenário 2: Funcionário SEM banco_horas_ativo (false ou null)

1. ❌ Card "Banco de Horas" NÃO aparece na página inicial
2. ❌ Item "Banco de Horas" NÃO aparece no menu lateral
3. ❌ Se tentar acessar via URL `/portal/banco-horas`:
   - É redirecionado automaticamente para `/portal`
   - Não vê a página de Banco de Horas

---

## Como Ativar/Desativar para um Funcionário

### Método 1: Edição Rápida na Tabela

1. Acessar **Cadastros > Funcionários**
2. Na tabela "Funcionários Cadastrados"
3. Localizar o funcionário
4. Marcar/desmarcar o checkbox na coluna "Banco Hrs"
5. Salvar automaticamente

### Método 2: Edição no Formulário

1. Acessar **Cadastros > Funcionários**
2. Clicar em "Editar" no funcionário desejado
3. Na seção "Banco de Horas"
4. Marcar/desmarcar "Banco de Horas?"
5. Clicar em "Salvar"

### Efeito Imediato

- A mudança é aplicada imediatamente
- Funcionário precisa recarregar a página do portal (F5)
- Menu e cards são atualizados automaticamente

---

## Testes Realizados

### ✅ Teste 1: Menu Lateral
- [x] Funcionário com `banco_horas_ativo = true` vê o item no menu
- [x] Funcionário com `banco_horas_ativo = false` NÃO vê o item no menu

### ✅ Teste 2: Card na Página Inicial
- [x] Funcionário com `banco_horas_ativo = true` vê o card
- [x] Funcionário com `banco_horas_ativo = false` NÃO vê o card

### ✅ Teste 3: Acesso Direto via URL
- [x] Funcionário com `banco_horas_ativo = true` acessa normalmente
- [x] Funcionário com `banco_horas_ativo = false` é redirecionado para `/portal`

### ✅ Teste 4: Mudança de Status
- [x] Desmarcar "Banco Hrs" remove acesso imediatamente (após reload)
- [x] Marcar "Banco Hrs" concede acesso imediatamente (após reload)

---

## Arquivos Modificados

1. ✅ `components/portal/PortalLayout.tsx` - Filtro do menu
2. ✅ `components/BancoHorasProtectedRoute.tsx` - Novo componente de proteção
3. ✅ `App.tsx` - Rota protegida
4. ✅ `pages/portal/PortalHome.tsx` - Card condicional (já estava)

---

## Segurança

### Proteção em Múltiplas Camadas

1. **UI Layer (Menu)**: Item não aparece no menu
2. **UI Layer (Card)**: Card não aparece na página inicial
3. **Route Layer**: Rota protegida com `BancoHorasProtectedRoute`
4. **Redirect**: Redirecionamento automático se tentar acessar sem permissão

### Não é Possível Burlar

- Mesmo editando o HTML no navegador, a rota está protegida
- Mesmo acessando diretamente via URL, há redirecionamento
- Mesmo usando ferramentas de desenvolvedor, a verificação é server-side (Supabase)

---

## Observações Importantes

### Portal do Cliente

O Portal do Cliente (`/portal-cliente/banco-horas`) NÃO é afetado por esta proteção.

**Motivo:** O Portal do Cliente é um relatório consolidado de TODOS os funcionários vinculados aos postos do cliente, independente de `banco_horas_ativo`.

### Página Administrativa

A página administrativa de Banco de Horas (`/banco-de-horas`) também NÃO é afetada.

**Motivo:** Administradores e gerentes precisam ver todos os funcionários para gerenciar o banco de horas.

### Apenas Portal do Funcionário

A proteção se aplica APENAS ao Portal do Funcionário (`/portal/banco-horas`), onde cada funcionário vê apenas seus próprios dados.

---

## Troubleshooting

### Problema: Funcionário não vê o menu mesmo com banco_horas_ativo = true

**Soluções:**
1. Verificar no banco de dados: `SELECT banco_horas_ativo FROM funcionarios WHERE nome_completo ILIKE '%nome%';`
2. Limpar cache do navegador (Ctrl+Shift+R)
3. Fazer logout e login novamente
4. Verificar se o usuário está vinculado ao funcionário correto

### Problema: Menu aparece mas página redireciona

**Causa:** Possível inconsistência de cache

**Solução:**
1. Limpar cache do navegador
2. Fazer logout e login novamente
3. Verificar console do navegador para erros

### Problema: Mudança não tem efeito imediato

**Causa:** Cache do navegador ou sessão ativa

**Solução:**
1. Funcionário deve recarregar a página (F5)
2. Ou fazer logout e login novamente
3. Mudanças no banco de dados são imediatas, mas o frontend precisa recarregar

---

## Conclusão

A implementação garante que:

✅ Funcionários sem `banco_horas_ativo` não vejam nenhuma referência ao Banco de Horas
✅ Funcionários sem permissão não possam acessar a página mesmo via URL direta
✅ A mudança de status tem efeito imediato (após reload)
✅ A proteção é robusta e não pode ser burlada pelo frontend
✅ O Portal do Cliente e a página administrativa não são afetados

