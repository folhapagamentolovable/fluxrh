# Design Document

## Overview

Esta funcionalidade adiciona uma nova coluna `estado_inicial_01_01` na tabela `regras_escalas` para definir explicitamente se uma escala com alternância deve iniciar o ano trabalhando ou folgando. Isso elimina a dependência da lógica externa baseada em códigos T1/T2 e torna o sistema mais robusto e menos propenso a erros.

## Architecture

### Database Schema Changes

**Nova Coluna na Tabela `regras_escalas`:**
```sql
ALTER TABLE regras_escalas 
ADD COLUMN estado_inicial_01_01 VARCHAR(10) CHECK (estado_inicial_01_01 IN ('trabalha', 'folga'));

COMMENT ON COLUMN regras_escalas.estado_inicial_01_01 IS 
'Define se a escala com alternância inicia 01/01 trabalhando ou folgando. NULL para escalas sem alternância.';
```

### Data Flow

1. **Interface de Configuração** → Salva estado inicial explícito na nova coluna
2. **Interpretador de Escalas** → Consulta diretamente a coluna para determinar padrão inicial
3. **Geração de Escalas** → Usa o estado inicial como base para calcular alternâncias

## Components and Interfaces

### 1. Database Migration

**Arquivo:** `migrations/add_estado_inicial_01_01.sql`

```sql
-- Adicionar nova coluna
ALTER TABLE regras_escalas 
ADD COLUMN estado_inicial_01_01 VARCHAR(10) 
CHECK (estado_inicial_01_01 IN ('trabalha', 'folga'));

-- Migrar dados existentes baseado em tipo_alternancia
UPDATE regras_escalas 
SET estado_inicial_01_01 = 'trabalha'
WHERE tipo_alternancia LIKE '%_T1';

UPDATE regras_escalas 
SET estado_inicial_01_01 = 'folga'
WHERE tipo_alternancia LIKE '%_T2';

-- Adicionar comentário
COMMENT ON COLUMN regras_escalas.estado_inicial_01_01 IS 
'Define se a escala com alternância inicia 01/01 trabalhando ou folgando. NULL para escalas sem alternância.';
```

### 2. TypeScript Interface Updates

**Arquivo:** `src/integrations/supabase/types.ts`

```typescript
// Adicionar ao tipo Row
estado_inicial_01_01: 'trabalha' | 'folga' | null

// Adicionar ao tipo Insert
estado_inicial_01_01?: 'trabalha' | 'folga' | null

// Adicionar ao tipo Update  
estado_inicial_01_01?: 'trabalha' | 'folga' | null
```

### 3. Interface de Configuração

**Arquivo:** `pages/ScheduleRules.tsx`

**Modificações no FormData:**
```typescript
interface FormData {
  // ... campos existentes
  estado_inicial_01_01: 'trabalha' | 'folga' | '';
}
```

**Novo Campo no Formulário:**
```tsx
{/* Mostrar apenas para escalas com alternância */}
{formData.tipo_alternancia !== 'NENHUMA' && (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      Estado Inicial em 01/01/2025
    </label>
    <Select
      value={formData.estado_inicial_01_01}
      onChange={(e) => handleInputChange('estado_inicial_01_01', e.target.value)}
      required
    >
      <option value="">Selecione...</option>
      <option value="trabalha">🟢 Trabalha em 01/01/2025</option>
      <option value="folga">🔴 Folga em 01/01/2025</option>
    </Select>
    <p className="text-xs text-gray-500">
      Define como a alternância inicia no primeiro dia do ano
    </p>
  </div>
)}
```

### 4. Visualização na Lista

**Modificações na Tabela de Escalas:**
```tsx
// Nova coluna na tabela
<th>Estado Inicial 01/01</th>

// Célula com ícone visual
<td className="px-4 py-3">
  {escala.tipo_alternancia === 'NENHUMA' ? (
    <span className="text-gray-400">N/A</span>
  ) : (
    <div className="flex items-center gap-2">
      {escala.estado_inicial_01_01 === 'trabalha' ? (
        <>
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-sm">Trabalha</span>
        </>
      ) : escala.estado_inicial_01_01 === 'folga' ? (
        <>
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span className="text-sm">Folga</span>
        </>
      ) : (
        <span className="text-yellow-600 text-sm">Não definido</span>
      )}
    </div>
  )}
</td>
```

### 5. Interpretador de Escalas

**Arquivo:** `utils/converterRegraVisualParaJSON.ts`

