# Cybermaster

Hub para uma mesa de **Cyberpunk 2020** (edição Devir, PT-BR, 1996): fichas dos jogadores e ferramentas de ajuda ao mestre. Roda no seu próprio servidor, sem serviço pago.

> Ferramenta de fã, baseada em Cyberpunk 2020 © R. Talsorian Games. Não substitui o livro.

## Estado

| Etapa | Situação |
|---|---|
| 1. Esqueleto, banco, autenticação | pronta |
| 2. Ficha na tela | pronta |
| 3. PDF editável | pronta |
| 4. Regras, NPCs e ganchos | a fazer |
| 5. Assistente | a fazer |
| 6. Polimento | a fazer |

## Subir com Docker Compose

1. Copie `.env.example` para `.env` e troque as duas senhas de banco:
   ```sh
   cp .env.example .env
   openssl rand -hex 24   # rode duas vezes, uma para cada senha
   ```
2. Suba:
   ```sh
   docker compose up -d --build
   ```
   O serviço `migrate` cria as tabelas e o papel `cm_app` antes de a aplicação subir.
3. Grave a senha do mestre (próxima seção).
4. Abra `https://seu-servidor/login`.

### HTTPS

O cookie de sessão sai com `Secure`, então o navegador só o guarda em HTTPS (ou em `localhost`). Ponha um proxy reverso com TLS na frente (Caddy é o mais simples) e defina `TRUST_PROXY=1` no `.env`.

Para jogar só na rede local sem TLS, dá para definir `COOKIE_SECURE=0`. Nesse caso a sessão trafega sem criptografia.

## Senha do mestre

Existe uma única senha de mestre. Ela **não está** no código, no `.env` nem em nenhum arquivo do repositório. Quem administra o servidor a grava direto no banco com o script `scripts/set-master-password`, que:

- lê a senha de um prompt oculto (ou de stdin), **nunca de argumento**;
- exige pelo menos 12 caracteres;
- gera o hash argon2id e grava na linha única de `master_credential`;
- encerra as sessões de mestre abertas.

A aplicação usa o papel `cm_app`, que só tem `SELECT` nessa tabela. Ela consegue conferir a senha, mas não consegue criá-la nem trocá-la. Não existe tela nem rota para isso.

**Dentro do container** (prompt oculto, pede a senha duas vezes):

```sh
docker compose run --rm ops scripts/set-master-password
```

**Por stdin** (útil em automação; `-T` desliga o TTY):

```sh
docker compose run --rm -T ops scripts/set-master-password < arquivo-com-a-senha
```

Para trocar a senha, rode o mesmo comando de novo. Enquanto a senha não for gravada, o login de mestre responde "Senha do mestre ainda não configurada".

O serviço `ops` só existe no perfil `ops`. Ele é o único, junto com `migrate`, que recebe a credencial administrativa do banco. O serviço `app` nunca a recebe.

## Jogadores

1. O mestre entra em **Jogadores** e convida cada um pelo nome.
2. O sistema mostra um código de uso único (vale 7 dias). Ele aparece só essa vez.
3. O jogador abre **Primeiro acesso** na tela de login, digita o código e cria a própria senha (mínimo 10 caracteres).

O jogador troca a senha em **Conta**. Se alguém esquecer a senha, o mestre tem duas saídas em **Jogadores**:

- **Senha temporária**: o sistema gera uma senha que o mestre passa ao jogador. Ela vale 24 horas e só serve para entrar e criar uma senha nova; até trocar, o jogador não vê mais nada.
- **Invalidar senha**: a senha antiga deixa de valer e um novo código de convite é gerado.

Nos dois casos o jogador sai de todas as sessões. O mestre nunca vê a senha que o jogador escolhe.

## Fichas

- **Regra da mesa: 75 pontos de personagem para todos**, distribuídos entre os nove atributos (2 a 10 cada). O valor fica em `src/rules/mesa.ts`; o servidor aplica em toda gravação, então ninguém muda pela ficha.
- Contadores de pontos: atributos, 40 pontos de carreira nas Perícias Profissionais da classe e REF + INT pontos opcionais.
- **Concluir criação** fixa atributos e pontos de perícia. Depois disso, o jogador só sobe perícias com PE. O mestre pode reabrir a criação.
- **PE por perícia**, como no livro: o mestre dá PE na perícia usada (experiência, professor ou estudo até +2) e o jogador clica em **Subir** quando os PE acumulados pagam o próximo nível. Tudo vai para o histórico da ficha.
- Trilha de ferimentos clicável com estado, efeitos em REF/INT/AuCon e os testes de atordoamento e morte já calculados.
- Toda regra mostra a página do livro. As que não deu para confirmar aparecem com "conferir".

