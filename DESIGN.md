# Financy — sistema visual

Autoridade: Figma fornecido pelo usuário, páginas Projeto e Style Guide, inspecionadas em 15/11/2026.

Inter (400/500/600/700), verde #1F6F43 e #124B2B, fundo #F8F9FA, superfícies brancas, bordas #E5E7EB, texto #111827 e secundário #6B7280. Cores de categorias azul, roxo, rosa, vermelho, laranja, amarelo e verde com fundos claros correspondentes.

Navegação horizontal com logo à esquerda, links centralizados e avatar à direita. Dashboard: três resumos, lista de transações e categorias em duas colunas. Categorias: três resumos e grade de cartões. Transações: filtros, tabela e paginação. Login, cadastro e perfil: formulários centrais. Modais de categoria e transação com formulário simples, seguindo a referência.

Mobile: navegação em segunda linha, resumos e filtros adaptáveis, transações agrupadas por item e modais contidos na viewport. Controles com área mínima de toque de 44px. Valores tabulares, datas locais sem deslocamento de fuso, validação junto aos campos, foco visível, respeito a movimento reduzido.

Decisões de UX: Fitts para áreas acionáveis; proximidade/região comum para agrupar transação e ações; feedback imediato de pending/sucesso/erro. Essas são hipóteses de usabilidade verificadas por interação, sem alegações de ganhos medidos.

## Marca original

Usar os SVGs exportados diretamente dos componentes `Logo` (134×32, node `3103:1795`) e `Logo_Icon` (40×40, node `3107:5672`) do Style Guide. Arquivos em `frontend/public/brand/`. A marca completa é utilizada na navegação, login e cadastro; o símbolo isolado é utilizado como favicon e está disponível na variante `iconOnly` do componente Logo. Não reconstruir o lettering com uma fonte nem o símbolo com ícones genéricos.
