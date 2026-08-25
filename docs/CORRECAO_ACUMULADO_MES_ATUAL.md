# Correção: Acumulado Deve Incluir o Mês Atual

## Problema Identificado

O campo "Acumulado" estava calculando apenas os meses ANTERIORES ao mês filtrado, excluindo o mês atual. Isso estava incorreto, pois o acumulado deve representar a soma de TODAS as horas até o mês filtrado (inclusive).

**Exemplo do problema:**
- Filtro: Março/2026
- Acumulado ERRADO: Jan/2024 + Fev/2024 + ... + Fev/2026 (sem Março)
- Acumulado CORRETO: Jan/2024 + Fev/2024 + ... + Fev/2026 + **Mar/2026**

## Solução Aplicada

### 1. BancoHoras.tsx (Página Administrativa)

**Antes:**
```typescript
.or(`ano.lt.${ano},and(ano.eq.${ano},mes.lt.${mes})`)
```

**Depois:**
```typescript
.or(`ano.lt.${ano},and(ano.eq.${ano},mes.lte.${mes})`)
```

**Mudança:** `mes.lt` → `mes.lte` (less than or equal)

### 2. PortalBancoHoras.tsx (Portal do Funcionário)

**Antes:**
```typescript
// Calcular acumulado de todos os meses anteriores ao mês filtrado
const calcularAcumulado = (): number => {
  // ...
  const dataLimite = new Date(anoLimite, mesLimiteFinal - 1, 1);
  
  while (dataIteracao < dataLimite) {
    // ...
  }
}
```

**Depois:**
```typescript
// Calcular acumulado de todos os meses até o mês filtrado (INCLUSIVE)
const calcularAcumulado = (): number => {
  // ...
  const dataLimite = new Date(ano, mes - 1, 31); // Último dia do mês filtrado
  
  while (dataIteracao <= dataLimite) {
    // ...
  }
}
```

**Mudanças:**
- `dataLimite` agora aponta para o último dia do mês filtrado (não o mês anterior)
- Loop usa `<=` ao invés de `<` para incluir o mês limite

### 3. ClientPortalBancoHoras.tsx (Portal do Cliente)

**Antes:**
```typescript
// Calcular acumulado de todos os meses anteriores ao mês filtrado
const calcularAcumuladoFunc = (funcId: string): number => {
  // ...
  const mesLimite = mes - 1;
  const anoLimite = mesLimite < 1 ? ano - 1 : ano;
  const mesLimiteFinal = mesLimite < 1 ? 12 : mesLimite;
  
  const dataLimite = new Date(anoLimite, mesLimiteFinal - 1, 1);
  
  while (dataIteracao < dataLimite) {
    // ...
  }
}
```

**Depois:**
```typescript
// Calcular acumulado de todos os meses até o mês filtrado (INCLUSIVE)
const calcularAcumuladoFunc = (funcId: string): number => {
  // ...
  const dataLimite = new Date(ano, mes - 1, 31); // Último dia do mês filtrado
  
  while (dataIteracao <= dataLimite) {
    // ...
  }
}
```

**Mudanças:**
- Removida lógica complexa de cálculo do mês anterior
- `dataLimite` agora aponta diretamente para o último dia do mês filtrado
- Loop usa `<=` ao invés de `<` para incluir o mês limite

## Resultado

Agora, em todas as páginas (Admin, Portal do Funcionário e Portal do Cliente), o campo "Acumulado" exibe corretamente a soma de todas as horas desde 2 anos atrás até o mês filtrado, INCLUINDO o mês atual.

## Arquivos Modificados

1. `pages/FolhaAutomatica/BancoHoras.tsx` - Linha ~330
2. `pages/portal/PortalBancoHoras.tsx` - Linhas ~110-130
3. `pages/portal-cliente/ClientPortalBancoHoras.tsx` - Linhas ~170-190
4. `docs/RESUMO_BANCO_HORAS_COMPLETO.md` - Atualizada documentação

## Testes Recomendados

1. Filtrar por Março/2026
2. Verificar que "Acumulado" inclui as horas de Março
3. Comparar com "Banco Mensal" (deve ser diferente)
4. Filtrar por mês diferente e verificar que acumulado muda corretamente

## Observação Importante

⚠️ **As migrações SQL ainda não foram executadas no banco de dados!**

Mesmo com esta correção, os acumulados continuarão mostrando 00:00 até que as migrações sejam executadas:

1. `migrations/create_banco_horas_mensal.sql`
2. `migrations/function_calcular_banco_horas_mensal.sql`
3. Popular dados: `SELECT recalcular_banco_horas_ultimos_meses(6);`

