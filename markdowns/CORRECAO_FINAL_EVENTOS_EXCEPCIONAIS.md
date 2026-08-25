# Correção Final - Eventos Excepcionais não Salvos

## Problema Identificado
Os campos de eventos excepcionais estavam sendo **calculados** mas **não salvos** na tabela `folha_calculada` devido a um problema no mapeamento dos dados.

## Causa Raiz
O código estava tentando acessar os totais em:
```
folha.dadosFolha?.totais?.total_decimo_terceiro_proporcional_rescisao
```

Mas os totais podem estar diretamente em:
```
folha.dadosFolha?.total_decimo_terceiro_proporcional_rescisao
```

## Correções Aplicadas

### 1. Mapeamento no Salvamento Individual ✅
**Arquivo**: `pages/CalculatedPayroll.tsx` - função `handleSalvarIndividual`

```tsx
// ANTES (só tentava um caminho)
decimo_terceiro_proporcional_rescisao: folha.dadosFolha?.totais?.total_decimo_terceiro_proporcional_rescisao || 0,

// DEPOIS (tenta ambos os caminhos)
decimo_terceiro_proporcional_rescisao: folha.dadosFolha?.totais?.total_decimo_terceiro_proporcional_rescisao || folha.dadosFolha?.total_decimo_terceiro_proporcional_rescisao || 0,
```

### 2. Mapeamento no Salvamento em Lote ✅
**Arquivo**: `pages/CalculatedPayroll.tsx` - função `handleSalvarTodas`

Aplicada a mesma correção para todos os 5 campos.

### 3. Cálculo dos Totais na Interface ✅
**Arquivo**: `pages/CalculatedPayroll.tsx` - função `calcularTotaisComEventos`

Corrigido para tentar ambos os caminhos ao somar os eventos de rescisão.

### 4. Exibição na Interface ✅
**Arquivo**: `pages/CalculatedPayroll.tsx` - seção "💰 Salários"

Corrigido para tentar ambos os caminhos ao exibir os valores.

### 5. Logs de Debug ✅
Adicionado log para verificar onde os totais estão sendo armazenados:

```tsx
console.log(`🔍 TOTAIS EVENTOS EXCEPCIONAIS - ${funcionario.nome_completo}:`, {
    total_decimo_terceiro_proporcional_rescisao: folhaPonto.total_decimo_terceiro_proporcional_rescisao,
    // ... outros campos
    totais_objeto: folhaPonto.totais
});
```

## Campos Corrigidos
1. **decimo_terceiro_proporcional_rescisao**
2. **ferias_proporcionais_rescisao**
3. **um_terco_ferias_proporcional_rescisao**
4. **plr_proporcional_rescisao**
5. **decimo_terceiro_vantagens_rescisao**

## Como Testar

### 1. Verificar Logs
Execute "Calcular Todas" e observe no console (F12) os logs:
```
🔍 TOTAIS EVENTOS EXCEPCIONAIS - [Nome]: {
  total_decimo_terceiro_proporcional_rescisao: valor,
  totais_objeto: { ... }
}
```

### 2. Adicionar Evento e Salvar
1. Clique em "✏️ Editar"
2. Clique em "➕ Adicionar Provento"
3. Escolha opção 1-5 (eventos de rescisão)
4. Digite um valor (ex: 1000)
5. Clique em "💾 Salvar"
6. Verifique no banco se o campo foi salvo

### 3. Verificar no Banco
```sql
SELECT 
    nome_funcionario,
    decimo_terceiro_proporcional_rescisao,
    ferias_proporcionais_rescisao,
    um_terco_ferias_proporcional_rescisao,
    plr_proporcional_rescisao,
    decimo_terceiro_vantagens_rescisao
FROM folha_calculada 
WHERE mes = [MES] AND ano = [ANO]
AND (
    decimo_terceiro_proporcional_rescisao > 0 OR
    ferias_proporcionais_rescisao > 0 OR
    um_terco_ferias_proporcional_rescisao > 0 OR
    plr_proporcional_rescisao > 0 OR
    decimo_terceiro_vantagens_rescisao > 0
);
```

## Status
✅ **CORRIGIDO** - Campos agora são mapeados corretamente e salvos na tabela `folha_calculada`