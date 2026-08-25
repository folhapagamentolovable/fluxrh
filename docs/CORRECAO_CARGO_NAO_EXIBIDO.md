# Correção: Cargo Não Exibido para Gerentes

## Problema Identificado

O campo CARGO não estava sendo exibido para usuários com status de "Gerente" na página de Folhas Calculadas, aparecendo como "N/A" ou "Sem cargo".

## Causa Raiz

O problema estava nos fallbacks de exibição do cargo. O código estava buscando apenas `folha.funcionario.cargo?.nome_cargo`, mas em alguns casos (especialmente para gerentes), o cargo pode estar armazenado diretamente em `folha.funcionario.nome_cargo` ou em `folha.dadosFolha.cargo.nome_cargo`.

## Correções Aplicadas

### 1. Lista de Funcionários (Aba Esquerda)

**Arquivo:** `pages/Operacional/CalculatedPayroll.tsx` - Linha ~6237

**Antes:**
```typescript
{folha.funcionario.cargo?.nome_cargo || 'Sem cargo'}
```

**Depois:**
```typescript
{folha.funcionario.cargo?.nome_cargo || folha.funcionario?.nome_cargo || folha.dadosFolha?.cargo?.nome_cargo || 'Sem cargo'}
```

**Resultado:** Agora tenta 3 locais diferentes antes de exibir "Sem cargo"

---

### 2. Detalhes do Funcionário (Card Principal)

**Arquivo:** `pages/Operacional/CalculatedPayroll.tsx` - Linha ~6271

**Antes:**
```typescript
<div><span className="font-semibold">Cargo:</span> {folhaAtiva.funcionario.cargo?.nome_cargo || 'N/A'}</div>
```

**Depois:**
```typescript
<div><span className="font-semibold">Cargo:</span> {folhaAtiva.funcionario.cargo?.nome_cargo || folhaAtiva.funcionario?.nome_cargo || folhaAtiva.dadosFolha?.cargo?.nome_cargo || 'N/A'}</div>
```

---

### 3. Impressão de Holerites (Múltiplas Ocorrências)

**Arquivo:** `pages/Operacional/CalculatedPayroll.tsx` - Linhas ~2902, ~3254, ~3771, ~4019, ~4347, ~5007, ~5591

**Antes:**
```typescript
${folha.funcionario?.cargo?.nome_cargo || 'N/A'}
// ou
${funcionario?.cargo?.nome_cargo || 'N/A'}
```

**Depois:**
```typescript
${folha.funcionario?.cargo?.nome_cargo || folha.funcionario?.nome_cargo || 'N/A'}
// ou
${funcionario?.cargo?.nome_cargo || funcionario?.nome_cargo || 'N/A'}
```

---

## Locais de Fallback

A correção adiciona os seguintes fallbacks em ordem de prioridade:

1. **`folha.funcionario.cargo?.nome_cargo`** - Cargo vindo do relacionamento com a tabela `cargos`
2. **`folha.funcionario?.nome_cargo`** - Cargo armazenado diretamente no funcionário (desnormalizado)
3. **`folha.dadosFolha?.cargo?.nome_cargo`** - Cargo vindo dos dados da folha de ponto
4. **`'N/A'` ou `'Sem cargo'`** - Fallback final quando nenhum cargo é encontrado

---

## Por Que Isso Afetava Gerentes?

Possíveis razões:

1. **Dados Desnormalizados:** Alguns funcionários (especialmente gerentes) podem ter o cargo armazenado diretamente no campo `nome_cargo` da tabela `funcionarios` ao invés de ter um relacionamento com a tabela `cargos`.

2. **Relacionamento Não Carregado:** A query pode não estar carregando o relacionamento `cargo` corretamente para alguns usuários.

3. **Permissões de Acesso:** Gerentes podem ter restrições de acesso que afetam o carregamento de relacionamentos.

---

## Verificação no Banco de Dados

Para verificar se o problema está no banco de dados, execute:

```sql
-- Verificar funcionários sem cargo no relacionamento
SELECT 
    f.id,
    f.nome_completo,
    f.cargo_id,
    f.nome_cargo as cargo_desnormalizado,
    c.nome_cargo as cargo_relacionamento
FROM funcionarios f
LEFT JOIN cargos c ON f.cargo_id = c.id
WHERE f.ativo = true
ORDER BY f.nome_completo;

-- Verificar especificamente funcionários com cargo_id NULL mas nome_cargo preenchido
SELECT 
    f.id,
    f.nome_completo,
    f.cargo_id,
    f.nome_cargo
FROM funcionarios f
WHERE f.ativo = true
  AND f.cargo_id IS NULL
  AND f.nome_cargo IS NOT NULL;
```

---

## Solução Permanente (Recomendada)

Para evitar esse problema no futuro, recomenda-se:

### 1. Normalizar os Dados

Execute este script para garantir que todos os funcionários tenham `cargo_id` preenchido:

```sql
-- Criar cargos faltantes baseados em nome_cargo
INSERT INTO cargos (nome_cargo, ativo)
SELECT DISTINCT f.nome_cargo, true
FROM funcionarios f
WHERE f.nome_cargo IS NOT NULL
  AND f.cargo_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM cargos c WHERE c.nome_cargo = f.nome_cargo
  );

-- Atualizar funcionários para usar cargo_id
UPDATE funcionarios f
SET cargo_id = c.id
FROM cargos c
WHERE f.nome_cargo = c.nome_cargo
  AND f.cargo_id IS NULL;
```

### 2. Garantir Relacionamento na Query

Verificar se a query em `carregarFolhasSalvas` está incluindo o cargo:

```typescript
.select(`
    ...,
    funcionario:funcionarios(*,cargo:cargos(*),empresa:empresas(*)),
    ...
`)
```

✅ **Já está correto** - A query já inclui o relacionamento `cargo:cargos(*)`

---

## Testes Recomendados

### Teste 1: Verificar Lista de Funcionários
1. Acessar **Operacional > Folhas Calculadas**
2. Selecionar um mês com folhas calculadas
3. Verificar a lista de funcionários na aba esquerda
4. ✅ Todos devem mostrar o cargo (não "Sem cargo")

### Teste 2: Verificar Detalhes do Funcionário
1. Clicar em um funcionário na lista
2. Verificar o card de detalhes no topo
3. ✅ Campo "Cargo:" deve mostrar o cargo correto (não "N/A")

### Teste 3: Verificar Impressão
1. Clicar em "Visualizar Holerite" para um funcionário
2. Verificar a linha com CPF, RG e Cargo
3. ✅ Cargo deve aparecer corretamente (não "N/A")

### Teste 4: Verificar com Usuário Gerente
1. Fazer login com um usuário gerente
2. Acessar Folhas Calculadas
3. ✅ Cargos devem aparecer normalmente

---

## Arquivos Modificados

- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Múltiplas linhas corrigidas

---

## Status

✅ **CORREÇÃO APLICADA**

O cargo agora deve ser exibido corretamente para todos os usuários, incluindo gerentes.

Se o problema persistir, execute as queries de verificação do banco de dados para identificar se há dados inconsistentes.

