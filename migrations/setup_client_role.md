# SQL para adicionar a role CLIENT ao sistema

Execute este SQL no seu Supabase (SQL Editor) na ordem apresentada.

## 1. Adicionar 'client' ao enum app_role

```sql
-- Adicionar 'client' ao enum existente
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
```

## 2. Criar tabela client_postos

```sql
-- Tabela de vínculo entre usuários client e postos de trabalho
CREATE TABLE IF NOT EXISTS public.client_postos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    posto_id UUID NOT NULL REFERENCES public.postos_trabalho(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, posto_id)
);

-- Habilitar RLS
ALTER TABLE public.client_postos ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_postos_user_id ON public.client_postos(user_id);
CREATE INDEX IF NOT EXISTS idx_client_postos_posto_id ON public.client_postos(posto_id);
```

## 3. Função auxiliar para verificar se é client de um posto

```sql
-- Função para verificar se o usuário é client de um posto específico
CREATE OR REPLACE FUNCTION public.is_client_of_posto(_user_id UUID, _posto_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.client_postos
        WHERE user_id = _user_id
          AND posto_id = _posto_id
    )
$$;

-- Função para obter postos do client
CREATE OR REPLACE FUNCTION public.get_client_postos(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT posto_id
    FROM public.client_postos
    WHERE user_id = _user_id
$$;
```

## 4. Políticas RLS para client_postos

```sql
-- Admins podem ver e gerenciar todos os vínculos
CREATE POLICY "Admins manage client_postos"
ON public.client_postos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clients podem ver apenas seus próprios vínculos
CREATE POLICY "Clients view own postos"
ON public.client_postos
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

## 5. Políticas RLS para tabelas que o client pode acessar (READ-ONLY)

```sql
-- Client pode ler escalas dos seus postos
CREATE POLICY "Clients read escala_mensal"
ON public.escala_mensal
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'client')
    AND posto_id IN (SELECT public.get_client_postos(auth.uid()))
);

-- Client pode ler regras de escalas (tabela de referência)
CREATE POLICY "Clients read regras_escalas"
ON public.regras_escalas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'client'));

-- Client pode ler alertas de férias dos funcionários dos seus postos
CREATE POLICY "Clients read funcionarios for vacation alerts"
ON public.funcionarios
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'client')
    AND posto_trabalho_id IN (SELECT public.get_client_postos(auth.uid()))
);
```

## 6. Verificação

```sql
-- Verificar se o enum foi atualizado
SELECT unnest(enum_range(NULL::public.app_role));

-- Verificar se a tabela foi criada
SELECT * FROM public.client_postos LIMIT 1;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE policyname LIKE '%client%';
```

## 7. Exemplo: Atribuir role client a um usuário

```sql
-- Substituir pelo UUID real do usuário
INSERT INTO public.user_roles (user_id, role)
VALUES ('UUID_DO_USUARIO', 'client');

-- Vincular ao posto de trabalho
INSERT INTO public.client_postos (user_id, posto_id)
VALUES ('UUID_DO_USUARIO', 'UUID_DO_POSTO');
```
