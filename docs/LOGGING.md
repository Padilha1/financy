# Logs estruturados

A API utiliza Pino e escreve um objeto JSON por linha em stdout. Funciona tanto com `npm run dev` quanto no Compose, sem contratar serviço externo.

```sh
docker compose logs -f backend
```

Exemplo ilustrativo:

```json
{
  "level": "info",
  "time": "2026-11-15T20:00:00.000Z",
  "service": "financy-api",
  "event": "http.request.completed",
  "requestId": "ec3373a1-309d-4493-babc-f0a5ab3d5205",
  "method": "POST",
  "route": "/graphql",
  "statusCode": 200,
  "durationMs": 12.34,
  "msg": "HTTP request completed"
}
```

## Eventos

- `server.started`, `server.stopping`, `server.stopped`: ciclo de vida da API.
- `database.migration.started`, `database.migration.completed`, `database.migration.failed`: aplicação das migrações na inicialização Docker.
- `http.request.completed`, `http.request.aborted`: método, rota conhecida, status e duração da requisição.
- `http.middleware.failed`: falhas de middleware, incluindo JSON inválido ou payload acima do limite.
- `graphql.operation.completed`: tipo da operação, duração, quantidade de erros e códigos normalizados.

A API gera um UUID novo por requisição, retorna no header `X-Request-Id` e usa o mesmo identificador nos eventos HTTP e GraphQL. Um identificador fornecido pelo cliente é ignorado para evitar falsificação. O identificador não é um trace distribuído; OpenTelemetry e Jaeger continuam no roadmap.

GraphQL pode retornar HTTP 200 com erros. Por isso uma rejeição de autenticação gera um evento GraphQL `warn` com `UNAUTHENTICATED`, mesmo que o evento HTTP registre status 200. Falhas internas geram `error`. Healthchecks bem-sucedidos são omitidos para evitar ruído; falhas de saúde são registradas.

`LOG_LEVEL=info` é o padrão. Os níveis permitidos são `debug`, `info`, `warn`, `error` e `silent`. Não há modo que passe a registrar bodies ou credenciais quando o nível muda.

## Dados excluídos

Os eventos são construídos com campos técnicos selecionados. Não são registrados:

- headers, cookies, tokens ou segredos;
- bodies, queries GraphQL, nomes de operação fornecidos pelo cliente ou variáveis;
- e-mails, nomes de usuários, valores e descrições financeiras;
- URLs brutas, query strings ou caminhos arbitrários;
- mensagens e stacks de erros que possam conter parâmetros ou consultas do Prisma.

As rotas HTTP são normalizadas para `/graphql`, `/health` ou `unmatched`. Códigos de erro são limitados a uma lista conhecida. Há redaction de campos sensíveis como defesa adicional, mas o principal controle é não entregar esses dados ao logger.

Essa escolha limita o detalhe de erros internos nos logs. Para investigar, use o `requestId`, evento, status/código e uma reprodução local com dados fictícios. Não acrescente logging de objetos `req`, `res`, `err`, inputs ou resultados completos.

O comando opcional `npm run demo` continua mostrando no terminal a credencial pública da conta fictícia; ele é uma ferramenta local explícita, não um evento da API e não roda automaticamente no Docker.

## Verificação

`npm test` inclui testes de redação e um servidor HTTP isolado para verificar correlação, erros GraphQL com HTTP 200, JSON malformado, rotas desconhecidas e ausência dos marcadores de credenciais/dados fictícios na saída. `npm run test:docker` verifica o mesmo formato no runtime Docker.
