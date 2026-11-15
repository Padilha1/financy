# Docker e Compose

É necessário apenas Docker com Compose em execução. O ambiente local usa PostgreSQL 17 em container e não depende de uma conta Neon.

```sh
docker compose up --build -d --wait
```

Abra **http://localhost:8080** e cadastre uma conta. Não é necessário instalar Node.js ou configurar `.env` para iniciar o ambiente completo.

## Serviços e persistência

- `db`: PostgreSQL 17 com banco `financy`, usuário `financy` e senha de desenvolvimento `financy_local`. A porta é publicada somente em `127.0.0.1:5433` para desenvolvimento com npm.
- `backend`: API Node.js de produção, como usuário `node`, sem porta publicada diretamente.
- `frontend`: React servido por Nginx sem root, acessível somente em `127.0.0.1:8080`.
- Volume `financy-postgres`: dados do PostgreSQL.
- Volume `financy-config`: chave JWT local, gerada uma vez em `/data/jwt-secret` quando não há `JWT_SECRET` explícito.

As credenciais fixas do banco são exclusivas do ambiente local. Não publique esse PostgreSQL na internet. No Neon, use as credenciais geradas pelo serviço e mantenha-as no ambiente do Render.

A API aguarda a saúde do PostgreSQL e aplica as migrações antes de aceitar tráfego; o frontend aguarda a saúde da API. As dependências e o cliente Prisma são instalados e gerados dentro das imagens Linux. `.env`, bancos anteriores e `node_modules` da máquina ficam fora do contexto de build.

## Endereços e CORS

```text
http://localhost:8080/          → frontend
http://localhost:8080/graphql   → Nginx → backend:4000/graphql
http://localhost:8080/health    → Nginx → backend:4000/health → PostgreSQL
```

O frontend Docker usa `VITE_BACKEND_URL=/graphql`. Nginx resolve `backend` dentro da rede Docker; esse hostname não é usado pelo navegador. As rotas React têm fallback para `index.html`.

Por padrão, o CORS permite localhost e 127.0.0.1 na porta de `WEB_PORT`. `Authorization` é encaminhado à API, e `X-Request-Id` é exposto para diagnóstico. O proxy sobrescreve `X-Forwarded-For` com o endereço recebido e a API usa `TRUST_PROXY=1`; sua porta não está exposta diretamente.

## Personalização opcional

Copie `.env.example` para `.env` na raiz:

```env
WEB_PORT=8080
PG_PORT=5433
LOG_LEVEL=info
JWT_SECRET=
FRONTEND_URL=
```

- `WEB_PORT`: porta da interface.
- `PG_PORT`: porta do PostgreSQL no loopback da máquina.
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` ou `silent`.
- `JWT_SECRET`: vazio gera e preserva uma chave no volume; se preencher, use pelo menos 32 caracteres e preserve entre reinícios.
- `FRONTEND_URL`: vazio permite as duas origens locais na porta configurada. Para outro endereço, informe origens completas separadas por vírgula, sem caminhos.

Esse arquivo configura o Compose. O desenvolvimento com npm usa `backend/.env` e `frontend/.env`. Se mudar `PG_PORT`, atualize a conexão local em `backend/.env` antes de usar npm.

```sh
docker compose up -d --wait           # Aplica configuração de runtime
docker compose up --build -d --wait   # Reconstrói após alterações de código
```

## Desenvolvimento com npm e somente o banco em Docker

```sh
docker compose up -d --wait db
npm ci
npm run setup
npm run dev
```

A conexão padrão em `backend/.env.example` aponta para esse banco em `127.0.0.1:5433`. Portanto, o modo npm e o Compose completo compartilham os dados quando usam essa configuração. Para isolamento, configure outro banco PostgreSQL. Se preferir Neon localmente, preencha `DATABASE_URL` e `DIRECT_URL` com suas URLs e não é necessário iniciar `db`.

## Operação

```sh
docker compose ps
docker compose logs -f backend
docker compose logs --tail 100 backend
docker compose stop
docker compose start
docker compose down
```

`down` preserva os volumes. **`docker compose down -v` apaga o PostgreSQL e a chave gerada**. Use backups consistentes do PostgreSQL (`pg_dump`/`pg_restore`) e guarde-os fora do Git.

Arquivos e volumes SQLite da versão anterior não são utilizados nem removidos. A migração de dados legados não é automática.

## Testes

```sh
npm run test:docker
```

Requer Node.js 22.12+ e Docker. Cria um projeto de nome aleatório, portas livres e volumes exclusivos; valida as rotas, os SVGs, o CORS, a API, os logs e a persistência após recriar a API. Ao final remove somente o projeto e os volumes criados pelo teste.

`npm test` usa outro PostgreSQL temporário no Docker e um schema aleatório. Opcionalmente, `TEST_DATABASE_URL` pode apontar para um banco PostgreSQL dedicado a testes; nunca é inferido de `DATABASE_URL`. Somente o schema aleatório criado pela suíte é removido ao final.

## Hospedagem

Esta configuração Compose é local. Para Render + Neon, use [DEPLOY_RENDER_NEON.md](DEPLOY_RENDER_NEON.md). A API hospedada recebe um `JWT_SECRET` fixo do ambiente e não precisa de disco persistente: os dados ficam no Neon. Os logs são documentados em [LOGGING.md](LOGGING.md).