## Segurança

- Senhas e códigos de convite: só o hash fica no banco (argon2id para senhas, SHA-256 para códigos e tokens de sessão).
- Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax`, prefixo `__Host-`, validade de 7 dias.
- CSRF: toda mutação exige a mesma origem (`Origin`) e o cabeçalho `x-csrf-token` da sessão.
- Login com limite por IP e por conta: a partir da 3ª falha seguida, a espera dobra a cada erro (1 s, 2 s, 4 s… até 15 min). A mesma mensagem vale para nome inexistente e senha errada.
- Validação com zod em todas as rotas. Permissão conferida no servidor em todas as rotas.
- CSP com nonce por requisição, `frame-ancestors 'none'`, `nosniff` e HSTS.

## PDF da ficha

Cada ficha tem um PDF A4 de uma página, preto e branco, com campos preenchíveis (AcroForm).

- **Baixar PDF** e **Imprimir** (abre o PDF no navegador). O PDF fica guardado em `storage/fichas/` e é refeito alguns segundos depois de cada mudança na ficha, ou na hora do download se estiver velho. O banco continua sendo a fonte da verdade.
- **Importar PDF editado**: o jogador edita o PDF num leitor (nome, idade, atributos, armas, armadura, cyberware, dinheiro, equipamento, história, caixas de dano) e envia de volta. O app mostra o que muda e só grava depois de **Aplicar mudanças**. Valem as mesmas regras da tela: com a criação concluída, mudança de atributo no PDF aparece como ignorada.
- Perícias e derivados aparecem no PDF só para leitura: perícia sobe pelo app, com PE.
- Segurança do upload: no máximo 2 MB, precisa começar com `%PDF-`, precisa ser um PDF gerado pelo app para aquela ficha. O servidor lê apenas os valores dos campos: scripts, anexos e o resto do arquivo são ignorados, e o arquivo enviado não é guardado.

Com Docker, os PDFs ficam no volume `storage`.

## Desenvolvimento

Requer Node 22+ e um Postgres 15+.

```sh
npm ci
# banco local: crie um banco vazio e rode as migrações com um usuário administrador
DATABASE_ADMIN_URL=postgres://postgres:SENHA@127.0.0.1:5432/cybermaster DB_APP_PASSWORD=dev npm run db:migrate
DATABASE_ADMIN_URL=postgres://postgres:SENHA@127.0.0.1:5432/cybermaster scripts/set-master-password
DATABASE_URL=postgres://cm_app:dev@127.0.0.1:5432/cybermaster npm run dev
```

O `npm run dev` sobe o `server.mjs`, um servidor HTTP fino em volta do Next. Ele existe para entregar às rotas o IP real do cliente, que o limite de tentativas usa.

### Testes

```sh
npm test                 # regras e utilitários (Vitest)
TEST_DATABASE_ADMIN_URL=postgres://postgres:SENHA@127.0.0.1:5432/postgres npm run test:api
```

Os testes de API criam um banco descartável, aplicam as migrações, rodam e apagam o banco no fim. Eles cobrem:

- a restrição de linha única em `master_credential`;
- a ausência de permissão de escrita do papel `cm_app` nessa tabela;
- o fluxo de convite e o login;
- as mensagens iguais de erro;
- o limite de tentativas;
- CSRF, origem e permissões de mestre e jogador.

## Estrutura

```
db/migrations/      SQL das migrações
db/grants.sql       permissões do papel cm_app (reaplicadas a cada migração)
scripts/            migrate.mjs, set-master-password
server.mjs          servidor HTTP (IP do cliente)
src/app/            páginas e rotas da API (Next.js App Router)
src/server/         banco, autenticação, sessão, limite de tentativas
src/components/     componentes visuais e ilustrações SVG
tests/              unit/ e api/
```
