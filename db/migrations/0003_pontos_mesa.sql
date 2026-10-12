-- Regra da mesa: todas as fichas usam 75 pontos de personagem (método cinematográfico).
update character
set dados = jsonb_set(jsonb_set(dados, '{metodo}', '"cinematografico"'), '{pontos}', '75'),
    version = version + 1,
    updated_at = now();
