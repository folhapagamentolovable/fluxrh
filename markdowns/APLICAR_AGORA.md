# 🚀 APLICAR MIGRAÇÃO AGORA - 3 Passos Simples

## ⚡ Método Mais Rápido (2 minutos)

### 1️⃣ Acesse o Supabase
- Vá para: https://supabase.com/dashboard
- Faça login
- Selecione seu projeto: **nmwrplxnjqyerorbbcxk**

### 2️⃣ Abra o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Clique no botão **"New query"**

### 3️⃣ Execute Este Código
Copie e cole exatamente isto:

```sql
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS demitido BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN funcionarios.demitido IS 'Funcionário demitido - não aparece em processamentos ativos';

CREATE INDEX IF NOT EXISTS idx_funcionarios_demitido ON funcionarios(demitido);

SELECT 'Migração aplicada com sucesso!' as resultado;
```

### 4️⃣ Clique em "Run" ▶️

### ✅ Pronto!
Se aparecer "Migração aplicada com sucesso!", está funcionando!

---

## 🎯 Teste Imediato

Após aplicar a migração:

1. Vá para a página de **Funcionários** no sistema
2. Clique em **"Novo Funcionário"** ou edite um existente
3. Você verá o novo checkbox **"Demitido?"**
4. Na tabela, haverá uma nova coluna **"Demitido"** com checkboxes vermelhos

---

## 🔧 Se Preferir Via Script

```bash
# Execute no terminal (as variáveis .env serão carregadas automaticamente)
node scripts/apply_demitido_migration.js
```

---

**⚡ Recomendação: Use o método do Supabase Dashboard (mais simples e direto)!**