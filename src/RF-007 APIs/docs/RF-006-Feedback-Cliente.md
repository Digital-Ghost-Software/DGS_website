# 📋 DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITO FUNCIONAL

## Digital Ghost Software — Yokai Tales — 2026

---

## 1. METADADOS DO PROJETO E DA EQUIPE

### 1.1 Composição da Equipe

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

### 1.2 Identificação

- **NOME_DO_PROJETO:** Digital Ghost Software — Yokai Tales
- **Descrição:** Jogo digital "Yokai Tales" e plataforma web institucional da Digital Ghost Software (DGS_website).
- **DESCRICAO_BREVE:** Módulo de interface e infraestrutura para coleta e gerenciamento de feedback de clientes (reporte de bugs, sugestões e avaliações) submetidos através do site.

### 1.3 Localização dos Artefatos

- **LINK_REPOSITORIO_GITHUB:** https://github.com/Digital-Ghost-Software/DGS_website
- **BRANCH_PRINCIPAL:** main

---

## 2. ESTRUTURA DE DIRETÓRIOS DO PROJETO

Para garantir um padrão de "MD Limpo" e isolar adequadamente o código-fonte da documentação técnica, o projeto deve adotar a seguinte taxonomia, não misturando o site com as definições de requisitos:

```text
DGS_website/
├── docs/
│   ├── requisitos/
│   │   └── rf-007-feedback-do-cliente.md (ESTE ARQUIVO)
├── src/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── api/
│       └── feedback.js
└── README.md



🎯 3. IDENTIFICAÇÃO DO REQUISITO
--------------------------------

* **ID:** RF-007

* **Título:** Feedback do Cliente

* **Tipo:** Requisito Funcional

* **Prioridade:** MÉDIA

* **Complexidade:** MÉDIA (5 story points)

* **Status:** EM DESENVOLVIMENTO

**Breve Descrição:**

O site deverá possuir uma seção para que o cliente envie mensagens com críticas construtivas ou bugs encontrados em _Yokai Tales_. O sistema deve recepcionar essa requisição, validar a sanitização dos campos e inserir o registro em um banco de dados relacional para consulta da equipe.
------------------------

📋 4. DESCRIÇÃO E ATORES
------------------------

**Por que este requisito existe?**

Sem um canal centralizado de escuta, a equipe de engenharia perde a capacidade de medir a satisfação do cliente e encontrar erros silenciosos. A captação do feedback estrutura a melhoria do software.

### Atores do Sistema

1. **CLIENTE (Ator Principal):** Acessa a página na web e insere sua manifestação/feedback.

2. **SISTEMA (Ator Automático):** Escuta a chamada (frontend), verifica as regras de tamanho e sintaxe dos dados, previne ataques (XSS/Injeção) e persiste o feedback de forma autônoma.

3. **ADMINISTRADOR (Ator Secundário):** Membro da Digital Ghost Software que consumirá essa base de dados para priorizar as correções no roadmap.

🔄 5. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS
---------------------------------------------------------------

### Caso de Uso (UC-007): Submeter Formulário de Feedback

#### Pré-Condições

* O cliente conseguiu carregar a interface gráfica originada do repositório `DGS_website`.

* A API receptora (backend) está no ar e consegue se conectar com a base de dados.

#### Pós-Condições (Sucesso)

* Os dados são injetados na tabela de feedbacks com a marcação de data/hora correta.

* É retornado o status HTTP 200/201 ao cliente com uma mensagem de confirmação visual: _"Feedback enviado e registrado. Obrigado!"_.

#### Pós-Condições (Falha)

* A inserção não ocorre se os critérios não forem satisfeitos.

* O cliente visualizará qual campo está incorreto ou violou as regras.

#### Fluxo Principal

1. Cliente navega até a rota de contato/feedback.

2. O formulário apresenta os campos: **Nome**, **E-mail**, **Categoria** e **Mensagem**.

3. O cliente preenche os dados e submete a operação.

4. O JavaScript do cliente processa uma pré-validação.

5. A API do servidor faz a sanitização pesada e checa as regras de negócio.

6. A API insere os dados no banco de forma segura.

7. O sistema finaliza a requisição mostrando sucesso.

#### Regras de Negócio e Ordenação

* **RN-01:** O campo e-mail exige formato válido com o símbolo "@" nativo.

* **RN-02:** A mensagem não pode ser ínfima; deve ter entre 15 e 1000 caracteres.

* **RN-03:** Caso seja desenvolvido um painel interno administrativo para listagem dos feedbacks dos clientes, os dados deverão ser ordenados para facilitar a leitura. Pode-se adotar algoritmos simples, como o _Selection Sort_ e o _Insertion Sort_, para conjuntos muito pequenos. Se o volume de feedbacks diários do _Yokai Tales_ se tornar muito denso, a equipe de desenvolvimento deve optar por métodos mais eficientes que utilizam divisão e conquista, como o _Quick Sort_, que opera com complexidade de $O(n \log n)$ nos melhores casos.
