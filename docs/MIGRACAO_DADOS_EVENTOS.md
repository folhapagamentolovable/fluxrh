# Migração de Dados - Eventos Excepcionais

**Data:** 01/03/2026  
**Versão:** 2.0  
**Status:** 📋 Pronto para execução

---

## 🎯 Objetivo

Migrar dados existentes de eventos excepcionais para a nova estrutura, preservando todos os valores e normalizando descrições antigas.

---

## 📊 O Que Será Migrado

### Eventos com Mudança de Nome

| Nome Antigo | Nome Novo | Ação |
|-------------|-----------|------|
| Serviços Externos (Folhas de Pagamento) | Folhas de Pagamento | Renomear |
| Serviços Externos (Controle de Rondas) | Controle de Rondas Palmeiras | Renomear |
| Supervisão (Palmeiras) | Supervisão Palmeiras | Renomear |
| 13º Salário Integral | 13º Salário | Renomear |
| Reembolsos (Uber) | Reembolsos | Renomear |
| FT (Folga Trabalhada) | - | **REMOVER** (calculado automaticamente) |

### Campos com Mudança de Código

| Campo | Código Antigo | Código Novo |
|-------|---------------|-------------|
| 13º Salário 1ª Parcela | 0520 | 0522 |
| 13º Salário 2ª Parcela | 0521 | 0523 |
| 13º Salário Vantagens 1ª Parcela | 0522 | 0524 |
| 13º Salário Vantagens 2ª Parcela | 0523 | 0525 |
| 13º Salário Integral | 0524 | 0520 |
| Vantagens 13º | 0525 | 0521 |
| Adiantam. 13º Salário | 5014 | 5015 |
| Adiantam. Vantagens 13º | 5015 | 5016 |
| Adiantam. de Salário | 5016 | 5014 |
| Reembolsos | B002 | B010 |

---

## 🔒 Segurança

### Backup Automático

A migração cria automaticamente uma tabela de backup:

```sql
folha_calculada_backup_eventos_20260301
```

Esta tabela contém:
- Todos os registros com eventos excepcionais
- Valores originais de todos os campos
- Timestamp de criação

### Rollback Disponível

Se algo der errado, você pode reverter TUDO com um único comando SQL.

---

## 🚀 Como Executar

### Opção 1: Via Script Node.js (Recomendado)

```bash
# 1. Analisar dados antes da migração
node scripts/migrate-eventos-excepcionais-data.js

# 2. O script mostrará:
#    - Quantos registros serão afetados
#    - Quais eventos serão migrados
#    - O SQL completo para executar

# 3. Copiar o SQL e executar no Supabase Dashboard
```

### Opção 2: Via SQL Direto

```bash
# 1. Abrir Supabase Dashboard → SQL Editor

# 2. Copiar conteúdo de:
migrations/migrate_eventos_excepcionais_data.sql

# 3. Executar
```

---

## 📋 Ordem de Execução

**IMPORTANTE:** Execute as migrations nesta ordem:

### 1️⃣ Primeiro: Adicionar Novos Campos

```bash
# Executar primeiro para criar as novas colunas
migrations/add_servicos_externos_reembolsos.sql
```

### 2️⃣ Segundo: Migrar Dados

```bash
# Executar depois para migrar os dados existentes
migrations/migrate_eventos_excepcionais_data.sql
```

---

## ✅ Verificação Pós-Migração

### 1. Verificar Backup Criado

```sql
SELECT COUNT(*) as total_backup 
FROM folha_calculada_backup_eventos_20260301;
```

**Esperado:** Número igual ou maior que registros com eventos excepcionais.

### 2. Verificar Eventos Normalizados

```sql
SELECT 
    evento->>'descricao' as descricao,
    evento->>'tipo' as tipo,
    COUNT(*) as quantidade
FROM folha_calculada,
     jsonb_array_elements(eventos_excepcionais) as evento
WHERE eventos_excepcionais IS NOT NULL
GROUP BY evento->>'descricao', evento->>'tipo'
ORDER BY quantidade DESC;
```

**Esperado:** 
- ✅ Nomes novos aparecem (ex: "Folhas de Pagamento")
- ❌ Nomes antigos NÃO aparecem (ex: "Serviços Externos (Folhas de Pagamento)")

### 3. Verificar Eventos Antigos Removidos

```sql
-- Não deve retornar nenhum resultado
SELECT id, eventos_excepcionais
FROM folha_calculada
WHERE eventos_excepcionais::text LIKE '%Serviços Externos (Folhas%'
   OR eventos_excepcionais::text LIKE '%FT (Folga Trabalhada)%';
```

**Esperado:** 0 registros

### 4. Verificar Valores Preservados

