# DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS E ARQUITETURA SEGURA (SSD)

## Laboratório de Inovação III — Prof. Edilberto Silva — 2026

**Este documento é o guia técnico completo do seu projeto. Cada requisito funcional será avaliado com base neste padrão.**

⚠️ **IMPORTANTE:** Cada entrega cobre **APENAS UM REQUISITO FUNCIONAL** (ex: RF-001 Cadastro de Hóspede). Não misture múltiplos requisitos em um mesmo documento.

---

## 1. METADADOS DO PROJETO E DA EQUIPE

### 1.1 Composição da Equipe

| ID  | Nome Completo                | Papel Primário | Papel Secundário | E-mail / Contato                  |
|:---:|:---------------------------- |:-------------- |:---------------- |:--------------------------------- |
| 1   | Andre Luis Macedo Nascimento | Back-end       | —                | [andre58212086@edu.df.senac.br]   |
| 2   | Calebe Bezerra Feitosa       | Marketing      | —                | [calebe58107886@edu.df.senac.br]  |
| 3   | Douglas Rocha Vasco          | Back-end       | Modelagem        | [douglas58129016@edu.df.senac.br] |
| 4   | Jonas Santos Barbosa         | Historia       | Marketing        | [jonas59300436@edu.df.senac.br]   |
| 5   | Letícia Lacerda Domingues    | Dubladora      | —                | [leticia49518826@edu.df.senac.br] |
| 6   | Pedro Henrique Coelho Lima   | Marketing      | —                | [pedro57951426@edu.df.senac.br]   |
| 7   | Raphael Alves Mendes         | Marketing      | Modelagem        | [raphael59068396@edu.df.senac.br] |
| 8   | Tiago de Andrade Lima        | Modelgem Mapa  | —                | [tiago59068726@edu.df.senac.br]   |

**Integrantes (nomes e e-mails):**  
[Andre Luis Nascimento (andre58212086@edu.df.senac.br);Calebe Feitosa (calebe58107886@edu.df.senac.br);Douglas Vasco (douglas58129016@edu.df.senac.br); Jonas Barbosa (jonas59300436@edu.df.senac.br); Leticia Domingues (leticia49518826@edu.df.senac.br); Pedro Henrique (pedro57951426@edu.df.senac.br); 
Raphael Mendes (raphael59068396@edu.df.senac.br); Tiago Lima (tiago59068726@edu.df.senac.br)]

**Observação Importante:** Todos os integrantes devem ser capazes de explicar qualquer parte do código durante a apresentação. Não há "passageiro".

### 1.2 Identificação

- **NOME_DO_PROJETO:** [Yokai Tales]

- **DESCRICAO_BREVE:** [Jogo eletronico com elementos de Hack & Slash focado em storytelling.]

### 1.3 Localização dos Artefatos

