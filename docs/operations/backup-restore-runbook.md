# Runbook de backup e restauração

## Escopo

Este procedimento cobre o banco PostgreSQL, Auth, migrations e os objetos do bucket privado `fluxrh-private`. Backups do banco preservam apenas os metadados de Storage; os arquivos precisam de cópia independente.

## Verificações periódicas

1. Confirmar o estado do serviço gerenciado com `npx supabase backups list --project-ref akdmobvbombhqvvglayn`.
2. Confirmar que migrations locais e remotas coincidem com `npx supabase migration list --linked`.
3. Exportar os objetos do bucket para armazenamento criptografado e de acesso restrito com `npx supabase storage cp --linked --recursive ss:///fluxrh-private <diretório-seguro>`.
4. Registrar data, responsável, tamanho, quantidade de objetos e hash do manifesto da exportação.
5. Nunca versionar dumps, objetos, senhas, tokens ou chaves S3 no Git.

## Ensaio de restauração

O ensaio nunca deve usar o projeto DEV ou produção como destino. Criar um projeto Supabase temporário e isolado, restaurar o backup físico ou lógico nele e depois:

1. conferir migrations e extensões;
2. conferir usuários do Auth e vínculos organizacionais;
3. conferir contagens das tabelas críticas;
4. restaurar o bucket privado separadamente;
5. validar RLS, sessões, downloads assinados e smoke tests;
6. rotacionar credenciais do projeto temporário;
7. destruir o projeto temporário somente após registrar as evidências do teste.

## Critérios mínimos de aprovação

- organizações, usuários, vínculos, auditoria e metadados de arquivos restaurados;
- quantidade de objetos do Storage igual ao manifesto;
- nenhum acesso cruzado entre organizações;
- URLs antigas não reutilizadas como evidência de recuperação;
- todas as migrations presentes no histórico;
- tempos de recuperação e perda máxima de dados registrados.

## Estado do ambiente

Em 27 de agosto de 2026, o serviço gerenciado informou `WALG=true` e `PITR=false`. A CLI local não produziu dump lógico porque esse comando exige Docker, deliberadamente fora do fluxo deste repositório. O ensaio completo permanece pendente até existir um projeto Supabase temporário autorizado; nenhuma restauração destrutiva foi executada no DEV.
