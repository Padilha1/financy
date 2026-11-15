# Publicação no Render com PostgreSQL no Neon

O repositório contém `render.yaml` para criar dois serviços: uma API Docker e um Static Site. O banco fica no Neon, fora dos containers e do filesystem efêmero do Render. Esta configuração foi preparada, mas nenhum recurso cloud foi criado ou publicado pelo código.

## 1. Criar o banco no Neon

1. Crie um projeto PostgreSQL no Neon.
2. No painel de conexão, copie a URL com **connection pooling** para `DATABASE_URL`.
3. Copie também a URL **direta**, sem o hostname `-pooler`, para `DIRECT_URL`.
4. Preserve as opções TLS fornecidas pelo Neon, como `sslmode=require`. Não desabilite a verificação TLS.

Exemplos ilustrativos, que precisam ser substituídos pelas conexões do seu projeto:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@ep-SEU-ENDPOINT-pooler.REGIAO.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://USUARIO:SENHA@ep-SEU-ENDPOINT.REGIAO.aws.neon.tech/neondb?sslmode=require
```

Essas URLs contêm senha. Cadastre-as como variáveis secretas no Render; não coloque no GitHub, no README, no frontend ou em screenshots. O frontend não acessa o banco diretamente.

A aplicação usa Prisma com o adaptador `@prisma/adapter-pg` e um pool de até cinco conexões. As migrações usam `DIRECT_URL`; quando essa variável está vazia, a CLI usa `DATABASE_URL`, útil no PostgreSQL local sem pooler.

## 2. Criar os serviços no Render

Conecte o repositório GitHub no Render e crie um **Blueprint** a partir do `render.yaml`. Os nomes sugeridos são `financy-api` e `financy-web`; o Render pode atribuir URLs diferentes caso esses nomes estejam ocupados.

Também é possível criar os serviços manualmente com os mesmos valores:

### API — Web Service

| Configuração                     | Valor                     |
| -------------------------------- | ------------------------- |
| Runtime                          | Docker                    |
| Dockerfile                       | `backend/Dockerfile`      |
| Docker context                   | Raiz do repositório (`.`) |
| Root Directory                   | Deixar vazio              |
| Health check                     | `/health`                 |
| Plano sugerido para demonstração | Free                      |

| Variável       | Valor                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL` | URL pooled do Neon                                                             |
| `DIRECT_URL`   | URL direta do mesmo banco Neon                                                 |
| `JWT_SECRET`   | Chave fixa aleatória com pelo menos 32 caracteres; o Blueprint gera esse valor |
| `NODE_ENV`     | `production`                                                                   |
| `HOST`         | `0.0.0.0`                                                                      |
| `PORT`         | `10000` ou a porta fornecida pelo Render                                       |
| `TRUST_PROXY`  | `1` para o proxy do Render, sem adicionar outro proxy/CDN na frente            |
| `FRONTEND_URL` | Origem HTTPS real do Static Site, sem caminho ou barra final                   |
| `LOG_LEVEL`    | `info`                                                                         |

Não configure `JWT_SECRET_FILE` nem volume persistente para a API no Render. O segredo é fornecido pelo ambiente; os dados persistem no Neon.

A inicialização aplica `prisma migrate deploy` antes de abrir o servidor. Isso dispensa o recurso de pre-deploy command, que não está incluído no plano Free. Se a migração falhar, a API não fica saudável. Consulte os eventos `database.migration.*` nos logs, sem publicar as conexões.

### Frontend — Static Site

| Configuração       | Valor                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Root Directory     | Deixar vazio                                                         |
| Build command      | `npm ci --include=dev --ignore-scripts && npm run build -w frontend` |
| Publish directory  | `frontend/dist`                                                      |
| `VITE_BACKEND_URL` | URL HTTPS real da API com `/graphql`                                 |
| Rewrite            | `/*` → `/index.html`, ação **Rewrite**                               |

O rewrite permite abrir ou atualizar diretamente `/transacoes`, `/categorias` e `/perfil`.

## 3. Conectar as URLs e configurar CORS

Exemplo com nomes ilustrativos:

```env
# Na API
FRONTEND_URL=https://financy-web.onrender.com

# No Static Site, antes de executar o build
VITE_BACKEND_URL=https://financy-api.onrender.com/graphql
```

Use as URLs reais exibidas no seu painel. Elas não são inferidas automaticamente pelo Blueprint: as variáveis marcadas com `sync: false` precisam ser preenchidas.

Caso o Blueprint solicite as origens antes de os serviços receberem suas URLs, preencha os endereços esperados e depois confirme/corrija os valores reais antes de testar o login. Atualize/reinicie a API ao alterar `FRONTEND_URL`; refaça o build do Static Site ao alterar `VITE_BACKEND_URL`.

`FRONTEND_URL` aceita várias origens separadas por vírgula. Informe protocolo, hostname e porta quando necessária. Não use `*`, não inclua `/graphql` e não coloque credenciais nessa variável. Em produção, prefira somente os domínios que utilizará.

## 4. Validar a publicação

1. Confira `/health`: deve retornar `{"status":"ok"}`.
2. Abra o Static Site, cadastre uma conta e crie uma categoria e uma transação.
3. Atualize uma rota interna para confirmar o rewrite.
4. Faça logout/login e confirme o isolamento de uma segunda conta.
5. Reinicie a API e confirme que os dados continuam disponíveis e que a chave JWT não mudou.
6. Confira os logs JSON e o `X-Request-Id` em uma requisição GraphQL.

O banco Neon começa vazio. Esta adaptação não importa automaticamente dados de arquivos SQLite anteriores; esses arquivos e os antigos volumes não são apagados. O histórico da migração SQLite foi preservado em `docs/legacy/`, e somente as migrações PostgreSQL de `backend/prisma/migrations/` são aplicadas.

## Limites dos planos gratuitos

O Web Service Free do Render pode suspender por inatividade; a primeira chamada pode demorar enquanto a API inicia e reaplica a checagem de migrações. Os dados permanecem no Neon. Consulte os limites de armazenamento, processamento, tráfego e inatividade dos planos antes da publicação; a disponibilidade dos planos pode mudar.

- [Render: serviços gratuitos](https://render.com/docs/free)
- [Render: referência do Blueprint](https://render.com/docs/blueprint-spec)
- [Neon: planos](https://neon.com/pricing)
- [Prisma: PostgreSQL e conexões pooled/diretas](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
