# Solução Rápida: Horas de Saiane Não Aparecem

## 🔴 Problema Mais Provável

**AS MIGRAÇÕES SQL NÃO FORAM EXECUTADAS NO BANCO DE DADOS**

Isso afeta TODOS os funcionários, não apenas a Saiane. A coluna "Acumulado" mostrará 00:00 para todos.

## ✅ Solução Rápida (5 minutos)

### Passo 1: Executar Diagnóstico

1. Acesse o **Supabase SQL Editor**
2. Copie e cole TODO o conteúdo do arquivo `migrations/diagnostico_saiane_banco_horas.sql`
3. Clique em **Run**
4. Analise os resultados

### Passo 2: Identificar o Problema

O diagnóstico mostrará uma das seguintes mensagens:

#### 🔴 "Tabela banco_horas_mensal não existe"
**Solução:** Executar as migrações SQL

1. No Supabase SQL Editor, execute:
   - Primeiro: `migrations/create_banco_horas_mensal.sql`
   - Depois: `migrations/function_calcular_banco_horas_mensal.sql`
2. Popular dados: `SELECT recalcular_banco_horas_ultimos_meses(6);`
3. Recarregar a página

#### 🔴 "Funcionário sem escala vinculada"
**Solução:** Vincular escala

1. Acessar **Cadastros > Funcionários**
2. Editar Saiane
3. Selecionar uma escala na seção "Escala"
4. Salvar

#### 🔴 "Escala não encontrada ou inativa"
**Solução:** Ativar escala

1. Acessar **Cadastros > Escalas**
2. Localizar a escala da Saiane
3. Marcar como "Ativa"
4. Configurar horários para os dias da semana
5. Salvar

#### ⚠️ "Sem registros de ponto"
**Solução:** Verificar registros

1. Confirmar que Saiane está registrando ponto via QR Code
2. Verificar se o período filtrado está correto
3. Verificar se os registros estão sendo salvos

#### ✅ "Configuração OK"
**Solução:** Verificar cálculos

- Se os cálculos manuais mostram valores mas o sistema mostra 00:00:
  - Limpar cache do navegador (Ctrl+Shift+R)
  - Verificar se as migrações foram executadas
  - Verificar se `banco_horas_ativo = true` para a Saiane

## 📋 Checklist Rápido (Execute no SQL Editor)

```sql
-- 1. Funcionário existe e está ativo?
SELECT nome_completo, ativo, demitido, banco_horas_ativo, codigo_escala
FROM funcionarios 
WHERE nome_completo ILIKE '%Saiane%';
-- Esperado: ativo=true, demitido=false, codigo_escala preenchido

-- 2. Tem escala configurada?
SELECT f.nome_completo, f.codigo_escala, r.ativa
FROM funcionarios f
LEFT JOIN regras_escalas r ON f.codigo_escala = r.codigo_escala
WHERE f.nome_completo ILIKE '%Saiane%';
-- Esperado: codigo_escala preenchido, ativa=true

-- 3. Tem registros de ponto?
SELECT COUNT(*) 
FROM folha_ponto_automatica fpa
INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
  AND EXTRACT(MONTH FROM fpa.data_registro) = 3
  AND EXTRACT(YEAR FROM fpa.data_registro) = 2026;
-- Esperado: > 0

-- 4. Tabela existe?
SELECT COUNT(*) FROM banco_horas_mensal;
-- Se der erro "relation does not exist": EXECUTAR MIGRAÇÕES!
```

## 🎯 Ação Imediata

**Se você ainda não executou as migrações SQL:**

1. Abra o Supabase SQL Editor
2. Execute `migrations/create_banco_horas_mensal.sql`
3. Execute `migrations/function_calcular_banco_horas_mensal.sql`
4. Execute `SELECT recalcular_banco_horas_ultimos_meses(6);`
5. Aguarde o processamento
6. Recarregue a página de Banco de Horas

**Isso resolverá o problema para TODOS os funcionários, incluindo a Saiane.**

## 📚 Documentação Completa

- **Diagnóstico detalhado:** `docs/TROUBLESHOOTING_SAIANE_BANCO_HORAS.md`
- **Guia de migrações:** `docs/EXECUTAR_MIGRACOES_BANCO_HORAS.md`
- **Resumo completo:** `docs/RESUMO_BANCO_HORAS_COMPLETO.md`

## ❓ Ainda Não Funciona?

Execute o diagnóstico completo:
```sql
\i migrations/diagnostico_saiane_banco_horas.sql
```

E consulte `docs/TROUBLESHOOTING_SAIANE_BANCO_HORAS.md` para análise detalhada de cada possível causa.