- **LINK_REPOSITORIO_GITHUB:** [AndreBlackDragon/YokaiTales-Webpage · GitHub](https://github.com/AndreBlackDragon/YokaiTales-Webpage)
- **BRANCH_PRINCIPAL:** main
- **LINK_APLICACAO_DEPLOY:** ---
- **LINK_BANCO_DADOS:** https://supabase.com/dashboard/project/thmtriwgvsgxdinsuxphhttps://supabase.com/dashboard/project/thmtriwgvsgxdinsuxph
- **LINK_API_SWAGGER:** ---
- **LINK_DEMONSTRAÇÃO:** [---]

---

## 2. ESTRUTURA DE DIRETÓRIOS DO PROJETO

```
---YokaiTales-Webpage
├───Docs
│   └───requisito
└───src
    └───Rf - 01 Login
```

- **Documentação:** `docs/requisitos/RF - 01 - Login.md` 
- **Código-fonte:** `YokaiTales-Webpage\src\Rf - 01 Login` (HTML + CSS + Javascript)
- **Scripts BD:** `YokaiTales-Webpage\src\Rf - 01 Login\script`
- **API Swagger:** `---` 
- **Aplicação Funcional:** ---

---

## 3. DETALHAMENTO TÉCNICO DE UM REQUISITO FUNCIONAL

---

### RF-01: Login.

```markdown
**ID:** RF-001
**Título:** Login.
**Tipo:** Requisito Funcional
**Prioridade:** ALTA
**Complexidade:** Baixa(1)
**Status:** EM DESENVOLVIMENTO
**Data de Criação:** 25/08/2026
**Última Atualização:** 25/08/2026

**Breve Descrição:**
O site deve ter login e cadastro de usuario para validar o usuario e permitir download do jogo.
```

## 2. DESCRIÇÃO E ATORES

**Objetivo:** Descrever o requisito com clareza e identificar todos os atores envolvidos.

**Descrição Detalhada:**

**Por que este requisito existe?**

O sistema precisa gerenciar informações de usuarios para:

* Validar se o usuario esta apto a fazer o download.

**Contexto do Negócio:**

O site precisa registrar dados de todos os usuarios que desejam fazer download, coletando informações essenciais para identificação.

1. * * *
   
   **Atores do Sistema:**
   
   ### 1. RECEPCIONISTA (Ator Principal)
   
   * **Papel:** Cadastrar novo usuario
   * **Responsabilidade:** Inserir dados corretos, validar informações
   * **Permissões:**
     * ✅ CREATE (criar novo hóspede)
     * ✅ READ (visualizar dados)
     * ❌ UPDATE (não pode editar dados de outros)
     * ❌ DELETE (não pode deletar)
   
   ### 2. GERENTE (Ator Secundário)
   
   * **Papel:** Revisar e corrigir dados de usuario
   * **Responsabilidade:** Supervisionar cadastros, resolver inconsistências
   * **Permissões:**
     * ✅ CREATE, READ, UPDATE, DELETE
   
   ### 3. SISTEMA (Ator Automático)
   
   * **Papel:** Validar dados, armazenar seguramente
   * **Responsabilidade:** Validar formato, aplicar regras de negócio, auditar operações
   * **Permissões:**
     * ✅ Todas operações

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS (20%)

**Objetivo:** Descrever detalhadamente como o requisito é executado e seus RNF.

### Regras de Negócio (RN)

| ID        | Regra             | Descrição                                                |
|:---------:|:----------------- |:-------------------------------------------------------- |
| **RN-01** | Email Único       | Email deve ser único no sistema; não permitir duplicatas |
| **RN-02** | Email Obrigatório | Email não pode estar vazio; mínimo 3 caracteres          |
| **RN-03** |                   |                                                          |
| **RN-04** |                   |                                                          |
| **RN-05** |                   |                                                          |
| **RN-06** |                   |                                                          |
| **RN-07** |                   |                                                          |
| **RN-08** |                   |                                                          |

### Requisitos Não-Funcionais (RNF)

| ID         | Atributo       | Requisito                  | Métrica                 | Justificativa              |
|:----------:|:-------------- |:-------------------------- |:----------------------- |:-------------------------- |
| **RNF-01** | Performance    | Resposta Imediata          | Tempo médio de resposta | Usuário não fica esperando |
| **RNF-03** | Responsividade | O site carrega rapidamente | Tempo de resposta       | Evitar frustação.          |

---

## 🎨 4. PROTÓTIPO FUNCIONAL (HTML + CSS + CÓDIGO + BD + DEPLOY) (40%)

****Descrição de Estados:**

* **Estado Normal:** Todos campos em branco, botões habilitados
* **Estado Erro:** Campo inválido destacado em vermelho com mensagem
* **Estado Loading:** Spinner animado, botões desabilitados
* **Estado Sucesso:** Tela de download do jogo

**Fluxo de Navegação:**

1. Página inicial → Clica "Cadastrar usuario"
2. Abre modal/página de cadastro
3. Preenche dados
4. Clica "Salvar"
5. Se sucesso → Exibe mensagem + volta à Tela Inicial
6. Se erro → Destaca campo + exibe mensagem + mantém dados

**Responsividade:**

* **Mobile (320px):** Layout single-column, campos full-width
* **Tablet (768px):** Layout single-column com padding maior
* **Desktop (1024px+):** Layout potencialmente two-column se apropriado**

---

## 🏗️ 5. ARQUITETURA E ADR (15%)

**Diagrama de Componentes**

### ADR-001: PostgreSQL como Banco de Dados

**Status:** ACEITO

**Contexto:** Dados de Usuario precisam de consistência ACID e escalabilidade.

**Decisão:** Usar PostgreSQL 14+ para armazenar dados de hóspedes.

**Alternativas:** MySQL (menos ACID), MongoDB (sem transações robustas)

**Consequências:** ✅ Seguro e escalável, ⚠️ Requer provisionamento

### ADR-002: REST API com Express.js

**Status:** ACEITO

**Contexto:** API escalável e simples para frontend.

**Decisão:** Express.js 4.18+ com Node.js 18 LTS.

**Consequências:** ✅ Rápido, ✅ JavaScript full-stack

### ADR-003: Validação Backend

**Status:** ACEITO

**Contexto:** Validação precisa em ambos os lados para UX e segurança.

**Decisão:** Frontend + Backend com mesma lógica.

**Consequências:** ✅ Seguro, ✅ Boa UX

### Tecnologias Escolhidas

| Camada   | Tecnologia   | Versão  | Justificativa      |
| -------- | ------------ | ------- | ------------------ |
| Frontend | HTML5 + CSS3 | 2023    | Web padrão         |
| Frontend | JavaScript   | ES2015+ | Interatividade     |
| Backend  | JavaScript   | 18 LTS  | Runtime JavaScript |
| Backend  | JavaScript   | 4.18+   | Performance        |
| BD       | PostgreSQL   | 14+     | ACID, confiável    |
|          |              |         |                    |
|          |              |         |                    |

---

## 📚 7. DOCUMENTAÇÃO API (SWAGGER/OPENAPI) (3%)

**----**

---

## 📊 RESUMO DE PONTUAÇÃO

Para cada requisito funcional (RF-01 a RF-10), a pontuação segue este modelo:

```
┌────────────────────────────────────────────┬──────────┬──────────────┐
│ Tópico de Avaliação                        │ Peso     │ Seu Score    │
├────────────────────────────────────────────┼──────────┼──────────────┤
│ 1. Identificação do Requisito              │ 2%       │ ___/2        │
│ 2. Descrição e Atores                      │ 10%      │ ___/10       │
│ 3. Casos de Uso + Requisitos Não-Func.     │ 20%      │ ___/20       │
│ 4. Protótipo Funcional (HTML+CSS+Código)   │ 40%      │ ___/40       │
│ 5. Arquitetura e ADR                       │ 15%      │ ___/15       │
│ 6. Validação de Segurança OWASP            │ 10%      │ ___/10       │
│ 7. Documentação API (Swagger/OpenAPI)      │ 3%       │ ___/3        │
├────────────────────────────────────────────┼──────────┼──────────────┤
│ TOTAL POR REQUISITO                        │ 100%     │ ___/100      │
└────────────────────────────────────────────┴──────────┴──────────────┘

Fórmula de Cálculo por Requisito:
Score Total (%) = (T1×2%) + (T2×10%) + (T3×20%) + (T4×40%) + (T5×15%) + (T6×10%) + (T7×3%)
                = Score de 0% a 100%

Nota Final da Disciplina:
RF-01 Score × 10% = ___% (pontos para disciplina)
RF-02 Score × 10% = ___% (pontos para disciplina)
...
RF-10 Score × 10% = ___% (pontos para disciplina)
────────────────────────────────────────────────
NOTA FINAL = ___% ✅ APROVADO (≥60%) ou ❌ REPROVADO (<60%)

⚠️ CRÍTICO: Se o Protótipo (Tópico 4) não funcionar = 0% neste tópico = perde 40% da nota do RF
```

---

## ✅ INSTRUÇÕES FINAIS PARA ENTREGA

### Para o Aluno (cada semana):

1. **Crie UM ÚNICO documento por requisito:**
   
   - Exemplo: `docs/requisitos/RF-001-cadastro-hospede.md`
   - Não misture múltiplos RFs no mesmo documento

2. **Implemente o código-fonte COMPLETO:**
   
   - Pasta: `src/rf-001-cadastro-hospede/`
   - Arquivos: `index.html`, `app.js`, `README.md`
   - Código limpo, comentado e funcional

3. **Crie o Script DDL do Banco:**
   
   - Arquivo: `database/ddl/rf-001-hospedes-ddl.sql`
   - Tabelas, constraints, índices, tudo necessário

4. **Crie Documentação Swagger:**
   
   - Arquivo: `docs/api/swagger.json`
   - Documente todos os endpoints do requisito

5. **Deploy a aplicação FUNCIONANDO:**
   
   - GitHub Pages (recomendado) ou Vercel, Netlify
   - Com banco de dados integrado (Supabase, Firebase, etc)
   - URL pública testável pelo professor

6. **Implemente Segurança OWASP:**
   
   - 1 controle implementado (ex: SQL Injection)
   - Com código e teste

7. **Commit no Git:**
   
   ```bash
   git add docs/requisitos/RF-001-cadastro-hospede.md
   git add src/rf-001-cadastro-hospede/
   git add database/ddl/rf-001-hospedes-ddl.sql
   git add docs/api/swagger.json
   git commit -m "[RF-001] Cadastro de Hóspede - Completo + Deploy + Swagger + Segurança OWASP"
   git push origin develop
   ```

8. **Entregue no Moodle:**
   
   - Arquivo Markdown: `RF-001-cadastro-hospede.md`
   - Link GitHub: `https://github.com/seu-usuario/seu-repo`
   - URL da Aplicação: `https://seu-usuario.github.io/seu-repo/rf-001`
   - URL da API Docs: `https://seu-backend.render.com/api-docs`
   - Credenciais de Teste (se necessário)

---

## ✅ CHECKLIST FINAL — PERCENTUAIS (Total = 100%)

Preencha este checklist ao finalizar cada entrega:

```
REQUISITO FUNCIONAL: RF-XXX - NOME DO REQUISITO
═════════════════════════════════════════════════════════════════

TÓPICO 1: IDENTIFICAÇÃO DO REQUISITO (2%)
════════════════════════════════════════════════
☑ ID do requisito presente (RF-XXX)
☑ Título claro e descritivo
☑ Prioridade definida (Alta/Média/Baixa)
☑ Complexidade estimada em story points

STATUS: ___/2 | Percentual: ___%

---

TÓPICO 2: DESCRIÇÃO E ATORES (10%)
════════════════════════════════════════════════
☑ Descrição detalhada do requisito
☑ Objetivo de negócio claro (3+ benefícios)
☑ Mínimo 3 atores identificados
☑ Papel e responsabilidade de cada ator
☑ Permissões mapeadas (CRUD)

STATUS: ___/10 | Percentual: ___%

---

TÓPICO 3: CASOS DE USO + RNF (20%)
════════════════════════════════════════════════
☑ Pré-condições definidas (mín. 3)
☑ Pós-condições definidas (sucesso e falha)
☑ Fluxo principal com 8+ passos
☑ Mínimo 3 fluxos alternativos
☑ Mínimo 6 Regras de Negócio
☑ Mínimo 3 Requisitos Não-Funcionais

STATUS: ___/20 | Percentual: ___%

---

TÓPICO 4: PROTÓTIPO FUNCIONAL (40%) ⚠️ CRÍTICO
════════════════════════════════════════════════════════════════
☑ Arquivo `index.html` com CSS embutido criado
☑ Código-fonte COMPLETO na linguagem escolhida
☑ Script DDL do banco criado
☑ HTML semanticamente correto
☑ CSS responsivo (mobile 320px + desktop 1024px)
☑ Mínimo 5 telas diferentes (vazio, preenchido, erro, loading, sucesso)
☑ Validação visual (borda verde/vermelha, checkmark)
☑ Mensagens de erro claras
☑ Dados persistindo em banco de dados
☑ Aplicação FUNCIONANDO em URL pública
☑ Demonstração prática durante apresentação

⚠️ SEM FUNCIONALIDADE COMPLETA: RECEBE 0% NESTE TÓPICO = PERDE 40%!

STATUS: ___/40 | Percentual: ___%

---

TÓPICO 5: ARQUITETURA E ADR (15%)
════════════════════════════════════════════════
☑ Diagrama de arquitetura claro
☑ Mínimo 4 ADRs estruturados
☑ Cada ADR com: Status, Contexto, Decisão, Alternativas
☑ Tecnologias justificadas
☑ Fluxo de dados documentado

STATUS: ___/15 | Percentual: ___%

---

TÓPICO 6: VALIDAÇÃO DE SEGURANÇA OWASP (10%)
════════════════════════════════════════════════
☑ Mínimo 1 controle OWASP (máximo 3)
☑ Controle com: Vulnerabilidade → Implementação → Teste
☑ Código-fonte mostrando proteção
☑ Testes de segurança documentados
☑ Screenshots ou evidência de testes

STATUS: ___/10 | Percentual: ___%

---

TÓPICO 7: DOCUMENTAÇÃO API (SWAGGER/OPENAPI) (3%)
════════════════════════════════════════════════════════════════
☑ Arquivo swagger.json ou openapi.yaml criado
☑ Todos os endpoints POST/GET documentados
☑ Modelos de requisição/resposta definidos
☑ Códigos HTTP documentados (200, 201, 400, 401, 409)
☑ Autenticação documentada (JWT/Bearer Token)

STATUS: ___/3 | Percentual: ___%

---

RESULTADO FINAL POR REQUISITO
════════════════════════════════════════════════════════════════

T1 (2%):   ___/2   × 2%   = ___% do total
T2 (10%):  ___/10  × 10%  = ___% do total
T3 (20%):  ___/20  × 20%  = ___% do total
T4 (40%):  ___/40  × 40%  = ___% do total (FUNCIONAL: ✅ / ❌)
T5 (15%):  ___/15  × 15%  = ___% do total
T6 (10%):  ___/10  × 10%  = ___% do total
T7 (3%):   ___/3   × 3%   = ___% do total
           ─────────────────────────────────────
TOTAL:     ___/100 = ___% 

✅ ACEITO (≥ 60%) ou ❌ REPROVADO (< 60%)
```

---

## APÊNDICE A: CHECKLIST DE PREENCHIMENTO INICIAL

Antes de entregar este documento, confirme que:

- [ ] **Seção 1 (Metadados):** Preenchida com nome, descrição, repositório
- [ ] **Seção 2 (Estrutura):** Compreendida e criada no GitHub
- [ ] **Seção 3 (Detalhamento):** Completa para o RF com:
  - [ ] Identificação (2%) ✓
  - [ ] Descrição e Atores (10%) ✓
  - [ ] Casos de Uso + RNF (20%) ✓
  - [ ] Protótipo Funcional (40%) ✓
  - [ ] Arquitetura e ADR (15%) ✓
  - [ ] Validação OWASP (10%) ✓
  - [ ] Documentação Swagger (3%) ✓
- [ ] **Documentação:** Um ÚNICO arquivo MD por RF
- [ ] **Código-fonte:** Completo no repositório GitHub
- [ ] **Script DDL:** Criado em database/ddl/
- [ ] **Swagger/OpenAPI:** Criado em docs/api/
- [ ] **Segurança OWASP:** 1-3 controles implementados
- [ ] **Deploy:** Aplicação FUNCIONANDO em URL pública
- [ ] **Testes:** Evidência de funcionalidade comprovada

---

**Documento de Requisitos v12.2**  
**Laboratório de Inovação III — FACSENAC — Prof. Edilberto Silva 2026**

*"Qualidade, Segurança e Funcionalidade = Sucesso!"*  
*"Fé, Força e Foco!"* 🚀
