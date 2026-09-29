# RF-004 — Gestão de pedidos e pagamentos simulados

> **Natureza:** protótipo acadêmico. Este requisito não processa pagamentos reais, não se conecta a provedor financeiro e não coleta dados de cartão. O termo “pagamento” designa o registro de um pedido simulado.

## 1. Metadados do requisito (2%)

| Campo | Valor |
| --- | --- |
| ID | RF-004 |
| Título | Gerir pedidos de compra das edições de Yokai Tales |
| Tipo | Requisito funcional |
| Prioridade | Alta — o feedback do professor identifica Gestão de Pagamentos como o próximo requisito. |
| Complexidade | Média, estimativa inicial de 5 story points; confirmar com a equipe. |
| Status | Pedidos simulados implementados e validados com Supabase. O download real depende da publicação da release. |
| Criação / atualização | 23/09/2026 / 29/09/2026 |
| Projeto | Digital Ghost Software — Yokai Tales |

### Metadados do projeto/equipe

- **Repositório:** [Digital-Ghost-Software/DGS_website](https://github.com/Digital-Ghost-Software/DGS_website), branch `main`.
- **Aplicação publicada:** [DGS Web Site](https://dgs-website-omega.vercel.app/). A API é servida na mesma origem.

| Integrante | Papel registrado nas entregas | Contato registrado |
| --- | --- | --- |
| Andre Luis Macedo Nascimento | Back-end | <andre58212086@edu.df.senac.br> |
| Calebe Bezerra Feitosa | Marketing | <calebe58107886@edu.df.senac.br> |
| Douglas Rocha Vasco | Back-end / Modelagem | <douglas58129016@edu.df.senac.br> |
| Jonas Santos Barbosa | História / Marketing | <jonas59300436@edu.df.senac.br> |
| Letícia Lacerda Domingues | Dubladora | <leticia49518826@edu.df.senac.br> |
| Pedro Henrique Coelho Lima | Marketing | <pedro57951426@edu.df.senac.br> |
| Raphael Alves Mendes | Marketing / Modelagem | <raphael59068396@edu.df.senac.br> |
| Tiago de Andrade Lima | full-Stack | <tiago59068726@edu.df.senac.br> |

### Estrutura de diretórios e caminhos

Os caminhos abaixo são relativos à raiz atual do repositório `Digital-Web-Site/`:

```text
Digital-Web-Site/
├── .gitignore
├── index.html
├── README.md
├── package.json
├── package-lock.json
├── vercel.json
├── api/
│   └── [...path].js
├── css/
│   └── style.css
├── database/
│   └── ddl/
│       ├── default-profile-photo.sql
│       ├── new-project-schema.sql
│       └── rf-004-simulated-payments.sql
├── Docs/
│   ├── RF - 01 - Login.md
│   ├── RF-001-login.md
│   ├── RF-002-cadastro-usuario.md
│   ├── RF-003-gerenciar-download-do-jogo.md
│   └── RF-004-gestao-pagamentos-e-refinamento.md
├── imagens/
│   ├── ESSE_NEGOCIO_TA_COISADO.png
│   ├── Yokai.png
│   ├── favicon.ico
│   ├── foxy.png
│   ├── logo.png
│   ├── user-img-default.jpg
│   └── favicon_io (1)/
│       ├── android-chrome-192x192.png
│       ├── android-chrome-512x512.png
│       ├── apple-touch-icon.png
│       ├── favicon-16x16.png
│       ├── favicon-32x32.png
│       └── site.webmanifest
├── js/
│   ├── auth-rules.js
│   ├── download-rules.js
│   ├── profile-rules.js
│   ├── purchase-rules.js
│   ├── script.js
│   └── supabase-config.js
├── paginas/
│   ├── cadastro.html
│   ├── download.html
│   ├── login.html
│   ├── perfil.html
│   ├── recuperar-senha.html
│   └── tales.html
├── scripts/
│   ├── build-static.js
│   └── run-supabase-integration.js
├── server/
│   ├── index.js
│   └── local.js
└── tests/
    ├── integration/
    │   ├── api.test.js
    │   └── supabase-live.test.js
    └── unit/
        ├── accessibility.test.js
        ├── auth-rules.test.js
        ├── download-rules.test.js
        ├── localization.test.js
        ├── migration.test.js
        ├── profile-photo.test.js
        ├── purchase-rules.test.js
        └── supabase-config.test.js
```


## 2. Descrição e atores (10%)

### Descrição detalhada

O usuário acessa a página de compra, escolhe uma edição e uma forma de pagamento simulada e confirma o pedido. A aplicação exige autenticação, registra o pedido no Supabase e apresenta o recibo e o histórico do próprio usuário. O preço e o estado são definidos pelo banco. Nenhuma cobrança ocorre e nenhum dado de cartão é solicitado ou armazenado. O download só fica disponível quando o arquivo do jogo estiver publicado e associado ao pedido.

O requisito atende a três objetivos: (1) demonstrar o fluxo de compra simulado do jogo; (2) manter um histórico de pedidos associado ao usuário autenticado; (3) apresentar com clareza as diferenças de conteúdo e preço entre as edições.

### Edições

| Edição | Preço simulado | Conteúdo informado |
| --- | ---: | --- |
| Standard | R$ 20,00 | Jogo base Yokai Tales |
| Plus | R$ 40,00 | Jogo base, DLC e conteúdos adicionais |

### Atores e permissões

| Ator | Papel e responsabilidade | CREATE | READ | UPDATE | DELETE |
| --- | --- | :---: | :---: | :---: | :---: |
| Usuário autenticado | Seleciona edição e forma simulada, confirma o pedido e consulta o próprio histórico. | ✅ Pedido próprio | ✅ Pedidos próprios | ❌ | ❌ |
| Aplicação web | Apresenta edições, estados, recibo e disponibilidade do download; encaminha a solicitação autenticada. | ✅ Solicita à API | ✅ Solicita à API | ❌ | ❌ |
| Supabase Auth e PostgreSQL | Valida a identidade, aplica RLS, calcula preço/estado e persiste pedidos e solicitações de download. | ✅ Conforme políticas | ✅ Conforme políticas | ❌ pelo cliente | ❌ pelo cliente |
| Administrador do projeto | Mantém usuários e permissões do projeto pelo painel administrativo; não participa da confirmação de pedidos do RF-004. | Fora do fluxo | Fora do fluxo | Fora do fluxo | Fora do fluxo |

Não há ator de provedor de pagamento: o escopo é simulado e não existe transação financeira. A administração de contas não autoriza nem condiciona um pedido neste requisito.

## 3. Caso de uso e requisitos não funcionais (20%)

### UC-004 — Confirmar pedido simulado

**Pré-condições**

1. O site está servido por HTTP/HTTPS e o JavaScript modular carregou.
2. O usuário tem uma sessão válida do Supabase Auth.
3. O schema atual do Supabase, definido em `database/ddl/new-project-schema.sql`, foi aplicado e suas tabelas/políticas estão disponíveis.
4. O jogo apresenta as edições Standard e Plus.

**Fluxo principal**

1. O usuário acessa a página de compra.
2. A interface apresenta Standard por R$ 20,00 e Plus por R$ 40,00.
3. O usuário seleciona uma edição.
4. A interface atualiza o total exibido.
5. A página informa que a operação é acadêmica e não deve receber dados de cartão.
6. O usuário confirma o pedido simulado.
7. A aplicação obtém a sessão autenticada do Supabase.
8. A aplicação envia a edição e a forma de pagamento simulada para `POST /api/payments` com o token de sessão; preço, titular, estado e horário continuam determinados pelo banco.
9. A API Node.js valida o token com Supabase Auth e encaminha a solicitação usando o JWT do próprio usuário.
10. O trigger PostgreSQL obtém `auth.uid()`, calcula o preço correspondente e define o estado `simulated_approved`.
11. A política RLS restringe o pedido ao usuário autenticado.
12. O Supabase persiste o pedido e retorna seu recibo.
13. A aplicação exibe confirmação, estado simulado e histórico de pedidos do usuário.
14. Se a URL de release estiver configurada, a interface apresenta o download; sem artefato publicado, informa que ele está pendente.

**Pós-condições (sucesso)**

- O pedido simulado é persistido com edição, preço, forma escolhida, estado e horário definidos conforme as regras do sistema.
- O pedido aparece no histórico do titular e não fica visível para outras contas.
- Nenhum valor é cobrado e nenhum dado de cartão é coletado ou armazenado.

**Pós-condições (falha)**

- A interface não apresenta confirmação de sucesso quando a API rejeita a solicitação ou não consegue confirmar o resultado.
- Se a solicitação for rejeitada antes da persistência, nenhum pedido novo é criado.
- Em caso de falha de rede com resultado indeterminado, o usuário consulta o histórico antes de tentar novamente, pois a gravação pode ter sido concluída antes da interrupção da resposta.
- Uma falha na solicitação do download não altera o pedido simulado já registrado.

**Fluxos alternativos**

**A1 — Usuário sem sessão**

1. A aplicação detecta que não há usuário autenticado.
2. A aplicação não envia a criação do pedido.
3. A interface solicita que o usuário entre na conta e oferece o link para login com a edição escolhida.
4. Após o login, o usuário retorna ao fluxo de compra e confirma o pedido.

**A2 — Edição ou forma de pagamento inválida**

1. A interface ou a API detecta uma edição ou forma não permitida.
2. A solicitação não é persistida e a interface não apresenta recibo.
3. A interface informa que a escolha é inválida e mantém o formulário disponível para correção.

**A3 — API, Supabase ou RLS rejeita a solicitação**

1. A API recebe erro de autenticação, autorização, validação ou persistência.
2. A interface informa que não foi possível confirmar o pedido e não apresenta mensagem de sucesso.
3. Se o serviço confirmar que a gravação foi rejeitada, nenhum pedido novo é criado.
4. Se a conexão cair sem resposta conclusiva, o usuário consulta o histórico antes de tentar novamente.

**A4 — Arquivo do jogo ainda não publicado**

1. O pedido simulado é confirmado e aparece no histórico.
2. A aplicação verifica que não há arquivo de release disponível.
3. A interface informa que o download está pendente e não apresenta um link funcional.

**Ponto pendente de escopo — verificação de cartão:** o feedback recebido menciona uma verificação de cartão antes da compra, mas esse comportamento não existe no sistema atual. O checkout não coleta dados de cartão e o schema atual não possui cadastro de cartões. A inclusão deste fluxo depende de decisão da equipe e não está descrita como funcionalidade implementada.

### Regras de negócio

| ID | Regra |
| --- | --- |
| RN-01 | Somente usuários autenticados podem registrar pedidos. |
| RN-02 | `standard` tem preço simulado fixo de R$ 20,00. |
| RN-03 | `plus` tem preço simulado fixo de R$ 40,00. |
| RN-04 | Edição e forma de pagamento simulada são as únicas escolhas do checkout enviadas pelo navegador; usuário, preço, estado e horário são determinados no banco. |
| RN-05 | Um usuário pode consultar somente os próprios pedidos. |
| RN-06 | O estado criado é `simulated_approved`; o registro não representa pagamento real e não pode ser alterado/apagado pelo cliente. |
| RN-07 | O pedido não libera arquivo inexistente; download real depende de release publicada e URL configurada. |

### Requisitos não funcionais

| ID | Atributo | Requisito | Métrica | Justificativa |
| --- | --- | --- | --- | --- |
| RNF-01 | Segurança | RLS separa pedidos por `auth.uid()` e o banco define titular, preço e estado. | Zero pedidos de outra conta visíveis; tentativas de adulterar os campos protegidos são rejeitadas ou sobrescritas. | Protege o histórico e evita que o cliente altere dados confiáveis do pedido. Teste live com duas contas e tentativa de adulteração foi aprovado. |
| RNF-02 | Usabilidade | Os estados vazio, seleção, processamento, erro e confirmação devem ser compreensíveis e acessíveis. | 5 estados identificáveis; fluxo principal utilizável por teclado e com mensagens anunciadas por tecnologia assistiva. | Ajuda o usuário a entender o resultado e corrigir erros. A confirmação e o histórico foram vistos; revisão formal de teclado, leitores de tela e evidências visuais segue pendente. |
| RNF-03 | Responsividade | O checkout deve permanecer utilizável em telas pequenas e desktop. | Viewports de 320 px, 768 px e 1024 px, sem rolagem horizontal no conteúdo principal. | Mantém o fluxo disponível em celular, tablet e desktop. A responsividade foi validada pelo usuário; evidência formal por largura ainda não foi anexada. |
| RNF-04 | Integridade | Cada confirmação concluída deve gerar um pedido consultável com preço correspondente à edição. | Standard = R$ 20,00; Plus = R$ 40,00; valor retornado deve coincidir com o persistido. | Evita divergência entre o total exibido, o recibo e o histórico. Os testes live confirmaram os valores e o usuário confirmou a lista de últimos pedidos. |

## 4. Protótipo funcional (40%)

### Artefatos

- Interface: `paginas/download.html`.
- Fluxo e apresentação: `js/script.js` e `paginas/download.html`.
- API Node.js para autenticar operações e consultar/criar pedidos: `server/index.js` (`GET/POST /api/payments`, `POST /api/downloads`).
- Estilo responsivo do checkout: `css/style.css`.
- Schema PostgreSQL/RLS do projeto atual: `database/ddl/new-project-schema.sql` (aplicado no Supabase `DGS_Web_Site`); ele inclui a coluna `payment_method` usada pelos pedidos.
- `database/ddl/rf-004-simulated-payments.sql` corresponde ao banco legado e não inclui `payment_method`; não é a migração do schema atual. A migração incremental `database/ddl/default-profile-photo.sql` foi aplicada ao banco atual.
- Configuração pública carregada em tempo de execução: `server/index.js` (`GET /api/config`) e `js/supabase-config.js`.

### Estados planejados no protótipo

1. **Inicial/vazio:** sem pedidos na conta.
2. **Seleção:** escolha Standard/Plus, uma forma entre boleto/crédito/débito/Pix e confira o total correspondente.
3. **Processando:** botão bloqueado enquanto grava.
4. **Erro:** sessão inválida, falha de rede ou banco não configurado.
5. **Sucesso:** pedido simulado persistido e recibo exibido.
6. **Download pendente:** estado de sucesso sem link do jogo ainda publicado.

O schema atual do Supabase foi aplicado e a integração live foi testada com duas contas. A suíte validou preço, titularidade, estado, isolamento, forma de pagamento e autorização de download; o histórico foi confirmado na interface. A implantação e a validação inicial na Vercel também foram confirmadas. Ainda não há um pacote formal de evidências anexado a este requisito.

### Dado persistido

`simulated_payments`: UUID do pedido, UUID do usuário autenticado, edição, valor em BRL, forma de pagamento simulada, estado `simulated_approved` e data/hora. `game_downloads` mantém a solicitação, a versão e o horário, vinculada a um pedido do mesmo usuário. A aplicação não grava número, nome ou código de cartão.

## 5. Arquitetura e ADR (15%)

### Diagrama e fluxo

```mermaid
flowchart LR
  U[Usuário autenticado] --> UI[Checkout HTML/CSS]
  UI --> JS[JavaScript modular]
  JS --> AUTH[Supabase Auth]
  JS --> API[API Node.js]
  API --> DATA[Supabase Data API com token do usuário]
  DATA --> RLS{RLS: auth.uid()}
  RLS --> DB[(simulated_payments)]
  DB --> TRG[Trigger calcula preço e estado]
  TRG --> DB
  DB --> UI
  UI -. release futura .-> FILE[Arquivo do jogo ainda não publicado]
```

### ADR-004-01 — Simulação sem provedor financeiro

- **Status:** Aceito para o protótipo acadêmico.
- **Contexto:** o professor solicitou Gestão de Pagamentos; a equipe definiu que não haverá cobrança real.
- **Decisão:** confirmar pedido simulado diretamente no Supabase, sem pedir dados de cartão.
- **Alternativas:** integração com gateway real; formulários que coletam dados de cartão. Ambas fora do escopo atual.

### ADR-004-02 — Preço calculado no PostgreSQL

- **Status:** Trigger aplicado e validado pelo teste live, inclusive quando a requisição tenta forjar titular, preço, estado e horário.
- **Contexto:** valores informados pelo navegador podem ser adulterados.
- **Decisão:** trigger escolhe R$ 20 ou R$ 40 conforme edição e define o estado simulado.
- **Alternativas:** confiar no preço enviado pela tela; endpoint próprio de backend.

### ADR-004-03 — RLS por usuário autenticado

- **Status:** Políticas aplicadas e teste live de duas contas passou para leitura isolada e download do próprio pedido; tentativa cruzada foi rejeitada.
- **Contexto:** histórico precisa ser isolado entre contas.
- **Decisão:** permitir insert/select autenticado e restringir linhas por `auth.uid()`; cliente não recebe update/delete.
- **Alternativas:** tabela aberta anonimamente; controle só na interface. Ambas insuficientes para isolamento.

### ADR-004-04 — Registro de pedido imutável

- **Status:** Aceito para a simulação.
- **Contexto:** não há liquidação, estorno ou gateway; o histórico é evidência acadêmica.
- **Decisão:** usuário pode criar e consultar pedidos, mas não editar ou excluir recibos.
- **Alternativas:** permitir edição/exclusão ao cliente; adicionar fluxo administrativo de cancelamento em requisito futuro.

### Tecnologias

| Componente | Tecnologia | Motivo |
| --- | --- | --- |
| UI | HTML5/CSS3 | Formulário sem dados financeiros reais e adaptação para telas pequenas. |
| Lógica | JavaScript ES Modules | Fluxo de sessão, seleção, mensagens e consulta do pedido. |
| API | Node.js | Valida identidade Supabase, encaminha operações e isola credenciais administrativas. |
| Autenticação e API | Supabase Auth/Data API | Identidade autenticada e persistência gerenciada já escolhida pela equipe. |
| Banco | PostgreSQL no Supabase | Trigger, constraints e RLS aplicam preço/estado e isolamento. |

## 6. Segurança OWASP (10%)

| Risco | Implementação no protótipo | Teste/evidência necessário |
| --- | --- | --- |
| A01 — Broken Access Control: leitura de pedido/download alheio | Políticas RLS limitam pedidos e solicitações a `auth.uid()`; trigger exige pedido aprovado do próprio usuário. | Teste live com duas contas passou: isolamento de histórico e rejeição de download cruzado. |
| A04 — Insecure Design / exposição de dados de cartão | Checkout simulado não solicita nem persiste PAN, CVV ou nome de titular. | Inspeção do formulário/schema e suíte de testes; não inserir cartões reais. Screenshot formal não anexado. |
| A05 — Authentication Failures / preço adulterado | Supabase Auth; trigger sobrescreve titular, preço, estado e horário. | Teste live enviou valores adulterados e confirmou os valores calculados no banco. |
| A03 — Injection | Edição e forma de pagamento são validadas na API e no banco; acesso usa cliente Supabase estruturado. | Teste live rejeitou forma de pagamento inválida; teste unitário/API cobre edição inválida. |

Os controles acima têm evidência de testes automatizados e integração real. Isso não equivale a auditoria externa ou teste de penetração. Screenshots formais ainda são necessários para a entrega acadêmica completa; a responsividade foi confirmada pelo usuário.

## 7. Checklist de atendimento e pendências

| Tópico | Estado |
| --- | --- |
| T1 — Identificação (2%) | Preenchido; estimativa de complexidade deve ser validada pela equipe. |
| T2 — Descrição e atores (6%) | Objetivo, três atores e CRUD definidos. |
| T3 — Casos de uso/RNF (15%) | Pré/pós-condições, 12 passos, quatro alternativos, sete regras e quatro RNF. |
| T4 — Protótipo (50%) | HTML/JS e schema aplicados; integração Supabase e histórico foram testados; site e API estão publicados na Vercel e passaram pela validação inicial. |
| T5 — Arquitetura/ADR (15%) | Diagrama, fluxo e quatro ADRs descritos. |
| T6 — OWASP (12%) | RLS, tentativa de forjar preço/titular, método inválido e solicitação cruzada de download foram testados. A revisão não equivale a uma auditoria externa. |

**Nota:** não foi atribuída pontuação. O critério de protótipo exige execução funcional, deploy e evidência; documentação isolada não prova esses itens.

## 8. Critérios de aceite

- [x] O schema do projeto Supabase do sistema foi executado; a migração incremental da foto padrão também foi aplicada.
- [x] Duas contas criaram pedidos e cada conta consultou apenas seu histórico; download cruzado foi rejeitado.
- [x] Standard persiste R$ 20,00 e Plus R$ 40,00, inclusive com tentativa de adulteração.
- [x] Formulário e tabela não solicitam nem guardam dados reais de cartão.
- [x] Os estados de interface são demonstrados em tela pequena e desktop.
- [x] Publicar site/API integrados na Vercel e concluir a validação inicial.
- [ ] Release do jogo é publicada e `GAME_DOWNLOAD_URL` recebe o endereço real antes de prometer download.
- [ ] Anexar evidências formais dos testes e da demonstração.

**Fontes usadas:** feedback do professor, documentações RF-001/RF-002 fornecidas, `requisitos.md` v15, código e estrutura local do projeto, além das decisões informadas pelo usuário. Nenhuma fonte externa foi usada.
