# Troubleshooting: Horas do Banco de Horas Não Exibidas

## Caso: Saiane de Oliveira Melo

### Possíveis Causas e Soluções

#### 1. ⚠️ CAUSA MAIS PROVÁVEL: Migrações SQL Não Executadas

**Problema:** A tabela `banco_horas_mensal` não existe no banco de dados.

**Como verificar:**
```sql
-- No Supabase SQL Editor, execute:
SELECT COUNT(*) FROM banco_horas_mensal;
```

**Se retornar erro "relation does not exist":**
- As migrações SQL NÃO foram executadas
- TODOS os funcionários mostrarão 00:00 no acumulado
- Solução: Executar as migrações conforme `docs/EXECUTAR_MIGRACOES_BANCO_HORAS.md`

---

#### 2. Campo `banco_horas_ativo` Desativado

**Problema:** O campo `banco_horas_ativo` está como `false` para a Saiane.

**Como verificar:**
```sql
SELECT nome_completo, banco_horas_ativo 
FROM funcionarios 
WHERE nome_completo ILIKE '%Saiane%';
```

**Se retornar `false`:**
- O card "Banco de Horas" não aparecerá no Portal do Funcionário
- Mas ainda deve aparecer na página administrativa e no Portal do Cliente

**Solução:**
1. Acessar **Cadastros > Funcionários**
2. Na tabela "Funcionários Cadastrados", localizar Saiane
3. Marcar o checkbox na coluna "Banco Hrs"
4. Ou editar o funcionário e marcar "Banco de Horas?" na seção correspondente

---

#### 3. Funcionário Sem Escala Vinculada

**Problema:** A Saiane não tem um `codigo_escala` definido.

**Como verificar:**
```sql
SELECT nome_completo, codigo_escala 
FROM funcionarios 
WHERE nome_completo ILIKE '%Saiane%';
```

**Se retornar `NULL` ou vazio:**
- O sistema não consegue calcular horários programados
- Sem horários programados, não há como calcular horas excedentes
- Resultado: 00:00 em todas as colunas

**Solução:**
1. Acessar **Cadastros > Funcionários**
2. Editar a Saiane
3. Na seção "Escala", selecionar uma escala válida
4. Salvar

---

#### 4. Escala Inativa ou Sem Horários Configurados

**Problema:** A escala vinculada à Saiane está inativa ou sem horários.

**Como verificar:**
```sql
-- Verificar escala da Saiane
SELECT f.nome_completo, f.codigo_escala, r.ativa,
       r.horarios_segunda, r.horarios_terca, r.horarios_quarta,
       r.horarios_quinta, r.horarios_sexta, r.horarios_sabado, r.horarios_domingo
FROM funcionarios f
LEFT JOIN regras_escalas r ON f.codigo_escala = r.codigo_escala
WHERE f.nome_completo ILIKE '%Saiane%';
```

**Se `ativa = false` ou horários estão NULL:**
- Sistema não consegue determinar horários programados
- Resultado: 00:00

**Solução:**
1. Acessar **Cadastros > Escalas**
2. Localizar a escala da Saiane
3. Verificar se está marcada como "Ativa"
4. Verificar se os horários estão configurados para os dias da semana
5. Salvar

---

#### 5. Sem Registros de Ponto no Período

**Problema:** A Saiane não tem registros de ponto no mês filtrado.

**Como verificar:**
```sql
-- Verificar registros de ponto da Saiane em Março/2026
SELECT f.nome_completo, fpa.data_registro, 
       fpa.primeiro_registro, fpa.quarto_registro
FROM folha_ponto_automatica fpa
INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
  AND EXTRACT(MONTH FROM fpa.data_registro) = 3
  AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
ORDER BY fpa.data_registro;
```

**Se não retornar registros:**
- Não há dados para calcular banco de horas
- Resultado: 00:00

**Solução:**
- Verificar se a Saiane está registrando ponto via QR Code
- Verificar se os registros estão sendo salvos corretamente
- Verificar se o período filtrado está correto

---

#### 6. Registros Incompletos (Sem Entrada ou Saída)

**Problema:** Os registros têm apenas entrada OU apenas saída.

**Como verificar:**
```sql
-- Verificar registros incompletos
SELECT f.nome_completo, fpa.data_registro, 
       fpa.primeiro_registro, fpa.quarto_registro,
       CASE 
         WHEN fpa.primeiro_registro IS NULL THEN 'Sem entrada'
         WHEN fpa.quarto_registro IS NULL THEN 'Sem saída'
         ELSE 'Completo'
       END as status
FROM folha_ponto_automatica fpa
INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
  AND EXTRACT(MONTH FROM fpa.data_registro) = 3
  AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
ORDER BY fpa.data_registro;
```

