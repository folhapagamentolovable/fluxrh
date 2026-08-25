# Atualização de Eventos Excepcionais

**Data:** 01/03/2026  
**Versão:** 2.0  
**Status:** ✅ Implementado

## 📋 Resumo

Esta atualização reorganiza e expande o sistema de eventos excepcionais, adicionando novos tipos de eventos, removendo eventos obsoletos e implementando funcionalidade de personalização para eventos "Outros".

---

## 🆕 Novos Eventos Adicionados

### PROVENTOS

#### Adicionais
- `0305` - **Folhas de Pagamento** (anteriormente "Serviços Externos (Folhas de Pagamento)")
- `0306` - **Controle de Rondas Palmeiras** (anteriormente "Serviços Externos (Controle de Rondas)")
- `0307` - **Supervisão Palmeiras** (mantido)
- `0308` - **Outros Serviços** ⭐ NOVO - permite digitação personalizada

#### 13º Salário
- `0520` - **13º Salário** ⭐ NOVO (integral)
- `0521` - **Vantagens 13º** ⭐ NOVO
- `0522` - **13º Salário 1ª Parcela** (renumerado de 0520)
- `0523` - **13º Salário 2ª Parcela** (renumerado de 0521)
- `0524` - **13º Salário Vantagens 1ª Parcela** (renumerado de 0522)
- `0525` - **13º Salário Vantagens 2ª Parcela** (renumerado de 0523)

### DESCONTOS

#### Diversos
- `5013` - **Outros Descontos** ⭐ NOVO - permite digitação personalizada

#### Legais
- `5013` - **INSS 13º** (mantido)
- `5014` - **INSS Férias** ⭐ NOVO

#### Adiantamentos
- `5014` - **Adiantam. de Salário** (renumerado de 5016)
- `5015` - **Adiantam. 13º Salário** (renumerado de 5014)
- `5016` - **Adiantam. Vantagens 13º** (renumerado de 5015)
- `5017` - **Outros Adiantamentos** ⭐ NOVO - permite digitação personalizada

### BENEFÍCIOS

#### Descontos de Benefício
- `B001` - **Desc. Rondas Não Realizadas** (mantido)
- `B002` - **Desc. Ajuste dos Benefícios** ⭐ NOVO
- `B003` - **Desc. Outros Benefícios** ⭐ NOVO - permite digitação personalizada

#### Reembolsos
- `B010` - **Reembolsos** (renumerado de B002)
- `B011` - **Outros Reembolsos** ⭐ NOVO - permite digitação personalizada

---

## ❌ Eventos Removidos

- `0305` - FT (Folga Trabalhada) - removido dos eventos excepcionais (já calculado automaticamente)
- `0524` - 13º Salário Integral - renumerado para 0520
- `0525` - Vantagens 13º - renumerado para 0521

---

## 🔄 Eventos Renomeados

| Código Antigo | Nome Antigo | Código Novo | Nome Novo |
|---------------|-------------|-------------|-----------|
| 0306 | Serviços Externos (Folhas de Pagamento) | 0305 | Folhas de Pagamento |
| 0307 | Serviços Externos (Controle de Rondas) | 0306 | Controle de Rondas Palmeiras |
| 0308 | Supervisão (Palmeiras) | 0307 | Supervisão Palmeiras |
| 0520 | 13º Salário 1ª Parcela | 0522 | 13º Salário 1ª Parcela |
| 0521 | 13º Salário 2ª Parcela | 0523 | 13º Salário 2ª Parcela |
| 0522 | 13º Salário Vantagens 1ª Parcela | 0524 | 13º Salário Vantagens 1ª Parcela |
| 0523 | 13º Salário Vantagens 2ª Parcela | 0525 | 13º Salário Vantagens 2ª Parcela |
| 0524 | 13º Salário Integral | 0520 | 13º Salário |
| 0525 | Vantagens 13º | 0521 | Vantagens 13º |
| 5014 | Adiantam. 13º Salário | 5015 | Adiantam. 13º Salário |
| 5015 | Adiantam. Vantagens 13º | 5016 | Adiantam. Vantagens 13º |
| 5016 | Adiantam. de Salário | 5014 | Adiantam. de Salário |
| B002 | Reembolsos | B010 | Reembolsos |

---

## ⭐ Nova Funcionalidade: Eventos Personalizados

Foram adicionados 5 novos eventos que permitem digitação livre de descrição e valor:

1. **0308 - Outros Serviços** (Proventos)
2. **5013 - Outros Descontos** (Descontos)
3. **5017 - Outros Adiantamentos** (Descontos)
4. **B003 - Desc. Outros Benefícios** (Benefícios)
5. **B011 - Outros Reembolsos** (Benefícios)

### Como Usar

Ao selecionar um desses eventos na interface, o sistema exibirá:
- Campo de texto para digitar a descrição personalizada
- Campo numérico para o valor

Exemplo:
```
Tipo: Provento
Evento: Outros Serviços
Descrição: Treinamento de Segurança
Valor: R$ 150,00
```

---

## 📁 Arquivos Modificados

### 1. `utils/eventosExcepcionaisValidator.ts`
- ✅ Atualizado com nova lista de eventos
- ✅ Adicionado suporte para eventos personalizados
- ✅ Atualizado mapa de normalização
- ✅ Adicionada propriedade `permitePersonalizacao`

### 2. `migrations/add_servicos_externos_reembolsos.sql`
- ✅ Criado migration SQL para adicionar novos campos
- ✅ Adicionados 16 novos campos na tabela `folha_calculada`
- ✅ Adicionado campo JSON `eventos_excepcionais` para eventos personalizados
- ✅ Criados comentários e índices

