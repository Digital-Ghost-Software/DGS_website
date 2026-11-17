# RF-006: Feedback do Cliente

## 1. Identificacao

- **ID:** RF-006
- **Titulo:** Feedback do Cliente
- **Tipo:** Requisito Funcional
- **Prioridade:** Media
- **Justificativa da prioridade:** Canal direto para relatos de problemas e melhoria da satisfacao; nao bloqueia compra ou autenticação, mas tem impacto alto na qualidade do produto.
- **Complexidade:** 5 story points
- **Projeto:** Digital Ghost Software - Yokai Tales
- **Criado em:** 10/11/2026
- **Atualizado em:** 17/11/2026
- **Status:** Implementado no repositório e em validação no deploy.

### URLs e artefatos

- **Página:** https://dgs-website-omega.vercel.app/paginas/feedback.html
- **Código:** `paginas/feedback.html`, `js/feedback.js` e `css/feedback.css`
- **Banco:** Supabase, tabela `public.feedback_comments`
- **Migração:** `database/ddl/feedback-comments.sql`
- **Repositório:** https://github.com/Digital-Ghost-Software/DGS_website

---

## 2. Descricao e atores

O requisito fornece uma seção comunitária em que usuários autenticados publicam comentários sobre Yokai Tales. Os comentarios sao publicamente legíveis. Somente administradores podem editar ou excluir registros.

### Beneficios

- Centraliza comentarios da comunidade.
- Ajuda a identificar problemas e avaliar a satisfação dos usuários.
- Permite que administradores moderem conteúdo.

### Matriz CRUD

| Ator | Create | Read | Update | Delete |
|---|:---:|:---:|:---:|:---:|
| Visitante | - | Permitido | - | - |
| Usuario autenticado | Permitido | Permitido | - | - |
| Administrador | Permitido | Permitido | Permitido | Permitido |
| Supabase/RLS | Valida autoria | Aplica leitura pública | Valida admin | Valida admin |

### atores

- **Cliente:** autentica-se e publica ou consulta comentarios.
- **Sistema:** valida tamanho, protege contra XSS e grava via Supabase.
- **Administrador:** modera comentarios publicados.
- **Supabase:** aplica Auth, triggers e políticas RLS.

### Decisão de escopo

Esta versão implementa um mural autenticado de comentários, não um formulário público com campos separados de nome, e-mail e categoria. O nome do autor é obtido do perfil ou dos metadados da conta; o e-mail não é exibido. O campo da manifestação é o conteúdo do comentário.

---

## 3. Casos de uso e regras

### UC-006: Publicar comentário

#### Pre-condicoes

- O Supabase esta configurado.
- A tabela `feedback_comments` e a migração RLS foram aplicadas.
- O usuário esta autenticado para publicar.

#### Fluxo principal

1. O cliente abre a página de Feedback.
2. O sistema verifica a sessão Supabase.
3. Usuários sem login recebem o link para autenticação.
4. Usuários autenticados veem o formulário.
5. O cliente informa o comentario.
6. A interface valida visualmente a quantidade de caracteres.
7. O cliente confirma a publicação.
8. O JavaScript insere somente o campo `content`.
9. O trigger define `user_id` e `author_name` no banco.
10. O sistema recarrega a lista e mostra sucesso.

#### Pos-condicoes

- Em sucesso: a linha é inserida em `feedback_comments` e fica visível na lista.
- Em falha: nenhum comentário é inserido e uma mensagem em português é exibida.

### UC-006A: Consultar comentários

1. A página carrega.
2. O sistema consulta `feedback_comments` em ordem decrescente de criação.
3. A lista pública é exibida ou a mensagem de lista vazia aparece.

### UC-006B: Moderar comentário

1. A página verifica `is_feedback_admin()`.
2. Somente administradores veem Editar e Excluir.
3. Editar executa `UPDATE (content)`.
4. Excluir solicita confirmacao e executa `DELETE`.

### Fluxos alternativos

#### A1: Comentário fora dos limites

- Menos de 15 ou mais de 1.000 caracteres após remover espaços nas pontas.
- A interface destaca o campo em vermelho com `✗`.
- A operação não é enviada.

#### A2: Sessão ausente

- O formulário permanece oculto.
- A página informa que é necessário entrar na conta.

#### A3: Falha no banco

- Tabela ausente, RLS negada ou falha de rede.
- O sistema mostra mensagem específica ou genérica em português.
- Nenhum sucesso é informado.

#### A4: Ação não permitida

- Usuário comum tenta atualizar ou excluir.
- RLS retorna erro de permissão.
- O item não é alterado.

