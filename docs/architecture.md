# Arquitetura do OctoFit Tracker

O OctoFit Tracker é uma aplicação de três camadas para um programa de atividades físicas escolar. O código inicial inclui contratos de API e pontos de implementação intencionalmente incompletos para que você use o modo agent do GitHub Copilot em um ciclo guiado por testes.

```mermaid
flowchart LR
    Browser["Navegador"]
    UI["Apresentação<br/>React 19 · Vite · React Router · Bootstrap<br/>Porta 3000 · pública"]
    API["Lógica<br/>Express · TypeScript · serviços<br/>Porta 8000 · pública"]
    DB["Dados<br/>Mongoose · MongoDB<br/>Porta 27017 · privada"]
    Contracts["Contratos executáveis<br/>Atividades · Equipes · Placar · Sugestões"]

    Browser --> UI
    UI -->|HTTP /api via proxy Vite| API
    API -->|Mongoose| DB
    Contracts -. verificam .-> UI
    Contracts -. verificam .-> API
    Contracts -. verificam .-> DB
```

## Limites entre as camadas

- **Camada de apresentação**: React 19, Vite, React Router, Bootstrap e um cliente compartilhado da API em `octofit-tracker/frontend/src`.
- **Camada de lógica**: rotas e serviços Express com TypeScript em `octofit-tracker/backend/src` expõem o comportamento `/api/*` na porta `8000`.
- **Camada de dados**: modelos Mongoose e dados de demonstração em `octofit-tracker/backend/src/models` e `src/scripts/seed.ts` são persistidos no MongoDB na porta `27017`.

## Portas e regras de ambiente

- MongoDB: `27017` (privada)
- API Express: `8000` (pública)
- Interface Vite: `3000` (pública)
- O navegador acessa caminhos relativos `/api`. O Vite os encaminha para `http://localhost:8000`; `VITE_API_BASE_URL` pode substituir a URL-base.
- Não encaminhe nem torne públicas outras portas.

## Contrato da API

| Capacidade | Método e caminho | Comportamento esperado |
| --- | --- | --- |
| Registro de atividades | `GET /api/activities`, `POST /api/activities` | Lista e cria atividades válidas. POST recebe `userId`, `teamId`, `type` e `minutes`; `userId` e `teamId` devem ser IDs bem-formados de uma pessoa e uma equipe existentes, caso contrário a API retorna um 4xx intencional (nunca um 500 causado por erro de conversão). Uma atividade criada armazena `user`, `team`, `type` e `minutes` enviados, além de `points` e `occurredAt` calculados. |
| Equipes | `GET /api/teams`, `POST /api/teams` | Lista e cria equipes com integrantes. As equipes criadas e listadas mantêm os valores enviados em `name` e `mascot`. Rejeita uma equipe sem nome com `400`. |
| Placar | `GET /api/leaderboard` | Retorna as equipes ordenadas pela soma dos pontos de suas atividades, da maior para a menor. Cada item contém `teamName`, `totalPoints` e uma `rank` iniciada em 1. |
| Sugestões de treino | `GET /api/workouts/suggestions/:userEmail` | Recomenda treinos com base nos padrões de atividade recentes da pessoa correspondente ao e-mail seed. O foco da primeira sugestão (`focus`) corresponde à meta ou à atividade recente dessa pessoa, e o campo `reason` explica o motivo. Um e-mail sem pessoa correspondente retorna um 4xx intencional (por exemplo, `404`). |

## Decisões de implementação