**Se houver registros incompletos:**
- Sistema só calcula banco de horas quando há ENTRADA E SAÍDA
- Dias incompletos não geram horas excedentes

**Solução:**
- Completar os registros manualmente se necessário
- Orientar a funcionária a registrar entrada E saída

---

#### 7. Horas Dentro da Tolerância

**Problema:** As horas excedentes estão dentro da tolerância de 5 minutos.

**Exemplo:**
- Horário programado: 08:00 - 17:00
- Horário real: 07:57 - 17:03
- Diferença entrada: 3 minutos (dentro da tolerância)
- Diferença saída: 3 minutos (dentro da tolerância)
- Resultado: 00:00 (não conta como banco de horas)

**Como verificar:**
```sql
-- Ver horários programados vs reais
SELECT 
    f.nome_completo,
    fpa.data_registro,
    r.horarios_segunda->>'entrada' as entrada_prog,
    r.horarios_segunda->>'saida' as saida_prog,
    fpa.primeiro_registro as entrada_real,
    fpa.quarto_registro as saida_real
FROM folha_ponto_automatica fpa
INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
LEFT JOIN regras_escalas r ON f.codigo_escala = r.codigo_escala
WHERE f.nome_completo ILIKE '%Saiane%'
  AND EXTRACT(DOW FROM fpa.data_registro) = 1 -- Segunda-feira
  AND EXTRACT(MONTH FROM fpa.data_registro) = 3
  AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
LIMIT 5;
```

**Se as diferenças são pequenas:**
- Isso é esperado! A tolerância de 5 minutos evita contabilizar pequenas variações
- Não é um erro, é o funcionamento correto do sistema

---

#### 8. Funcionário Marcado como Inativo ou Demitido

**Problema:** `ativo = false` ou `demitido = true`.

**Como verificar:**
```sql

```

**Se `ativo = false` ou `demitido = true`:**
- Funcionário não aparece na lista (filtrado na query)

**Solução:**
1. Acessar **Cadastros > Funcionários**
2. Editar a Saiane
3. Marcar "Ativo" e desmarcar "Demitido"
4. Salvar

---

## Checklist de Diagnóstico Rápido

Execute estas queries na ordem para diagnosticar rapidamente:

```sql
-- 1. Verificar se funcionário existe e está ativo
SELECT id, nome_completo, ativo, demitido, banco_horas_ativo, codigo_escala
FROM funcionarios 
WHERE nome_completo ILIKE '%Saiane%';

-- 2. Verificar se tem escala configurada
SELECT f.nome_completo, f.codigo_escala, r.ativa
FROM funcionarios f
LEFT JOIN regras_escalas r ON f.codigo_escala = r.codigo_escala
WHERE f.nome_completo ILIKE '%Saiane%';

-- 3. Verificar se tem registros de ponto
SELECT COUNT(*) as total_registros
FROM folha_ponto_automatica fpa
INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
  AND EXTRACT(MONTH FROM fpa.data_registro) = 3
  AND EXTRACT(YEAR FROM fpa.data_registro) = 2026;

-- 4. Verificar se tabela banco_horas_mensal existe e tem dados
SELECT COUNT(*) as total_registros
FROM banco_horas_mensal bhm
INNER JOIN funcionarios f ON bhm.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%';

-- 5. Ver dados detalhados (se existirem)
SELECT f.nome_completo, bhm.mes, bhm.ano, bhm.minutos_total, bhm.dias_com_banco
FROM banco_horas_mensal bhm
INNER JOIN funcionarios f ON bhm.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
ORDER BY bhm.ano DESC, bhm.mes DESC;
```

---

## Solução Mais Provável

Com base na implementação, a causa mais provável é:

**🔴 AS MIGRAÇÕES SQL NÃO FORAM EXECUTADAS**

Sem executar as migrações:
- A tabela `banco_horas_mensal` não existe
- A coluna "Acumulado" mostrará 00:00 para TODOS os funcionários
- A coluna "Banco Mensal" pode mostrar valores (calculado em tempo real)

**Solução:**
1. Seguir o guia `docs/EXECUTAR_MIGRACOES_BANCO_HORAS.md`
2. Executar as 2 migrações SQL no Supabase
3. Popular dados: `SELECT recalcular_banco_horas_ultimos_meses(6);`
4. Verificar novamente

---

## Após Resolver

Depois de aplicar a solução:
1. Limpar cache do navegador (Ctrl+Shift+R)
2. Recarregar a página de Banco de Horas
3. Filtrar pelo mês desejado
4. Verificar se os valores aparecem

Se ainda não funcionar, execute o checklist completo acima e documente os resultados.

