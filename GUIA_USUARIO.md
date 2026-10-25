# Guia do Usuário — Sistema de Controle de Estoque de Padaria

Este guia descreve, tela a tela, as operações disponíveis no sistema.

## 1. Acesso ao sistema

1. Execute o `start.bat` (Windows) ou `node server.js` na pasta do projeto.
2. Abra o navegador em `http://localhost:3000`.
3. Informe usuário e senha e clique em **Entrar**.

Credenciais de demonstração: `admin` / `admin123` (Administrador), `gerente` / `gerente123` (Gerente) e `funcionario` / `funcionario123` (Funcionário).

## 2. Tela de Login

Entrada do sistema. Em caso de erro, a mensagem "Usuário ou senha inválidos" é exibida. A sessão expira após 8 horas de inatividade.

## 3. Início (Dashboard)

- **Indicadores**: produtos cadastrados, itens com estoque baixo, entradas e saídas do mês.
- **Alertas**: painéis de *Estoque baixo* e *Validade próxima* (o período de validade é configurável).
- **Últimas movimentações**: lista das 8 operações mais recentes.
- Clicar em um indicador navega para a tela correspondente.

## 4. Produtos

- **Pesquisar**: filtra por código ou nome (busca automática).
- **+ Novo Produto**: abre o formulário de cadastro.
- **Editar** (ícone de lápis): altera dados e estoque do produto.
- **Inativar/Reativar** (ícone de alerta): desativa o produto sem excluir o histórico (RN08).

## 5. Novo Produto

Campos: nome, categoria, unidade, quantidade inicial, estoque mínimo, preço e validade. O código é gerado automaticamente no formato `PRD-0001` e não pode ser repetido (RN01).

## 6. Movimentações

- Selecione o tipo: **Entrada** (compra, produção, devolução) ou **Saída** (venda, consumo, perda, descarte).
- Escolha o produto (o saldo atual é exibido ao lado), informe quantidade e motivo.
- Saídas maiores que o saldo são bloqueadas com a mensagem "Saldo insuficiente" (RN03).
- O histórico abaixo registra data, produto, tipo, quantidade, usuário e motivo de cada operação (RN04).

## 7. Fornecedores

Listagem com busca, cadastro, edição e exclusão de fornecedores (nome, CNPJ, telefone, e-mail). Disponível para Gerente e Administrador.

## 8. Relatórios

- **Relatório de Produtos**: lista completa com estoque, preço e validade.
- **Entradas e Saídas**: escolha o período e clique em **Gerar**; o relatório exibe totais e pode ser impresso.
- **Estoque Baixo**: produtos no estoque mínimo ou abaixo dele.
- Os relatórios abrem em janela com botão **Imprimir** (formato próprio para impressão).

## 9. Usuários

Somente o **Administrador** cadastra, edita e ativa/inativa usuários, definindo o perfil: Administrador, Gerente ou Funcionário. O sistema impede inativar a própria conta ou o último administrador ativo.

## 10. Configurações

- **Dados da empresa**: nome da padaria, CNPJ, endereço, telefone e e-mail (exibidos nos relatórios).
- **Notificações**: dias para o alerta de validade próxima.
- **Segurança**: alteração da própria senha (exige a senha atual).
- **Categorias**: criar, renomear e excluir categorias (exclusão bloqueada se houver produtos vinculados).