```sql
-- Comparar valores antes e depois
SELECT 
    fc.id,
    fc.funcionario_id,
    fc.mes,
    fc.ano,
    backup.servicos_externos_folhas_pagamento_old as valor_antigo,
    fc.servicos_externos_folhas_pagamento as valor_novo
FROM folha_calculada fc
JOIN folha_calculada_backup_eventos_20260301 backup ON fc.id = backup.id
WHERE backup.servicos_externos_folhas_pagamento_old > 0
LIMIT 10;
```

**Esperado:** `valor_antigo` = `valor_novo`

---

## 🔙 Rollback (Reverter Migração)

Se algo der errado, execute:

```sql
-- Reverter eventos_excepcionais para valores originais
UPDATE folha_calculada fc
SET eventos_excepcionais = backup.eventos_excepcionais
FROM folha_calculada_backup_eventos_20260301 backup
WHERE fc.id = backup.id;

-- Verificar se rollback funcionou
SELECT COUNT(*) FROM folha_calculada
WHERE eventos_excepcionais::text LIKE '%Serviços Externos (Folhas%';
-- Deve retornar > 0 se havia eventos antigos
```

---

## 🗑️ Limpeza Pós-Migração

Após confirmar que tudo está funcionando (aguarde alguns dias):

```sql
-- Remover tabela de backup
DROP TABLE folha_calculada_backup_eventos_20260301;
```

⚠️ **ATENÇÃO:** Após remover o backup, não será mais possível fazer rollback!

---

## 📊 Impacto Esperado

### Dados Preservados ✅
- ✅ Todos os valores monetários mantidos
- ✅ Todas as datas mantidas
- ✅ Todos os vínculos (funcionário, empresa, etc) mantidos
- ✅ Histórico completo preservado

### Dados Modificados 🔄
- 🔄 Descrições de eventos normalizadas
- 🔄 Códigos contábeis atualizados (apenas referência)
- ❌ Eventos "FT (Folga Trabalhada)" removidos (calculados automaticamente)

### Sem Impacto ⚪
- ⚪ Cálculos de folha não são afetados
- ⚪ Relatórios continuam funcionando (com normalização automática)
- ⚪ Impressão de documentos continua funcionando

---

## 🧪 Testes Recomendados

Após a migração, teste:

1. **Carregar folha antiga:**
   - Abrir folha de mês anterior
   - Verificar se eventos aparecem corretamente
   - Verificar se valores estão corretos

2. **Imprimir holerite:**
   - Gerar holerite de funcionário com eventos migrados
   - Verificar se descrições estão corretas
   - Verificar se valores estão corretos

3. **Adicionar novo evento:**
   - Adicionar evento com novo nome
   - Salvar folha
   - Verificar se salvou corretamente

4. **Exportar em lote:**
   - Exportar folhas em lote
   - Verificar se eventos aparecem nos PDFs
   - Verificar se valores estão corretos

---

## ❓ FAQ

### P: Os valores monetários serão alterados?
**R:** NÃO. Apenas as descrições são normalizadas. Valores permanecem idênticos.

### P: Posso executar a migração múltiplas vezes?
**R:** SIM. A migração é idempotente - pode ser executada várias vezes sem problemas.

### P: O que acontece com eventos personalizados?
**R:** Eventos personalizados (não listados na tabela de migração) permanecem inalterados.

### P: Preciso parar a aplicação durante a migração?
**R:** NÃO é obrigatório, mas é recomendado para evitar inconsistências.

### P: Quanto tempo leva a migração?
**R:** Depende do volume de dados:
- < 1.000 registros: ~5 segundos
- 1.000 - 10.000 registros: ~30 segundos
- > 10.000 registros: ~2 minutos

### P: O que fazer se a migração falhar?
**R:** 
1. Execute o rollback (comando fornecido acima)
2. Verifique os logs de erro
3. Corrija o problema
4. Execute novamente

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs:** O script SQL gera relatórios detalhados
2. **Execute as queries de verificação:** Listadas acima
3. **Consulte o backup:** Tabela `folha_calculada_backup_eventos_20260301`
4. **Execute rollback se necessário:** Comando fornecido acima

---

## 📝 Checklist de Execução

- [ ] Ler esta documentação completamente
- [ ] Fazer backup manual do banco (opcional, mas recomendado)
- [ ] Executar migration de campos (`add_servicos_externos_reembolsos.sql`)
- [ ] Executar migration de dados (`migrate_eventos_excepcionais_data.sql`)
- [ ] Verificar backup criado
- [ ] Verificar eventos normalizados
- [ ] Verificar valores preservados
- [ ] Testar aplicação com dados migrados
- [ ] Aguardar alguns dias para confirmar estabilidade
- [ ] Remover backup (opcional)

---

## 🎉 Conclusão

Esta migração é **segura** e **reversível**. Todos os dados são preservados e você pode reverter a qualquer momento.

**Tempo estimado total:** 10-15 minutos (incluindo verificações)

**Risco:** Baixo (backup automático + rollback disponível)

**Benefício:** Sistema atualizado com nova estrutura de eventos
