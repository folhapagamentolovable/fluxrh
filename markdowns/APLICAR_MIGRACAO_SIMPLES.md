# 🚀 Como Aplicar a Migração do Campo "Demitido"

## 📋 Método Mais Simples (Recomendado)

### 1. Acesse o Supabase Dashboard
1. Vá para [supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione seu projeto

### 2. Abra o SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**

### 3. Execute a Migração
Copie e cole este código no SQL Editor:

```sql
-- Adicionar coluna 'demitido' na tabela funcionarios
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS demitido BOOLEAN DEFAULT FALSE;

-- Comentário na coluna
COMMENT ON COLUMN funcionarios.demitido IS 'Indica se o funcionário foi demitido. Funcionários demitidos não aparecem em processamentos ativos (escalas, folhas, relatórios)';

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_funcionarios_demitido ON funcionarios(demitido);

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'funcionarios' AND column_name = 'demitido';
```

### 4. Clique em "Run" (▶️)

### 5. Verificar Resultado
Você deve ver uma resposta similar a:
```
column_name | data_type | is_nullable | column_default
demitido    | boolean   | YES         | false
```

## ✅ Pronto!

Após executar com sucesso, o campo "Demitido?" já estará funcionando no formulário de funcionários!

## 🔧 Alternativa via Script (se preferir)

Se quiser usar o script Node.js:

```bash
# Certifique-se de que as variáveis de ambiente estão configuradas
# VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

node scripts/apply_demitido_migration.js
```

---

**🎯 Após aplicar a migração, teste o formulário de funcionários para ver o novo campo funcionando!**