# Controle de Visibilidade do Portal do Funcionário

## Visão Geral

O sistema de controle de visibilidade permite que administradores definam quais holerites e recibos de benefícios devem ser exibidos no Portal do Funcionário. Isso é útil para controlar o acesso a documentos históricos e definir períodos específicos de disponibilidade.

## Funcionalidades

### 1. Configuração Administrativa

- **Página de Configuração**: `/config-portal` (apenas para administradores)
- **Controle por Tipo**: Configurações separadas para holerites e recibos de benefícios
- **Período Flexível**: Define mês/ano limite e quantos meses retroativos exibir
- **Ativação/Desativação**: Possibilidade de ativar ou desativar o controle por tipo de documento

### 2. Configurações Disponíveis

Para cada tipo de documento (holerites ou benefícios):

- **Mês Limite**: Último mês a ser exibido (1-12)
- **Ano Limite**: Último ano a ser exibido
- **Meses Retroativos**: Quantos meses para trás exibir a partir do limite
- **Status**: Ativo/Inativo
- **Observações**: Notas sobre a configuração

### 3. Cálculo do Período

O sistema calcula automaticamente o período de visibilidade:

```
Data Fim = Último dia do mês/ano limite
Data Início = Primeiro dia do (mês limite - meses retroativos)
```

**Exemplo:**
- Mês Limite: 11 (Novembro)
- Ano Limite: 2025
- Meses Retroativos: 12

**Resultado:** Exibe documentos de Dezembro/2024 até Novembro/2025

## Como Usar

### 1. Configurar Visibilidade (Administrador)

1. Acesse o menu "Config Portal" (apenas administradores)
2. Configure os parâmetros para holerites e/ou benefícios:
   - Defina o mês e ano limite
   - Escolha quantos meses retroativos exibir
   - Ative/desative conforme necessário
   - Adicione observações se necessário
3. Clique em "Salvar Alterações"

### 2. Visualização no Portal (Funcionário)

- Os funcionários verão apenas os documentos dentro do período configurado
- Uma mensagem informativa mostra o período de disponibilidade
- Documentos fora do período não aparecem na listagem

## Estrutura Técnica

### Tabela de Configuração

```sql
CREATE TABLE portal_visibility_config (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(50) NOT NULL, -- 'holerites' ou 'beneficios'
    mes_limite INTEGER NOT NULL,         -- Mês limite (1-12)
    ano_limite INTEGER NOT NULL,         -- Ano limite
    meses_retroativos INTEGER NOT NULL DEFAULT 12, -- Quantos meses para trás
    ativo BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Funções Utilitárias

- `getVisibilityConfigs()`: Busca configurações ativas
- `calculateVisibilityRange()`: Calcula período de visibilidade
- `isDocumentVisible()`: Verifica se um documento deve ser exibido
- `filterDocumentsByVisibility()`: Filtra lista de documentos
- `getVisibilityInfo()`: Obtém informações para exibição

### Integração com Hooks

O hook `useEmployeePortal` foi modificado para aplicar automaticamente os filtros de visibilidade:

```typescript
const fetchHolerites = async (ano?: number): Promise<FolhaCalculada[]> => {
  // ... busca dados ...
  
  // Aplicar filtro de visibilidade
  const filteredData = await filterDocumentsByVisibility(data || [], 'holerites');
  return filteredData;
};
```

## Configuração Padrão

O sistema vem com configurações padrão que exibem:
- **Holerites**: Últimos 12 meses até Novembro/2025
- **Benefícios**: Últimos 12 meses até Novembro/2025

## Casos de Uso

### Exemplo 1: Exibir apenas últimos 6 meses
- Mês Limite: 12 (Dezembro)
- Ano Limite: 2025
- Meses Retroativos: 6
- **Resultado**: Julho/2025 até Dezembro/2025

### Exemplo 2: Exibir até mês específico
- Mês Limite: 11 (Novembro)
- Ano Limite: 2025
- Meses Retroativos: 12
- **Resultado**: Dezembro/2024 até Novembro/2025

### Exemplo 3: Desabilitar controle
- Status: Inativo
- **Resultado**: Todos os documentos são exibidos (comportamento padrão)

## Segurança

- Apenas administradores podem acessar as configurações
- As configurações são aplicadas no backend (hook)
- Em caso de erro, o sistema mantém o comportamento padrão (exibir todos)
- Logs de erro são registrados para debugging

## Manutenção

### Atualizar Configurações

As configurações podem ser atualizadas a qualquer momento através da interface administrativa. As mudanças são aplicadas imediatamente.

### Monitoramento

- Verificar logs de erro relacionados à visibilidade
- Monitorar performance das consultas com filtros
- Validar se os períodos estão sendo aplicados corretamente

### Backup

Recomenda-se fazer backup da tabela `portal_visibility_config` antes de alterações importantes.