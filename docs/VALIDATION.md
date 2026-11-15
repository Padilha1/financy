# Validação da entrega

## Automatizada

- `npm run typecheck`: TypeScript em backend e frontend.
- `npm test`: 11 cenários de integração, um teste agregador e dois testes de logging (14 testes reportados pelo Node), usando PostgreSQL temporário e o schema/resolvers GraphQL reais.
- `npm run build`: backend compilado e bundle Vite de produção.
- `npm audit`: auditoria das dependências do lockfile.

## Navegador

Referência visual: páginas Projeto e Style Guide do Figma fornecido, incluindo login/cadastro, dashboard, transações, categorias, perfil e dialogs.

Verificação manual da aplicação local: login da demonstração; navegação; criação de categoria com cor/ícone; criação de despesa em centavos; busca e paginação; estados responsivos. Os dados usados são fictícios. A verificação no navegador complementa os testes de isolamento da API; não constitui auditoria completa de acessibilidade nem validação em aparelhos físicos.

## Resultado local em 15/11/2026

TypeScript, build, formatação e os 14 testes reportados pelo Node passaram. `npm audit` retornou zero vulnerabilidades conhecidas. O setup foi executado novamente preservando o ambiente e sem migrações pendentes. CORS retornou a origem configurada; uma consulta HTTP privada sem token retornou `UNAUTHENTICATED`.

Capturas revisadas: [desktop](screenshots/dashboard-desktop.jpg) e [mobile](screenshots/dashboard-mobile.jpg). Foram inspecionadas telas de 1280 px, 390 px e 320 px; dashboard mobile e categorias estreitas não apresentaram rolagem horizontal na medição do DOM. Criação de categoria, criação/edição de transação, busca e segunda página foram verificadas pelo navegador. A exclusão e o isolamento foram verificados pelos testes automatizados. Os registros auxiliares da verificação visual foram removidos, preservando apenas a demonstração opcional.

A CI foi configurada no repositório, mas ainda não foi executada no GitHub.

## Correção da marca original

A marca foi substituída pelos SVGs exportados diretamente dos componentes `Logo` e `Logo_Icon` do Style Guide. Conferida no login: arquivo original carregado em 134 × 32, lettering em paths e símbolo isolado configurado como favicon. Build do frontend aprovado. [Captura atual da marca](screenshots/login-logo-original.jpg). As capturas anteriores do dashboard documentam a primeira implementação, anterior a esta correção da logo.

## Docker Compose e logs estruturados

- `docker compose config --quiet`: configuração válida.
- Imagens do frontend e backend construídas com dependências Linux, sem incorporar `.env` ou bancos da máquina.
- `npm run test:docker`: passou em projeto/porta/volume isolados. Conferiu as rotas do SPA, os vetores originais, o proxy `/graphql`, healthchecks, CORS para origem permitida e ausência de autorização CORS para origem externa.
- Cadastro, criação de categoria/transação e isolamento de duas contas funcionaram pelo Nginx.
- Após recriar o container da API, a sessão JWT anterior continuou válida e os registros PostgreSQL foram preservados.
- Logs JSON correlacionaram os eventos HTTP/GraphQL por `X-Request-Id`, sem os tokens, nomes, e-mails e dados fictícios enviados no teste. Os testes de logging também cobrem HTTP 200 com erro GraphQL, JSON malformado e rotas desconhecidas.
- O projeto e o volume temporários do smoke test foram removidos ao terminar. O volume normal da aplicação e o banco local não foram utilizados pelo teste.
- Auditoria npm após adicionar Pino: zero vulnerabilidades conhecidas. O job Docker está configurado na CI, mas ainda não foi executado no GitHub.

## Adaptação PostgreSQL / Neon

O provider Prisma e a migração ativa agora usam PostgreSQL. O adaptador pg utiliza a URL pooled de runtime, e a CLI usa `DIRECT_URL` quando fornecida. As migrações e o schema SQLite anteriores foram arquivados em `docs/legacy/`; arquivos de dados anteriores não foram removidos nem importados.

Os 14 testes passaram com PostgreSQL real em container isolado. A busca por descrição também foi verificada com diferença de caixa, preservando o comportamento esperado após sair do SQLite. `render.yaml` configura API Docker + Static Site; o guia descreve as variáveis Neon, TLS, URLs, CORS e rewrite. A conexão com Neon e o deploy Render dependem dos recursos e credenciais do autor e não foram executados nesta validação local.

O smoke test do Compose também passou após a troca para PostgreSQL: banco e JWT sobreviveram à recriação da API, CORS e logs mantiveram o comportamento esperado. TypeScript, build, formatação e auditoria npm foram conferidos novamente; a auditoria retornou zero vulnerabilidades conhecidas.