**Modificação na Lógica:**
```typescript
export function converterRegraVisualParaJSON(regraVisual: RegraVisualInterface): RegraEscalaJSON {
  // ... código existente
  
  // Nova lógica usando estado_inicial_01_01
  if (regraVisual.tipo_alternancia.startsWith('DIAS_ALTERNADOS')) {
    tipo = 'ALTERNANCIA_12X36';
    alternancia = {
      vigencia: regraVisual.data_vigencia,
      // Usar a nova coluna como fonte de verdade
      trabalha_primeiro_dia: regraVisual.estado_inicial_01_01 === 'trabalha'
    };
  } else if (regraVisual.tipo_alternancia.startsWith('SABADOS_ALTERNADOS')) {
    tipo = 'SABADOS_ALTERNADOS';
    alternancia = {
      vigencia: regraVisual.data_vigencia,
      // Usar a nova coluna como fonte de verdade
      trabalha_primeiro_sabado: regraVisual.estado_inicial_01_01 === 'trabalha'
    };
  }
  
  // ... resto do código
}
```

## Data Models

### Regra de Escala Atualizada

```typescript
interface RegraEscala {
  id: string;
  codigo_escala: string;
  nome_escala: string;
  tipo_alternancia: string;
  estado_inicial_01_01: 'trabalha' | 'folga' | null; // NOVA COLUNA
  // ... outros campos existentes
}
```

### Estados Possíveis

```typescript
type EstadoInicial = 'trabalha' | 'folga' | null;

// Mapeamento para interface
const ESTADO_LABELS = {
  'trabalha': 'Trabalha em 01/01',
  'folga': 'Folga em 01/01',
  null: 'N/A (sem alternância)'
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Estado inicial válido
*For any* regra de escala com alternância, o campo `estado_inicial_01_01` deve conter apenas os valores 'trabalha', 'folga' ou null
**Validates: Requirements 1.4, 2.2**

### Property 2: Estado inicial obrigatório para alternância
*For any* regra de escala onde `tipo_alternancia` não é 'NENHUMA', o campo `estado_inicial_01_01` deve ser não-nulo
**Validates: Requirements 1.1, 3.4**

### Property 3: Estado inicial nulo para escalas fixas
*For any* regra de escala onde `tipo_alternancia` é 'NENHUMA', o campo `estado_inicial_01_01` deve ser null
**Validates: Requirements 1.5, 3.5**

### Property 4: Migração consistente T1/T2
*For any* regra existente com `tipo_alternancia` terminando em 'T1', após migração o `estado_inicial_01_01` deve ser 'trabalha'
**Validates: Requirements 4.2**

### Property 5: Migração consistente T2
*For any* regra existente com `tipo_alternancia` terminando em 'T2', após migração o `estado_inicial_01_01` deve ser 'folga'
**Validates: Requirements 4.3**

### Property 6: Interpretador usa nova coluna
*For any* escala com alternância processada pelo interpretador, quando `estado_inicial_01_01` está preenchido, o cálculo deve usar este valor como base
**Validates: Requirements 5.1, 5.2, 5.3**

## Error Handling

### Validação de Dados
- **Campo obrigatório**: Validar que escalas com alternância tenham estado inicial definido
- **Valores válidos**: Aceitar apenas 'trabalha', 'folga' ou null
- **Consistência**: Escalas sem alternância não devem ter estado inicial

### Migração Segura
- **Backup**: Criar backup antes da migração
- **Rollback**: Possibilidade de reverter alterações
- **Validação pós-migração**: Verificar integridade dos dados

### Compatibilidade
- **Registros antigos**: Manter funcionamento com registros que têm estado inicial null
- **Fallback**: Se estado inicial não definido, usar lógica antiga como fallback

## Testing Strategy

### Unit Tests
- Validação de valores permitidos na nova coluna
- Conversão correta de códigos T1/T2 para estado inicial
- Interface mostra/oculta campo baseado no tipo de alternância

### Property Tests
- Verificar que todas as escalas com alternância têm estado inicial válido
- Confirmar que interpretador usa corretamente a nova coluna
- Validar migração preserva funcionalidade existente

### Integration Tests
- Fluxo completo: criar escala → definir estado inicial → gerar escala mensal
- Migração de dados existentes funciona corretamente
- Interface salva e carrega valores corretamente

**Configuração dos Testes:**
- Mínimo 100 iterações por teste de propriedade
- Cada teste deve referenciar sua propriedade do design
- Tag format: **Feature: escala-estado-inicial, Property {number}: {property_text}**