- **Decisão da camada de apresentação:** manter componentes React responsáveis pela exibição e usar o cliente compartilhado da API para chamadas HTTP. Cada rota deve apresentar estados acessíveis de carregamento, vazio e erro, além dos dados recebidos, sem duplicar regras de negócio da API.
- **Consumo e estados no frontend:** as quatro telas compartilham um componente que solicita coleções pelo cliente HTTP, valida o formato da lista e apresenta carregamento com `role="status"`, falhas com `role="alert"` e mensagens de lista vazia. Respostas recebidas após a desmontagem são ignoradas. Tipos conhecidos de atividade são apresentados em português; equipes mostram a quantidade de integrantes, pois a API fornece referências, não nomes.
- **Pessoa para sugestões:** a tela usa `mona@example.com`, presente no seed, como valor inicial e oferece um campo de e-mail para consultar outra pessoa. O e-mail é codificado no caminho da API, e mudar a pessoa reinicia os estados da consulta.
- **Decisão da camada de lógica:** manter rotas Express como fronteira HTTP e concentrar regras de negócio nos serviços. Validar entradas e referências antes das operações de persistência e retornar erros 4xx intencionais para dados inválidos ou recursos inexistentes, preservando caminhos e formatos dos contratos existentes.
- **Decisão da camada de dados:** usar modelos Mongoose para validar campos obrigatórios, referências e valores permitidos. Fazer o seed pela aplicação, de forma idempotente, preservando registros não relacionados e mantendo as relações entre pessoas, equipes e atividades.
- **Abordagem para registro de atividades:** validar IDs, existência da pessoa e da equipe, tipo não vazio e minutos positivos antes de criar; atribuir um ponto por minuto e registrar a data no backend. Entradas inválidas não criam registros nem provocam erros 500 de conversão.
- **Abordagem para gerenciamento de equipes:** exigir nome e mascote, validar e deduplicar os IDs de integrantes e atualizar suas associações, removendo-os das equipes anteriores. Essas atualizações não usam transação e podem exigir reconciliação em caso de falha intermediária do banco.
- **Abordagem para o placar:** somar os pontos das atividades por equipe, incluindo equipes sem atividades, ordenar do maior total para o menor e desempatar pelo nome e identificador; atribuir posições sequenciais iniciadas em 1.
- **Abordagem para sugestões de treino:** localizar a pessoa pelo e-mail e buscar treinos para sua meta; se não houver, usar o foco da atividade mais recente quando conhecido. Explicar o critério em `reason`, retornar lista vazia quando não houver treino compatível e `404` quando a pessoa não existir.

## Ordem de implementação

1. **Dados:** manter as regras dos esquemas e o seed dentro dos modelos Mongoose e do código de demonstração. A suíte atual passou; não é necessário ampliar essa camada para avançar.
2. **API:** implementar as regras nas rotas e nos serviços, mantendo os contratos públicos. Corrigir validações HTTP, persistência de atividades/equipes, agregação do placar e explicação das sugestões.
3. **Apresentação:** conectar os componentes ao cliente compartilhado da API e implementar exibição de dados, carregamento, estado vazio e erro acessível em cada rota.
4. **Builds:** depois dos contratos comportamentais, executar os builds do backend e do frontend para verificar tipos e compilação.

## Plano de testes

Executar nesta ordem para validar primeiro os contratos dos quais as camadas seguintes dependem:

| Etapa | Comando | O que valida / como interpretar falhas |
| --- | --- | --- |
| Testes da camada de dados: | `npm run test:data --prefix octofit-tracker/backend` | Valida campos obrigatórios dos modelos e seed idempotente. Falhas apontam regras de schema ausentes/incorretas ou seed que não cria e relaciona os dados esperados, ou que altera registros não relacionados. |
| Testes da API: | `npm run test:api --prefix octofit-tracker/backend` | Valida criação e listagem, entradas e referências inválidas, mudança de equipe, placar com pontuação zero e sugestões pela meta ou atividade recente. Falhas indicam validação HTTP, persistência, cálculo/agregação ou seleção de sugestões incompatível com o contrato. |
| Testes do frontend: | `npm test --prefix octofit-tracker/frontend` | Valida exibição dos dados, estados acessíveis por rota, consulta por e-mail e resposta com formato inválido. Falhas indicam consumo/representação incorretos da API ou ausência de estado de carregamento, vazio ou erro. |
| Compilação do backend: | `npm run build --prefix octofit-tracker/backend` | Verifica tipos e compilação TypeScript; falhas indicam incompatibilidades de tipos ou erros estáticos no backend. |
| Compilação do frontend: | `npm run build --prefix octofit-tracker/frontend` | Verifica tipos e build do Vite; falhas indicam incompatibilidades de tipos ou erros de compilação da interface. |

**Status verificado em 2026-11-20:** após implementar a API, passaram os 7 testes da API, os 5 testes de dados e os 17 testes do frontend; o build do backend foi concluído. O build do frontend havia sido concluído na verificação anterior. Reexecutar as suítes e os builds após alterações nas respectivas camadas.
