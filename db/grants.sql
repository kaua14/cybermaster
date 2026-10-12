-- Reaplicado a cada migração. O papel da aplicação (cm_app) não é dono de nada.
revoke create on schema public from public;
grant usage on schema public to cm_app;
grant select, insert, update, delete on all tables in schema public to cm_app;
grant usage, select on all sequences in schema public to cm_app;

-- A aplicação só LÊ a senha do mestre. Criar ou trocar é tarefa do script de operação.
revoke all on master_credential from cm_app;
grant select on master_credential to cm_app;

revoke all on schema_migrations from cm_app;
