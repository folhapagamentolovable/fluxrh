// Os testes de integração legados exercitam deliberadamente os repositórios
// em memória. Produção usa Supabase por padrão e nunca recorre a essa massa.
process.env.FLUXRH_PERSISTENCE ??= "memory";
