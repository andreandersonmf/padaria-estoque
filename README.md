# Padaria — Sistema Web de Controle de Estoque

Projeto Integrador de Programação Web — UNISA (2026).

Sistema web para controle de estoque de uma padaria de pequeno/médio porte:
cadastro de produtos por categoria, registro de entradas e saídas com motivo e
usuário responsável, alertas de estoque baixo e de validade próxima, histórico
de movimentações, relatórios imprimíveis, fornecedores, usuários com perfis de
acesso e configurações.

## Requisitos

- **Node.js 22.5 ou superior** (recomendado 22+; testado na versão 24).
- Nenhuma dependência externa: o projeto usa apenas módulos nativos do Node
  (incluindo o banco de dados SQLite embutido no próprio Node).
- Qualquer navegador moderno (Chrome, Edge, Firefox).

## Como executar

**Opção 1 — Windows (recomendado):** dê dois cliques em `start.bat`.
O sistema verifica o Node, inicia o servidor e abre o navegador automaticamente.

**Opção 2 — terminal:**

```bash
node server.js
```

Acesse `http://localhost:3000` no navegador.

> O banco de dados `dados/padaria.db` é criado e populado com dados de
> demonstração na primeira execução. Para recomeçar do zero, apague a pasta
> `dados/` e execute novamente.

## Usuários de demonstração

| Usuário     | Senha         | Perfil         | O que pode fazer                                    |
|-------------|---------------|----------------|-----------------------------------------------------|
| admin       | `admin123`    | Administrador  | Tudo: produtos, fornecedores, relatórios, usuários, configurações, categorias |
| gerente     | `gerente123`  | Gerente        | Produtos, movimentações, fornecedores, relatórios e alertas |
| funcionario | `funcionario123` | Funcionário | Dashboard, consulta de produtos e registro de movimentações |

## Funcionalidades (requisitos do documento)

| Requisito | Funcionalidade |
|-----------|----------------|
| RF01 | Autenticação por usuário e senha (hash scrypt + sessão com cookie seguro) |
| RF02 | Cadastro, consulta, edição e inativação de produtos (código único automático) |
| RF03 | Gerenciamento de categorias (em Configurações) |
| RF04 | Registro de entradas (compra/produção/devolução) com atualização do saldo |
| RF05 | Registro de saídas (venda/consumo/perda/descarte) com bloqueio se o saldo for insuficiente |
| RF06 | Alertas de estoque mínimo e de validade próxima no Dashboard |
| RF07 | Relatórios de Produtos, de Entradas e Saídas (por período) e de Estoque Baixo, com impressão |
| RF08 | Gerenciamento de usuários com perfis (Administrador, Gerente, Funcionário) |

Regras de negócio implementadas (RN01–RN08): código único por produto,
quantidade movimentada maior que zero, saída limitada ao saldo disponível,
registro de data/tipo/quantidade/motivo/produto/usuário em toda movimentação,
alerta para produtos no estoque mínimo ou abaixo e inativação em vez de
exclusão física de produtos.

## Testes automatizados

Os 14 casos de teste definidos no plano de testes (CT01 a CT14) estão
implementados em `test/testes.js`:

```bash
node test/testes.js
```

O script sobe o servidor em uma porta isolada com um banco temporário, executa
os casos e imprime o resultado de cada um.

## Estrutura do projeto

```
padaria-estoque/
├── server.js          # Servidor HTTP (rotas + arquivos estáticos)
├── start.bat          # Inicializador para Windows
├── src/
│   ├── db.js          # Esquema relacional (SQLite) e dados de demonstração
│   ├── auth.js        # Hash de senha (scrypt) e sessões
│   └── api.js         # API REST com validações e regras de negócio
├── public/
│   ├── index.html     # Página única (SPA)
│   ├── css/styles.css # Estilos (paleta de padaria)
│   └── js/app.js      # Interface: 9 telas do wireframe
├── test/
│   └── testes.js      # Testes automatizados CT01–CT14
└── dados/             # Banco SQLite (criado automaticamente)
```

## Modelo de dados

Entidades relacionais (SQLite): `usuario`, `categoria`, `produto`,
`movimentacao`, `fornecedor`, `sessao` e `configuracao`, com chaves
primárias, estrangeiras e índices. As movimentações e a atualização de saldo
são executadas em transação, garantindo consistência.

## Observações

- O módulo `node:sqlite` emite um aviso de "experimental" no console do Node;
  é um aviso informativo e não afeta o funcionamento.
- O sistema foi desenvolvido sem frameworks ou bibliotecas externas, rodando
  em qualquer máquina com Node 22+ — inclusive sem conexão com a internet.
