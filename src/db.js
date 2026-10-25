'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { hashSenha } = require('./auth');

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  email TEXT,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'Funcionario' CHECK (perfil IN ('Administrador','Gerente','Funcionario')),
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS produto (
  id_produto INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  id_categoria INTEGER REFERENCES categoria(id_categoria),
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade_atual REAL NOT NULL DEFAULT 0,
  estoque_minimo REAL NOT NULL DEFAULT 0,
  preco_custo REAL,
  preco_venda REAL,
  validade TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS movimentacao (
  id_movimentacao INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produto INTEGER NOT NULL REFERENCES produto(id_produto),
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  motivo TEXT NOT NULL,
  quantidade REAL NOT NULL,
  data_hora TEXT NOT NULL,
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS fornecedor (
  id_fornecedor INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS sessao (
  token TEXT PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
  criada_em TEXT NOT NULL,
  expira_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracao (
  chave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE INDEX IF NOT EXISTS idx_mov_produto ON movimentacao(id_produto);
CREATE INDEX IF NOT EXISTS idx_mov_data ON movimentacao(data_hora);
`;

function abrirBanco(caminho) {
  if (caminho !== ':memory:') {
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
  }
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(ESQUEMA);
  seedarBanco(db);
  return db;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dataISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Data relativa à data atual, limitada ao início do mês corrente (mantém o
// dashboard "este mês" coerente mesmo nos primeiros dias do mês).
function dataRelativa(diasAtras, hora) {
  const agora = new Date();
  const alvo = new Date(agora.getTime() - diasAtras * 86400000);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  if (alvo < inicioMes) {
    return `${dataISO(inicioMes)}T${hora}`;
  }
  return `${dataISO(alvo)}T${hora}`;
}

function validadeEm(dias) {
  return dataISO(new Date(Date.now() + dias * 86400000));
}

function seedarBanco(db) {
  const jaTemDados = db.prepare('SELECT COUNT(*) AS n FROM usuario').get().n;
  if (jaTemDados > 0) return;

  db.exec('BEGIN');

  const inserirUsuario = db.prepare(
    'INSERT INTO usuario (nome, usuario, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, ?, 1)'
  );
  inserirUsuario.run('Administrador do Sistema', 'admin', 'admin@padaria.com.br', hashSenha('admin123'), 'Administrador');
  inserirUsuario.run('Gerente da Padaria', 'gerente', 'gerente@padaria.com.br', hashSenha('gerente123'), 'Gerente');
  inserirUsuario.run('Funcionário de Estoque', 'funcionario', 'funcionario@padaria.com.br', hashSenha('funcionario123'), 'Funcionario');

  const inserirCategoria = db.prepare('INSERT INTO categoria (nome) VALUES (?)');
  const idsCategoria = {};
  for (const nome of ['Pães', 'Bolos', 'Doces', 'Salgados', 'Bebidas', 'Laticínios']) {
    idsCategoria[nome] = Number(inserirCategoria.run(nome).lastInsertRowid);
  }

  const inserirConfig = db.prepare('INSERT INTO configuracao (chave, valor) VALUES (?, ?)');
  const configuracoes = {
    nome_padaria: 'Padaria Pão Dourado',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Palmeiras, 123 - Centro - São Paulo/SP',
    telefone: '(11) 3456-7890',
    email: 'contato@paodourado.com.br',
    dias_alerta_validade: '7',
  };
  for (const [chave, valor] of Object.entries(configuracoes)) inserirConfig.run(chave, valor);

  const inserirFornecedor = db.prepare('INSERT INTO fornecedor (nome, telefone, email) VALUES (?, ?, ?)');
  inserirFornecedor.run('Moinho Santa Clara', '(11) 3456-7890', 'contato@moinhosantaclara.com.br');
  inserirFornecedor.run('Distribuidora Bom Sabor', '(11) 98765-4321', 'vendas@bomsabor.com.br');
  inserirFornecedor.run('Laticínios Serra Verde', '(11) 2233-4455', 'contato@serraverde.com.br');

  // [nome, categoria, unidade, estoque_minimo, custo, venda, validade(+dias|null),
  //  entradas [[qtd, diasAtras, motivo]], saidas [[qtd, diasAtras, motivo]]]
  const produtos = [
    ['Pão Francês', 'Pães', 'un', 50, 0.35, 0.8, null, [[200, 18, 'producao'], [150, 8, 'producao']], [[85, 12, 'venda'], [40, 5, 'venda'], [25, 2, 'venda']]],
    ['Pão de Queijo', 'Salgados', 'un', 30, 1.1, 3.5, null, [[120, 15, 'producao']], [[98, 6, 'venda']]],
    ['Bolo de Chocolate', 'Bolos', 'un', 5, 18, 45, 10, [[15, 12, 'producao']], [[12, 7, 'venda']]],
    ['Brigadeiro', 'Doces', 'un', 40, 1.2, 3, 12, [[100, 16, 'producao']], [[95, 8, 'venda']]],
    ['Coxinha', 'Salgados', 'un', 30, 1.8, 5, 3, [[80, 14, 'producao']], [[55, 7, 'venda']]],
    ['Croissant', 'Pães', 'un', 20, 2.2, 6, 8, [[60, 10, 'producao']], [[58, 3, 'venda']]],
    ['Sonho', 'Doces', 'un', 15, 1.5, 4, 9, [[40, 10, 'producao']], [[22, 4, 'venda']]],
    ['Refrigerante Lata', 'Bebidas', 'un', 24, 3.2, 6, 200, [[72, 9, 'compra']], [[30, 2, 'venda']]],
    ['Leite Integral', 'Laticínios', 'L', 20, 3.8, 5.5, 3, [[60, 6, 'compra']], [[35, 2, 'venda']]],
    ['Manteiga', 'Laticínios', 'un', 10, 6.5, 11, 45, [[30, 5, 'compra']], [[12, 1, 'venda']]],
    ['Café em Grãos', 'Bebidas', 'kg', 8, 28, 55, 200, [[25, 4, 'compra']], [[9, 1, 'consumo']]],
    ['Farinha de Trigo', 'Pães', 'kg', 10, 3.4, 7, 120, [[50, 3, 'compra']], [[30, 1, 'consumo']]],
    ['Suco de Laranja', 'Bebidas', 'L', 12, 4.5, 9, 2, [[36, 4, 'compra']], [[20, 1, 'venda']]],
  ];

  const inserirProduto = db.prepare(`
    INSERT INTO produto (codigo, nome, id_categoria, unidade, quantidade_atual, estoque_minimo, preco_custo, preco_venda, validade, ativo)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`);
  const inserirMov = db.prepare(`
    INSERT INTO movimentacao (id_produto, id_usuario, tipo, motivo, quantidade, data_hora, observacao)
    VALUES (?, 1, ?, ?, ?, ?, NULL)`);

  produtos.forEach(([nome, categoria, unidade, minimo, custo, venda, validade, entradas, saidas], i) => {
    const codigo = `PRD-${String(i + 1).padStart(4, '0')}`;
    const idProduto = Number(inserirProduto.run(codigo, nome, idsCategoria[categoria], unidade, minimo, custo, venda, validade === null ? null : validadeEm(validade)).lastInsertRowid);
    for (const [qtd, dias, motivo] of entradas) inserirMov.run(idProduto, 'entrada', motivo, qtd, dataRelativa(dias, '08:00:00'));
    for (const [qtd, dias, motivo] of saidas) inserirMov.run(idProduto, 'saida', motivo, qtd, dataRelativa(dias, '14:30:00'));
    db.prepare(`
      UPDATE produto SET quantidade_atual = (
        SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN quantidade ELSE -quantidade END), 0)
        FROM movimentacao WHERE id_produto = ?
      ) WHERE id_produto = ?`).run(idProduto, idProduto);
  });

  db.exec('COMMIT');
}

module.exports = { abrirBanco };