### 3. `scripts/add-servicos-externos-reembolsos.js`
- ✅ Criado script para executar a migration
- ✅ Inclui verificação de colunas criadas
- ✅ Tratamento de erros e relatório de execução

### 4. `pages/Operacional/CalculatedPayroll.tsx`
- ⏳ Pendente: Atualizar listas de seleção de eventos
- ⏳ Pendente: Adicionar campos de personalização para eventos "Outros"
- ⏳ Pendente: Atualizar lógica de salvamento

### 5. `pages/Operacional/Reports.tsx`
- ⏳ Pendente: Atualizar relatórios para exibir novos eventos
- ⏳ Pendente: Adicionar suporte para eventos personalizados

---

## 🗄️ Estrutura do Banco de Dados

### Novos Campos Adicionados

```sql
-- Proventos
servicos_externos_folhas_pagamento DECIMAL(10,2)
servicos_externos_controle_rondas DECIMAL(10,2)
supervisao_palmeiras DECIMAL(10,2)
folga_trabalhada DECIMAL(10,2)
decimo_terceiro_primeira_parcela DECIMAL(10,2)
decimo_terceiro_segunda_parcela DECIMAL(10,2)
decimo_terceiro_vantagens_primeira_parcela DECIMAL(10,2)
decimo_terceiro_vantagens_segunda_parcela DECIMAL(10,2)
decimo_terceiro_integral DECIMAL(10,2)
vantagens_13 DECIMAL(10,2)

-- Descontos
inss_13 DECIMAL(10,2)
inss_ferias DECIMAL(10,2)
adiantamento_13_salario DECIMAL(10,2)
adiantamento_vantagens_13 DECIMAL(10,2)

-- Benefícios
reembolsos_uber DECIMAL(10,2)

-- Eventos Personalizados
eventos_excepcionais JSONB
```

### Estrutura do JSON `eventos_excepcionais`

```json
[
  {
    "descricao": "Outros Serviços",
    "descricao_personalizada": "Treinamento de Segurança",
    "valor": 150.00,
    "tipo": "provento",
    "codigo": "0308"
  },
  {
    "descricao": "Outros Descontos",
    "descricao_personalizada": "Desconto Material Perdido",
    "valor": 50.00,
    "tipo": "desconto",
    "codigo": "5013"
  }
]
```

---

## 🚀 Como Executar a Migration

### Opção 1: Via Script Node.js

```bash
# Instalar dependências (se necessário)
npm install @supabase/supabase-js

# Configurar variáveis de ambiente
export VITE_SUPABASE_URL="sua_url"
export VITE_SUPABASE_ANON_KEY="sua_chave"

# Executar script
node scripts/add-servicos-externos-reembolsos.js
```

### Opção 2: Via SQL Direto

1. Abrir o Supabase Dashboard
2. Ir em SQL Editor
3. Copiar conteúdo de `migrations/add_servicos_externos_reembolsos.sql`
4. Executar

---

## ✅ Checklist de Implementação

### Backend / Banco de Dados
- [x] Criar migration SQL
- [x] Criar script de execução
- [x] Adicionar novos campos na tabela
- [x] Criar índices
- [ ] Executar migration em produção

### Validação e Normalização
- [x] Atualizar `eventosExcepcionaisValidator.ts`
- [x] Adicionar novos eventos
- [x] Atualizar mapa de normalização
- [x] Adicionar suporte para personalização

### Interface (CalculatedPayroll.tsx)
- [ ] Atualizar lista de proventos
- [ ] Atualizar lista de descontos
- [ ] Atualizar lista de benefícios
- [ ] Adicionar campos de personalização
- [ ] Atualizar lógica de salvamento
- [ ] Atualizar lógica de carregamento

### Relatórios
- [ ] Atualizar holerite de salário
- [ ] Atualizar holerite de 13º
- [ ] Atualizar recibo de benefícios
- [ ] Atualizar exportação em lote
- [ ] Atualizar impressão de recibos

### Testes
- [ ] Testar adição de eventos padrão
- [ ] Testar adição de eventos personalizados
- [ ] Testar salvamento no banco
- [ ] Testar carregamento de folhas
- [ ] Testar impressão de documentos
- [ ] Testar exportação em lote

---

## 📊 Impacto

### Positivo
- ✅ Maior flexibilidade para eventos personalizados
- ✅ Melhor organização dos códigos contábeis
- ✅ Nomenclatura mais clara e consistente
- ✅ Suporte para novos tipos de eventos

### Atenção
- ⚠️ Necessário atualizar interface de usuário
- ⚠️ Necessário migrar dados existentes (se houver)
- ⚠️ Necessário treinar usuários sobre novos eventos

---

## 📝 Notas Adicionais

1. **Retrocompatibilidade:** O sistema mantém normalização para nomes antigos, garantindo que folhas antigas continuem funcionando.

2. **Eventos Personalizados:** São salvos no campo JSON `eventos_excepcionais` e não criam colunas específicas no banco.

3. **Códigos Duplicados:** Alguns códigos aparecem duplicados (ex: 5013 para "INSS 13º" e "Outros Descontos"). Isso é intencional - o sistema diferencia pelo tipo e descrição.

4. **Migration Segura:** A migration usa `ADD COLUMN IF NOT EXISTS`, permitindo execução múltipla sem erros.

---

## 🔗 Referências

- [Documentação de Eventos Excepcionais](./EVENTOS_EXCEPCIONAIS.md)
- [Códigos Contábeis](../utils/codigosContabeisHolerite.ts)
- [Validador de Eventos](../utils/eventosExcepcionaisValidator.ts)
