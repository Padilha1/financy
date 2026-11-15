# Etapas após a entrega obrigatória

Docker + Compose e logs estruturados foram autorizados pelo usuário na implementação atual, antes da publicação no GitHub, e estão concluídos. Há imagens de produção, proxy de mesma origem, PostgreSQL e chave JWT persistentes, migrações automáticas, healthchecks, logs JSON com correlação por requestId e testes de integração. Veja [DOCKER.md](DOCKER.md) e [LOGGING.md](LOGGING.md).

Nenhum serviço cloud foi contratado ou provisionado. Preservar uma versão da resolução obrigatória antes dos demais extras.

1. **Avatar opcional**: avaliar Cloudflare R2, URLs assinadas e limites de formato/tamanho. Confirmar disponibilidade e preços antes de criar recursos.
2. **Privacidade adicional**: retenção, exportação e exclusão de dados, minimização, políticas e proteção de backups PostgreSQL. A base atual coleta apenas nome, e-mail e dados financeiros fornecidos; isso não representa certificação de conformidade com a LGPD.
3. **Deploy avançado**: Docker e ambiente local reproduzível já implementados. Estudar Kubernetes local (kind/k3d), Argo Rollouts, blue-green e canary. Separar demonstração local de hospedagem gratuita e verificar limites reais antes de escolher um provedor. PostgreSQL foi adotado para permitir hospedagem no Neon, conforme alternativa permitida pelo enunciado. A configuração de deploy está em `render.yaml` e no guia Render + Neon.
4. **Monitoramento e tracing — adicionado a pedido do usuário**: implementar depois da base obrigatória, com métricas e traces via OpenTelemetry, integrando os logs estruturados já implementados. Executar Jaeger e Collector localmente em Docker, propagar contexto entre requests GraphQL, resolvers e banco, comparar duração e diagnosticar gargalos. Preservar PostgreSQL no ambiente local e no Neon. Não registrar senhas, tokens, e-mails ou descrições financeiras em spans/logs; definir retenção e cardinalidade. Documentar como iniciar e desligar a infraestrutura.

Critérios da etapa de observabilidade: uma requisição visível de ponta a ponta, correlação trace/log, métricas de duração/erro, configuração de sampling e um guia reproduzível. Tracing, métricas e Jaeger ainda não estão implementados e não são necessários para a correção acadêmica.
