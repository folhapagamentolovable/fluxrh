# Runbook de backup e restauração

## Escopo

Este procedimento cobre o banco PostgreSQL, Auth, migrations e os objetos do bucket privado `fluxrh-private`. Backups do banco preservam apenas os metadados de Storage; os arquivos precisam de cópia independente.

## Verificações periódicas

1. Confirmar o estado do serviço gerenciado com `npx supabase backups list --project-ref akdmobvbombhqvvglayn`.
2. Confirmar que migrations locais e remotas coincidem com `npx supabase migration list --linked`.
3. Exportar os objetos do bucket para armazenamento criptografado e de acesso restrito com `npx supabase storage cp --linked --recursive ss:///fluxrh-private <diretório-seguro>`.
4. Registrar data, responsável, tamanho, quantidade de objetos e hash do manifesto da exportação.
5. Nunca versionar dumps, objetos, senhas, tokens ou chaves S3 no Git.

## Estratégia no banco principal

O projeto `akdmobvbombhqvvglayn` é o único ambiente Supabase autorizado. A rotina periódica é, portanto, um ensaio **não destrutivo de prontidão de recuperação**: consulta backups, confere migrations e executa os testes remotos transacionais que terminam com rollback.

```powershell
./scripts/test-supabase-recovery-readiness.ps1
# Com Docker disponível, também executar o pgTAP remoto:
./scripts/test-supabase-recovery-readiness.ps1 -RunDatabaseTests
```

O procedimento nunca executa `pg_restore --clean`, `supabase db reset`, exclusão de objetos ou rollback da plataforma. Uma restauração real no banco principal somente pode ocorrer durante incidente ou janela de manutenção, depois de:

1. bloquear novas escritas da aplicação;
2. registrar o ponto de recuperação e o impacto esperado;
3. obter uma exportação adicional quando o banco ainda estiver acessível;
4. confirmar o backup gerenciado disponível no painel;
5. obter confirmação humana explícita para a restauração irreversível;
6. restaurar metadados e objetos do Storage conforme o manifesto;
7. executar `scripts/verify-supabase-restore.sql` e os testes RLS após a recuperação;
8. liberar escritas apenas após validar Auth, sessões, arquivos e contagens críticas.

## Critérios mínimos de aprovação

- organizações, usuários, vínculos, auditoria e metadados de arquivos restaurados;
- quantidade de objetos do Storage igual ao manifesto;
- nenhum acesso cruzado entre organizações;
- URLs antigas não reutilizadas como evidência de recuperação;
- todas as migrations presentes no histórico;
- tempos de recuperação e perda máxima de dados registrados.

## Estado do ambiente

Em 28 de agosto de 2026, o serviço gerenciado informou `WALG=true`, `PITR=false` e nenhum ponto temporal disponível pela CLI. As 15 migrations locais e remotas estão alinhadas. Os testes remotos 004–006 possuem execução anterior aprovada com rollback; uma nova execução via CLI requer Docker. Por decisão do projeto, não haverá ambiente Supabase temporário; nenhuma restauração destrutiva será simulada sobre dados ativos.