### Regras de negócio

- **RN-01:** consulta pública permitida.
- **RN-02:** publicação somente para usuário autenticado.
- **RN-03:** comentário com 15 a 1.000 caracteres.
- **RN-04:** autoria definida pelo servidor; o cliente não envia `user_id` ou `author_name`.
- **RN-05:** somente administrador pode editar ou excluir.
- **RN-06:** comentários são exibidos por data de criação decrescente.

### Requisitos não-funcionais

- **RNF-01:** interface responsiva em larguras mobile, tablet e desktop.
- **RNF-02:** mensagens de erro e sucesso em português.
- **RNF-03:** resposta visual de carregamento com `aria-busy` e indicador.
- **RNF-04:** dados exibidos com `textContent`, sem HTML interpretado.
- **RNF-05:** operações dependem de HTTPS e da sessão Supabase.

---

## 4. Protótipo funcional

### Estados da interface

| Estado | Implementação |
|---|---|
| Vazio | "Ainda não há comentários..." |
| Carregamento | Mensagem com `aria-busy=true` e indicador circular |
| Preenchido | Lista de comentários |
| Erro | Mensagens vermelhas em português |
| Sucesso | Mensagens verdes após publicar, editar ou excluir |

### Validação visual

- Entrada inválida: borda vermelha, estado `aria-invalid=true` e `✗`.
- Entrada válida: borda verde e `✓ Comentário válido`.
- Comentários são limitados a 15–1.000 caracteres.

### Navegação

A página inicial foi corrigida para usar `paginas/feedback.html`, `paginas/outros_jogos.html` e `paginas/doacoes.html`.

---

## 5. Arquitetura

### Diagrama

```text
Navegador
  |
  | HTML/CSS/JavaScript
  v
Supabase JS
  |
  +--> Supabase Auth (sessao)
  +--> tabela feedback_comments
             |
             +--> trigger de autoria
             +--> RLS e grants
```

### Fluxo de dados

Navegador -> `supabase.auth.getUser()` -> consulta pública/insert autenticado -> trigger define autoria -> PostgreSQL aplica constraint e RLS -> resposta ao JavaScript -> atualização da interface.

### ADR

- **ADR-001:** Supabase como banco e autenticação. Reutiliza infraestrutura já usada pelo projeto.
- **ADR-004:** Frontend direto com Supabase JS. Evita duplicar backend para CRUD simples.
- **ADR-002:** Trigger define `user_id` e `author_name`. Impede que o navegador falsifique autoria.
- **ADR-003:** RLS permite leitura pública e restringe escrita, atualização e exclusão.
- **ADR-005:** Textos são inseridos com `textContent`. Impede execução de HTML ou JavaScript enviado pelo usuário.
- **ADR-006:** Comentários ficam limitados a 15–1.000 caracteres, alinhados à especificação original.

---

## 6. Segurança

### Controle 1: Broken Access Control

- **Vulnerabilidade:** usuário comum editar ou excluir comentario de outro.
- **Implementação:** RLS de update/delete exige `is_feedback_admin()`, e a insercao exige usuário autenticado.
- **Teste:** conta comum tenta UPDATE/DELETE e recebe erro do banco sem alterar a linha.

### Controle 2: Autoria falsa

- **Vulnerabilidade:** navegador enviar `user_id` ou `author_name` de outra pessoa.
- **Implementação:** trigger security-definer sobrescreve ambos a partir da sessao autenticada.
- **Teste:** tentar enviar campos de autoria; o banco deve manter o usuário real.

### Controle 3: XSS

- **Vulnerabilidade:** comentário contendo HTML ou JavaScript.
- **Implementação:** a interface usa `textContent` para nome e conteúdo.
- **Teste:** publicar `<script>alert('xss')</script>` e confirmar que aparece como texto sem executar código.

### Controle 4: SQL Injection

- **Vulnerabilidade:** dados maliciosos alterarem consultas.
- **Implementação:** Supabase JS envia parâmetros e o banco usa constraints, triggers e RLS.
- **Teste:** publicar texto com aspas e SQL e confirmar que permanece como comentário.

### Controle 5: Menor privilégio

- **Vulnerabilidade:** cliente obter acesso além do necessário.
- **Implementação:** grants limitados a `select`, `insert(content)`, `update(content)` e `delete` conforme a política.
- **Teste:** verificar migration e tentar operações fora dos grants concedidos.

### Evidências

- Migração RLS em `database/ddl/feedback-comments.sql`.
- Teste estático em `tests/unit/migration.test.js`.
- Validação visual e estados em `js/feedback.js` e `css/feedback.css`.
