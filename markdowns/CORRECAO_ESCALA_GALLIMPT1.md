# Correção da Escala GALLIMPT1 - Problema com Sábados Alternados

## 🔍 **Problema Identificado**

A escala **GALLIMPT1** (Auxiliar de Limpeza Galleria T1) está configurada incorretamente no banco de dados, causando folgas em sábados alternados quando deveria trabalhar **TODOS os sábados**.

### ❌ **Configuração Atual (Incorreta)**
```
tipo_alternancia: 'SABADOS_ALTERNADOS_T1'
```
- **Resultado**: Trabalha apenas sábados alternados (1º, 3º, 5º...)
- **Comportamento**: Sábado sim, sábado não (INCORRETO)

### ✅ **Configuração Correta**
```
tipo_alternancia: 'NENHUMA'
```
- **Resultado**: Trabalha TODOS os sábados das 08:00 às 12:00
- **Comportamento**: Escala fixa sem alternância (CORRETO)

## 📋 **Regra Correta para GALLIMPT1**

| Dia | Horário | Intrajornada |
|-----|---------|--------------|
| Segunda a Sexta | 08:00-12:00 e 13:00-17:00 | ✅ Sim (12:00-13:00) |
| **Sábado** | **08:00-12:00** | ❌ Não |
| Domingo | FOLGA | - |
| Feriados | FOLGA | - |

## 🔧 **Como Corrigir**

### Opção 1: Via Interface (Recomendado)
1. Acesse **Cadastros → Escalas**
2. Localize a escala **GALLIMPT1**
3. Altere **Tipo de Alternância** de:
   - ❌ `📅 Sábados Alternados T1 - Trabalha 1º sábado`
   - ✅ `🔒 Escala Fixa (sem alternância)`
4. Salve as alterações

### Opção 2: Via SQL (Direto no Banco)
Execute o arquivo `corrigir-escala-gallimpt1.sql`:

```sql
UPDATE regras_escalas 
SET 
    tipo_alternancia = 'NENHUMA',
    trabalha_sabado = true,
    trabalha_domingo = false,
    trabalha_feriado = false
WHERE codigo_escala = 'GALLIMPT1';
```

## 🎯 **Impacto da Correção**

### Antes da Correção:
- ❌ Janeiro: Trabalha sábados 4, 18 (folga nos dias 11, 25)
- ❌ Fevereiro: Trabalha sábados 1, 15 (folga nos dias 8, 22)

### Após a Correção:
- ✅ Janeiro: Trabalha **TODOS** os sábados (4, 11, 18, 25)
- ✅ Fevereiro: Trabalha **TODOS** os sábados (1, 8, 15, 22)

## 🔄 **Regenerar Escalas Mensais**

Após a correção, **regenere as escalas mensais** para aplicar a nova configuração:

1. Acesse **Operacional → Escalas**
2. Selecione o mês/ano desejado
3. Clique em **"Gerar Últimos 12 Meses"** ou gere mês por mês
4. Verifique se os sábados agora aparecem como **TRABALHO** em vez de **FOLGA**

## ✅ **Verificação**

Para confirmar que a correção funcionou:

1. **Gere uma escala mensal** para um funcionário com cargo GALLIMPT1
2. **Verifique os sábados**: Todos devem mostrar:
   - Status: **TRABALHO**
   - Horário: **08:00-12:00 (Sem Intrajornada)**
3. **Não deve haver alternância** nos sábados

## 📝 **Observações Técnicas**

- **Arquivo afetado**: `utils/converterRegraVisualParaJSON.ts`
- **Lógica**: Quando `tipo_alternancia = 'SABADOS_ALTERNADOS_T1'`, o sistema aplica alternância
- **Solução**: Alterar para `tipo_alternancia = 'NENHUMA'` remove a alternância
- **Compatibilidade**: A correção é retroativa e afeta todas as gerações futuras

## 🚨 **Importante**

Esta correção afeta **apenas a escala GALLIMPT1**. Outras escalas que realmente precisam de sábados alternados (como PALMLIMPT1/PALMLIMPT2) devem manter suas configurações atuais.

---

**Status**: ⏳ Aguardando aplicação da correção  
**Prioridade**: 🔴 Alta (afeta geração de escalas mensais)  
**Impacto**: 📊 Funcionários com cargo Auxiliar de Limpeza Galleria T1