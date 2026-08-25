-- Vincular o usuário cliente "Teste 1" ao posto "Residencial Campo das Figueiras"
INSERT INTO public.client_postos (user_id, posto_id) 
VALUES ('96ac35d1-d7ee-4b71-a721-22f7a930eca1', '7e081809-604a-4935-937f-b04d4cc7a4f8')
ON CONFLICT (user_id, posto_id) DO NOTHING;