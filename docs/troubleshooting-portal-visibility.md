# Troubleshooting - Configurações do Portal do Funcionário

## Problema Identificado

O botão "Salvar Alterações" não está funcionando e as configurações de período não estão sendo atualizadas no Portal do Funcionário.

## Passos para Diagnóstico

### 1. Verificar se a Migração foi Aplicada

Execute no console do navegador (F12) na página de configurações:

```javascript
// Verificar se a tabela existe
const { data, error } = await supabase
  .from('portal_visibility_config')
  .select('*');
console.log('Dados da tabela:', data, 'Erro:', error);
```

### 2. Acessar Página de Teste

Acesse temporariamente: `/#/test-portal-visibility`

Esta página irá:
- Verificar se a tabela existe
- Testar as funções utilitárias
- Mostrar logs detalhados no console
- Permitir testar atualizações

### 3. Verificar Console do Navegador

Abra o console (F12) e procure por:
- Logs de "Buscando configurações de visibilidade..."
- Erros de SQL ou Supabase
- Logs de "Salvando configuração:"

### 4. Executar Migração Manualmente

Se a tabela não existir, execute no Supabase SQL Editor:

```sql
-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS portal_visibility_config (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(50) NOT NULL,
    mes_limite INTEGER NOT NULL,
    ano_limite INTEGER NOT NULL,
    meses_retroativos INTEGER NOT NULL DEFAULT 12,
    ativo BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados padrão
INSERT INTO portal_visibility_config (tipo_documento, mes_limite, ano_limite, meses_retroativos, ativo, observacoes) VALUES
('holerites', 11, 2025, 12, true, 'Exibir holerites dos últimos 12 meses até novembro/2025'),
('beneficios', 11, 2025, 12, true, 'Exibir recibos de benefícios dos últimos 12 meses até novembro/2025')
ON CONFLICT DO NOTHING;

-- Criar função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger
DROP TRIGGER IF EXISTS update_portal_visibility_config_updated_at ON portal_visibility_config;
CREATE TRIGGER update_portal_visibility_config_updated_at 
    BEFORE UPDATE ON portal_visibility_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 5. Testar Atualização Manual

No console do navegador:

```javascript
// Testar atualização direta
const { data, error } = await supabase
  .from('portal_visibility_config')
  .update({ 
    mes_limite: 10, 
    observacoes: 'Teste manual - ' + new Date().toISOString() 
  })
  .eq('tipo_documento', 'holerites')
  .select();

console.log('Resultado:', data, 'Erro:', error);
```

### 6. Verificar Permissões RLS

Se houver erro de permissão, execute no Supabase:

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'portal_visibility_config';

-- Se RLS estiver habilitado, criar política
CREATE POLICY "Admins podem gerenciar configurações do portal" ON portal_visibility_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );
```

## Soluções Possíveis

### Solução 1: Migração não Aplicada
- Execute a migração manualmente no SQL Editor do Supabase
- Verifique se não há erros de sintaxe

### Solução 2: Problema de Permissões
- Verifique se o usuário tem role 'admin'
- Configure políticas RLS se necessário

### Solução 3: Erro de JavaScript
- Verifique o console para erros de sintaxe
- Confirme se o Supabase client está configurado corretamente

### Solução 4: Cache do Navegador
- Limpe o cache do navegador
- Faça hard refresh (Ctrl+F5)

## Logs Esperados

Quando funcionando corretamente, você deve ver no console:

```
Buscando configurações de visibilidade...
Configurações carregadas: [array com 2 itens]
Iniciando salvamento das configurações: [array]
Salvando configuração: {objeto da configuração}
Dados para atualização: {dados limpos}
Resultado da atualização: {data: [...], error: null}
Todas as configurações foram salvas com sucesso
```

## Teste Final

Após aplicar as correções:

1. Acesse `/config-portal`
2. Altere um valor (ex: mês limite de 11 para 10)
3. Clique em "Salvar Alterações"
4. Verifique se aparece "Configurações salvas com sucesso!"
5. Recarregue a página e confirme se a alteração persistiu
6. Acesse o portal do funcionário e verifique se o período mudou

## Contato para Suporte

Se o problema persistir, forneça:
- Logs do console do navegador
- Resultado da página de teste
- Mensagens de erro específicas
- Versão do navegador utilizado