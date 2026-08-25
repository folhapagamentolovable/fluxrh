# Sincronização de Cores - Portal de Escalas

## Alteração Realizada

Aplicadas as mesmas cores do Portal Gerencial no Portal do Funcionário para manter consistência visual.

## Cores Padronizadas

### 🔵 Dias de Trabalho
- **Fundo**: `bg-blue-100`
- **Texto**: `text-blue-700`
- **Uso**: Dias em que o funcionário deve trabalhar

### 🟢 Dias de Folga  
- **Fundo**: `bg-green-100`
- **Texto**: `text-green-700`
- **Uso**: Dias de descanso/folga

### 🟡 Feriados
- **Fundo**: `bg-amber-100` 
- **Texto**: `text-amber-700`
- **Uso**: Feriados nacionais/municipais

### ⚪ Dias Sem Informação
- **Fundo**: `bg-muted/50`
- **Texto**: `text-muted-foreground`
- **Uso**: Dias sem dados de escala

## Alterações Aplicadas

### Portal do Funcionário (PortalEscalas.tsx)

**Antes:**
```typescript
if (isTrabalho) {
  bgColor = 'bg-primary/10';
  textColor = 'text-primary';
} else if (isFolga) {
  bgColor = 'bg-green-500/10';
  textColor = 'text-green-600';
} else if (isFeriado) {
  bgColor = 'bg-amber-500/10';
  textColor = 'text-amber-600';
}
```

**Depois:**
```typescript
if (isTrabalho) {
  bgColor = 'bg-blue-100';
  textColor = 'text-blue-700';
} else if (isFolga) {
  bgColor = 'bg-green-100';
  textColor = 'text-green-700';
} else if (isFeriado) {
  bgColor = 'bg-amber-100';
  textColor = 'text-amber-700';
}
```

### Legenda Atualizada

**Antes:**
```jsx
<div className="w-4 h-4 rounded bg-primary/10"></div>
<div className="w-4 h-4 rounded bg-green-500/10"></div>
<div className="w-4 h-4 rounded bg-amber-500/10"></div>
```

**Depois:**
```jsx
<div className="w-4 h-4 rounded bg-blue-100"></div>
<div className="w-4 h-4 rounded bg-green-100"></div>
<div className="w-4 h-4 rounded bg-amber-100"></div>
```

## Resultado

✅ **Consistência Visual**: Ambos os portais (Funcionário e Gerencial) agora usam as mesmas cores

✅ **Melhor UX**: Usuários que acessam ambos os portais terão uma experiência visual consistente

✅ **Cores Mais Claras**: As novas cores são mais visíveis e contrastantes que as anteriores com transparência

## Componentes Afetados

- ✅ **PortalEscalas.tsx** - Portal do Funcionário
- ✅ **PortalGerencialEscalas.tsx** - Portal Gerencial (já estava correto)

## Padrão de Cores Estabelecido

| Tipo | Cor de Fundo | Cor do Texto | Classe CSS |
|------|-------------|-------------|------------|
| Trabalho | Azul claro | Azul escuro | `bg-blue-100` + `text-blue-700` |
| Folga | Verde claro | Verde escuro | `bg-green-100` + `text-green-700` |
| Feriado | Âmbar claro | Âmbar escuro | `bg-amber-100` + `text-amber-700` |

Este padrão deve ser mantido em futuras implementações relacionadas a escalas.