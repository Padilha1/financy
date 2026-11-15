# Financy

Aplicação fullstack de gerenciamento de finanças pessoais, desenvolvida para o desafio da pós-graduação. Permite criar uma conta e organizar receitas e despesas por categorias, com acesso exclusivo aos dados do usuário autenticado.

O projeto contém a solução do **back-end em `backend/`** e do **front-end em `frontend/`**, conforme a estrutura solicitada. A comunicação entre as duas aplicações utiliza GraphQL.

## Guia rápido para avaliação

Após clonar ou baixar este repositório, abra um terminal na raiz do projeto, onde estão `package.json` e `compose.yaml`. Escolha **uma** das opções de execução:

| Opção                 | Pré-requisitos                 | Endereço da aplicação                          |
| --------------------- | ------------------------------ | ---------------------------------------------- |
| Docker Compose        | Docker com Compose em execução | [http://localhost:8080](http://localhost:8080) |
| Desenvolvimento local | Node.js 22.12+ e npm 10+       | [http://127.0.0.1:5173](http://127.0.0.1:5173) |

**Docker é a opção mais direta para avaliar a aplicação completa.** Não exige Node.js instalado, configuração manual de `.env`, conta em serviço externo ou servidor de banco de dados instalado na máquina. O Compose inclui o PostgreSQL.

O banco começa vazio. Crie uma conta em **Criar conta**, cadastre uma categoria e registre a primeira transação. A conta de demonstração descrita adiante é opcional e exclusiva da execução local com npm.

## 1. Execução com Docker Compose

### Iniciar

```sh
docker compose up --build -d --wait
```

No primeiro uso, o Docker baixa as imagens e instala as dependências; esse processo pode levar alguns minutos. Abra [http://localhost:8080](http://localhost:8080) quando o comando terminar.

| Recurso                            | Endereço                                                     |
| ---------------------------------- | ------------------------------------------------------------ |
| Interface                          | [http://localhost:8080](http://localhost:8080)               |
| Endpoint GraphQL                   | `http://localhost:8080/graphql`                              |
| Saúde da API e conexão com o banco | [http://localhost:8080/health](http://localhost:8080/health) |

O Compose inicia a API Node.js e o frontend de produção servido por Nginx. As migrações são aplicadas automaticamente, e o frontend aguarda a API ficar saudável. O segredo JWT é gerado no primeiro uso e preservado no volume do banco.

### Consultar estado, logs e encerrar

```sh
docker compose ps
docker compose logs -f backend
docker compose down
```

`docker compose down` encerra os serviços e **preserva os dados**. Para iniciar novamente, execute o comando de inicialização. Os volumes guardam o PostgreSQL e a chave JWT; recriar os containers não apaga os registros nem troca a chave.

> `docker compose down -v` remove o volume e apaga o banco e a chave gerada. Não utilize essa opção para uma parada normal.

### Alterar a porta

A configuração é opcional. Copie `.env.example` para `.env` **na raiz do repositório**, altere `WEB_PORT`, por exemplo para `8081`, e execute novamente:

```sh
docker compose up -d --wait
```

As origens CORS locais acompanham a porta configurada quando `FRONTEND_URL` está vazio. A porta publicada fica vinculada ao loopback da máquina; esta configuração não publica a aplicação na internet.

Mais detalhes: [guia Docker](docs/DOCKER.md).

## 2. Execução local com Node.js

Com Node.js 22.12+ e npm 10+ instalados, inicie o PostgreSQL local e execute na raiz:

```sh
docker compose up -d --wait db
npm ci
npm run setup
npm run dev
```

O `setup`:

1. Cria `backend/.env` e `frontend/.env` a partir dos exemplos, caso ainda não existam.
2. Gera um segredo JWT aleatório para o novo ambiente local.
3. Gera o cliente Prisma.
4. Aplica as migrações versionadas no PostgreSQL configurado.

Se preferir um PostgreSQL já existente ou o Neon, configure `DATABASE_URL` e `DIRECT_URL` em `backend/.env` e dispense o primeiro comando Docker.

Arquivos `.env` existentes são preservados. Se os exemplos tiverem sido copiados manualmente antes do setup, é necessário preencher `JWT_SECRET` com pelo menos 32 caracteres.

| Recurso          | Endereço                                                     |
| ---------------- | ------------------------------------------------------------ |
| Frontend Vite    | [http://127.0.0.1:5173](http://127.0.0.1:5173)               |
| Endpoint GraphQL | `http://localhost:4000/graphql`                              |
| Saúde da API     | [http://localhost:4000/health](http://localhost:4000/health) |

A conexão local padrão usa o PostgreSQL do Compose em `127.0.0.1:5433`. Nessa configuração, npm e Docker compartilham os dados; é possível usar outro banco pela variável `DATABASE_URL`. Arquivos SQLite da versão anterior não são utilizados nem apagados. Para encerrar os servidores de desenvolvimento, pressione `Ctrl+C` no terminal.

### Dados de demonstração opcionais

Após o setup, em outro terminal na raiz:

```sh
npm run demo
```

O comando cria uma conta com **8 categorias e 12 transações fictícias**:

| Campo  | Valor                |
| ------ | -------------------- |
| E-mail | `demo@financy.local` |
| Senha  | `Financy2026!`       |

Se a conta já existir, seus dados atuais são preservados. A demonstração não é criada automaticamente, não é uma credencial administrativa e é instalada no banco indicado por `backend/.env`; com a conexão local padrão, também fica visível no Compose completo. Contas cadastradas pela interface sempre começam vazias.

## 3. Funcionalidades e requisitos atendidos

| Requisito                                  | Implementação                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Criar conta e fazer login                  | Formulários integrados às mutations GraphQL, com autenticação JWT                 |
| Gerenciar apenas os próprios dados         | Consultas e alterações limitadas ao usuário autenticado na API                    |
| Criar, listar, editar e excluir transações | API e interface com categoria, descrição, data, tipo e valor                      |
| Criar, listar, editar e excluir categorias | API e interface com título, descrição opcional, cor e ícone                       |
| TypeScript no backend e frontend           | Configuração estrita nos dois projetos                                            |
| GraphQL                                    | Schema TypeGraphQL com Apollo Server e consumo pelo frontend                      |
| Prisma e PostgreSQL                        | Alternativa PostgreSQL permitida pelo enunciado, com Prisma e migração versionada |
| React e Vite sem framework fullstack       | SPA com React Router                                                              |
| Layout baseado no Figma                    | Style Guide, fonte Inter, cores, componentes e SVGs originais da marca            |
| Variáveis de ambiente documentadas         | `.env.example` na raiz e em cada aplicação                                        |
| CORS habilitado                            | Lista configurável de origens no backend                                          |

O frontend também utiliza Tailwind CSS v4, TanStack Query, React Hook Form e Zod. A interface se adapta a desktop e mobile, com estados de carregamento, erro e listas vazias.

### Páginas

| Rota          | Comportamento                                            |
| ------------- | -------------------------------------------------------- |
| `/`           | Login para visitante; dashboard para usuário autenticado |
| `/cadastro`   | Criação de conta                                         |
| `/transacoes` | Listagem, filtros, paginação e ações de transações       |
| `/categorias` | Listagem e ações de categorias                           |
| `/perfil`     | Consulta do perfil, alteração do nome e saída da conta   |

A criação e a edição de transações e categorias utilizam dialogs. O dashboard exibe saldo histórico, receitas e despesas do mês atual e as transações mais recentes.

### Roteiro sugerido de avaliação

1. **Cadastrar e autenticar:** crie uma conta com e-mail válido e senha de pelo menos 8 caracteres.
2. **Categorias:** cadastre uma categoria, selecione ícone e cor, edite-a e confira a atualização na lista.
3. **Transações:** registre uma receita e uma despesa, edite seus dados e verifique os totais do dashboard.
4. **Consulta:** teste busca por descrição, filtros por tipo, categoria e mês e, com mais de 10 registros, a paginação.
5. **Exclusão e vínculos:** exclua uma transação. Uma categoria com transações vinculadas só pode ser excluída após remover ou reclassificar esses registros.
6. **Isolamento:** saia da conta e crie outro usuário; os registros da primeira conta não devem aparecer. Os testes da API também verificam tentativas de alterar registros de outra conta por identificador.
7. **Perfil e responsividade:** altere o nome, faça logout e confira a interface em uma viewport de celular.

## 4. Tecnologias e organização

| Camada                   | Tecnologias                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| API                      | Node.js, TypeScript, Express, Apollo Server 5 e TypeGraphQL 2    |
| Persistência             | Prisma 7, PostgreSQL e adaptador pg                              |
| Autenticação e validação | JWT, bcrypt e Zod                                                |
| Frontend                 | React 19, TypeScript, Vite 7 e React Router                      |
| Dados e formulários      | TanStack Query, graphql-request, React Hook Form e Zod           |
| Interface                | Tailwind CSS v4, Radix Dialog, Lucide e Inter servida localmente |
| Operação                 | Docker Compose, Nginx, Pino e GitHub Actions                     |

```text
.
├── backend/
│   ├── docker/           # Inicialização do container e migrações
│   ├── prisma/           # Schema e migrações PostgreSQL
│   ├── src/              # Schema GraphQL, resolvers, JWT, validação e logs
│   ├── tests/            # Testes de integração e logging
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── docker/           # Nginx: arquivos estáticos e proxy da API
│   ├── public/brand/     # SVGs originais exportados do Figma
│   ├── src/components/   # Componentes reutilizáveis e dialogs
│   ├── src/pages/        # Páginas da aplicação
│   ├── .env.example
│   └── Dockerfile
├── scripts/              # Setup local e teste automatizado do Compose
├── docs/                 # Guias de execução, logs e validação
├── .github/workflows/    # Integração contínua
├── .env.example          # Personalizações opcionais do Compose
├── compose.yaml
└── package-lock.json
```

### Fluxo da aplicação

No desenvolvimento local, o React consulta o endpoint GraphQL da API. No Docker, o Nginx serve o frontend e encaminha `/graphql` à API na rede interna:

```text
Navegador → Nginx :8080 → API Node.js :4000 → Prisma → PostgreSQL
               └──────→ arquivos do frontend
```

O backend valida os inputs e o usuário autenticado antes de acessar ou alterar os registros. O frontend utiliza TanStack Query para cache e atualização das consultas após mutations.

## 5. Regras de negócio e proteção de dados

- Receitas usam `INCOME`; despesas usam `EXPENSE`.
- Valores são armazenados como **centavos inteiros e positivos**. Por exemplo, `8990` representa R$ 89,90. O tipo da transação determina sua participação no saldo.
- Cada transação tem uma categoria pertencente ao mesmo usuário.
- O valor permitido por transação vai de R$ 0,01 a R$ 1.000.000,00.
- Datas usam `YYYY-MM-DD`, com validação de calendário, entre 1900 e 2100.
- Títulos de categorias são únicos por usuário. Categorias com transações vinculadas têm a exclusão bloqueada.
- O saldo considera todo o histórico. Receitas e despesas do dashboard consideram o mês atual; a lista de transações inclui todos os períodos até que um filtro seja aplicado.
- Senhas recebem hash bcrypt com custo 12; o hash não é disponibilizado no GraphQL.
- Tokens JWT expiram em 7 dias. “Lembrar de mim” usa `localStorage`; desmarcado, usa `sessionStorage`. O logout e sessões inválidas limpam o acesso e o cache do cliente.
- O servidor inclui limite de requisições, limite de profundidade GraphQL e restrição de tamanho do payload. A introspecção GraphQL fica desabilitada em produção.
- Logs contêm metadados técnicos selecionados, sem bodies, queries, tokens, e-mails ou descrições financeiras. O header `X-Request-Id` correlaciona eventos HTTP e GraphQL.

## 6. Variáveis de ambiente e CORS

Os exemplos estão versionados; os `.env` reais, o banco e os segredos ficam fora do Git e do contexto de build Docker.

### Desenvolvimento local

| Arquivo         | Variável           | Finalidade / padrão                                                  |
| --------------- | ------------------ | -------------------------------------------------------------------- |
| `backend/.env`  | `JWT_SECRET`       | Segredo de pelo menos 32 caracteres; gerado pelo setup               |
| `backend/.env`  | `JWT_SECRET_FILE`  | Somente Compose: arquivo persistente quando não há segredo explícito |
| `backend/.env`  | `DATABASE_URL`     | Conexão PostgreSQL; pooled no Neon                                   |
| `backend/.env`  | `DIRECT_URL`       | URL direta para migrações no Neon; vazia usa `DATABASE_URL`          |
| `backend/.env`  | `PORT`             | Porta da API; `4000`                                                 |
| `backend/.env`  | `HOST`             | Interface de escuta; `127.0.0.1`                                     |
| `backend/.env`  | `FRONTEND_URL`     | Origens permitidas pelo CORS, separadas por vírgula                  |
| `backend/.env`  | `NODE_ENV`         | `development`, `test` ou `production`                                |
| `backend/.env`  | `TRUST_PROXY`      | `0` para acesso direto à API                                         |
| `backend/.env`  | `LOG_LEVEL`        | `debug`, `info`, `warn`, `error` ou `silent`; padrão `info`          |
| `frontend/.env` | `VITE_BACKEND_URL` | Endpoint GraphQL; `http://localhost:4000/graphql`                    |

Por padrão, o CORS local permite:

```env
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
```

Ao alterar o endereço do frontend, atualize essa lista e reinicie a API. Cada origem deve conter protocolo, hostname e porta quando necessária, sem caminho. `localhost` e `127.0.0.1` são origens diferentes.

### Docker Compose

O `.env` opcional **da raiz** controla `WEB_PORT`, `PG_PORT`, `LOG_LEVEL`, `JWT_SECRET` e `FRONTEND_URL`. Ele não substitui os `.env` usados no desenvolvimento local.

No Compose, o frontend usa `/graphql`, no mesmo endereço da interface. A API permite as origens locais da porta publicada, usa `HOST=0.0.0.0` dentro do container e confia em um único proxy (`TRUST_PROXY=1`). Sua porta interna não é publicada na máquina.

Variáveis `VITE_*` são públicas e incorporadas ao bundle durante o build. Não devem conter segredos. CORS controla o acesso do navegador entre origens; a autorização aos dados continua sendo feita na API por JWT e vínculo com o usuário.

## Publicação no Render e Neon

O arquivo `render.yaml` prepara uma API Docker no plano Free e um Static Site. O PostgreSQL fica no Neon, usando `DATABASE_URL` com pooling para a aplicação e `DIRECT_URL` para migrações. A API recebe `JWT_SECRET` fixo no ambiente, sem disco local. É necessário informar as conexões do banco e as URLs reais dos serviços para configurar o CORS e o frontend. Nenhuma credencial cloud está incluída.

Siga o [guia de publicação Render + Neon](docs/DEPLOY_RENDER_NEON.md). Arquivos SQLite anteriores e seus dados não são importados automaticamente.

## 7. GraphQL

Queries disponíveis: `me`, `categories`, `transactions` e `summary`.

Mutations disponíveis: `register`, `login`, `updateProfile`, `createCategory`, `updateCategory`, `deleteCategory`, `createTransaction`, `updateTransaction` e `deleteTransaction`.

### Autenticação

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      id
      name
      email
    }
  }
}
```

Forneça `email` e `password` em `input`. Nas operações privadas, envie o token retornado no header:

```http
Authorization: Bearer <token>
```

### Consulta de transações

```graphql
query Transactions($filter: TransactionFilter, $page: Int, $pageSize: Int) {
  transactions(filter: $filter, page: $page, pageSize: $pageSize) {
    total
    items {
      id
      description
      amount
      type
      date
      category {
        id
        name
        color
        icon
      }
    }
  }
}
```

Exemplo de variáveis:

```json
{
  "filter": {
    "month": "2026-11",
    "type": "EXPENSE"
  },
  "page": 1,
  "pageSize": 10
}
```

Os filtros também aceitam `search` e `categoryId`. A paginação começa em 1 e aceita de 1 a 100 itens por página. A interface utiliza 10 itens por página.

Em desenvolvimento, a introspecção está habilitada para consultar o schema com um cliente GraphQL. No Docker, `NODE_ENV=production` desabilita a introspecção, mas as operações da aplicação continuam disponíveis.

## 8. Testes e verificação

Com as dependências instaladas e o setup executado:

```sh
npm run typecheck
npm test
npm run build
npm run format:check
```

| Comando                | O que verifica                                                      |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run typecheck`    | Tipagem TypeScript dos dois projetos                                |
| `npm test`             | Integração GraphQL/PostgreSQL e proteção dos logs                   |
| `npm run build`        | Compilação do backend e bundle de produção do frontend              |
| `npm run format:check` | Formatação dos arquivos                                             |
| `npm run test:docker`  | Build e funcionamento completo do Compose; exige Docker em execução |

A suíte Node reporta **14 testes**, incluindo o teste agregador. São cobertos autenticação, hash de senha, JWT inválido, operações privadas, CRUD, isolamento entre usuários, validação de dados, filtros, paginação, totais, vínculos e logs HTTP/GraphQL sem dados sensíveis. A suíte usa PostgreSQL temporário no Docker ou um schema aleatório em `TEST_DATABASE_URL`, se definido; somente os recursos de teste são removidos ao final. Docker é necessário para o banco temporário padrão.

O teste Docker usa nome de projeto, porta e volume exclusivos. Além do fluxo da aplicação, verifica CORS, rotas SPA, correlação dos logs e persistência do banco e da chave JWT após recriar a API. Ao terminar, remove apenas os containers, a rede e o volume desse projeto temporário.

O workflow em `.github/workflows/ci.yml` configura as verificações da aplicação e um job separado para Docker. Ele não publica imagens nem executa deploy. O registro da validação local e seus limites está em [docs/VALIDATION.md](docs/VALIDATION.md).

## 9. Comandos adicionais

```sh
npm run db:studio -w backend   # Inspeciona o banco local com Prisma Studio
npm run format                # Formata o projeto
```

Para conferir o build de produção sem Docker, primeiro execute `npm run build`. Depois, em terminais separados:

```sh
npm run start -w backend
```

```sh
npm run preview -w frontend
```

O preview usa a porta 4173. Antes de iniciar a API, acrescente `http://127.0.0.1:4173` a `FRONTEND_URL` em `backend/.env`.

## 10. Solução de problemas

| Situação                                        | Verificação                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Docker não conecta ao daemon                    | Inicie o Docker Desktop ou o serviço Docker antes do Compose                                                         |
| Porta 8080 ocupada                              | Altere `WEB_PORT` no `.env` da raiz e recrie os serviços                                                             |
| API não ficou saudável no Compose               | Consulte `docker compose ps` e `docker compose logs --tail 100 backend`; confira configuração e permissões do volume |
| Erro de CORS no desenvolvimento local           | Confira protocolo, hostname e porta em `FRONTEND_URL` e reinicie a API                                               |
| Banco/tabelas ausentes no desenvolvimento local | Execute `npm run setup` na raiz                                                                                      |
| Erro de `JWT_SECRET`                            | Confira o mínimo de 32 caracteres; o setup preserva `.env` já existente                                              |
| Dados da execução npm não aparecem no Docker    | Confira `DATABASE_URL`: a configuração padrão atual compartilha o PostgreSQL local entre os modos                    |
| Conta de demonstração não existe                | Execute `npm run demo` após o setup local; ou cadastre uma conta nova na interface                                   |
| Sessão inválida após mudança de chave           | Faça login novamente; mudar o segredo JWT invalida tokens anteriores                                                 |

## 11. Referência visual e escopo adicional

O layout se baseia no [Figma Financy fornecido no desafio](https://www.figma.com/design/0RzI8OQnhElvnyGAygeYmE/Financy--Community-), incluindo a página Style Guide. A logo completa e o símbolo usado como favicon são SVGs exportados dos componentes originais; suas referências estão em [frontend/public/brand/README.md](frontend/public/brand/README.md).

Docker Compose, logs estruturados, testes e CI complementam os requisitos funcionais da entrega. Upload de avatar, Kubernetes, estratégias de rollout, métricas e tracing com OpenTelemetry/Jaeger não fazem parte da implementação atual. As próximas etapas estão em [docs/ROADMAP.md](docs/ROADMAP.md).

A configuração Docker apresentada é local. Hospedagem pública exige domínio/endereço de acesso, HTTPS, configuração de origens, disco persistente e backups. O banco utilizado é PostgreSQL, local no Compose ou gerenciado no Neon.

## Documentação complementar

- [Publicação no Render + Neon](docs/DEPLOY_RENDER_NEON.md)
- [Docker, persistência e configuração do Compose](docs/DOCKER.md)
- [Logs estruturados e tratamento de dados sensíveis](docs/LOGGING.md)
- [Validações executadas e limites da verificação](docs/VALIDATION.md)
- [Próximas etapas](docs/ROADMAP.md)
