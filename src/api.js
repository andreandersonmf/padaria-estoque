'use strict';

const { hashSenha, senhaConfere, criarSessao, encerrarSessao, usuarioDaRequisicao, nivel, PERFIS } = require('./auth');
const { parseCookies } = require('./auth');

const UNIDADES = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct', 'dz'];
const MOTIVOS = {
  entrada: ['compra', 'producao', 'devolucao'],
  saida: ['venda', 'consumo', 'perda', 'descarte'],
};
const CHAVES_CONFIG = ['nome_padaria', 'cnpj', 'endereco', 'telefone', 'email', 'dias_alerta_validade'];

function enviar(res, status, objeto) {
  const corpo = JSON.stringify(objeto);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(corpo);
}

function falha(res, status, mensagem) {
  enviar(res, status, { erro: mensagem });
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (pedaco) => {
      dados += pedaco;
      if (dados.length > 1e6) {
        reject(new Error('Corpo da requisição muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!dados.trim()) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function numero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dataHoraLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function dataISO(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function eDataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function usuarioPublico(u) {
  return { id_usuario: u.id_usuario, nome: u.nome, usuario: u.usuario, email: u.email, perfil: u.perfil, ativo: !!u.ativo };
}

function exigir(db, req, res) {
  const u = usuarioDaRequisicao(db, req);
  if (!u) falha(res, 401, 'Sessão expirada. Faça login novamente.');
  return u || null;
}

function exigirPerfil(db, req, res, perfilMinimo) {
  const u = exigir(db, req, res);
  if (!u) return null;
  if (nivel(u) < nivel({ perfil: perfilMinimo })) {
    falha(res, 403, 'Permissão negada para o seu perfil.');
    return null;
  }
  return u;
}

function configValores(db) {
  const linhas = db.prepare('SELECT chave, valor FROM configuracao').all();
  const config = {};
  for (const { chave, valor } of linhas) config[chave] = valor;
  return config;
}

// ---------- Autenticação ----------

async function login(db, req, res) {
  const corpo = await lerCorpo(req);
  const usuario = String(corpo.usuario || '').trim().toLowerCase();
  const senha = String(corpo.senha || '');
  if (!usuario || !senha) return falha(res, 400, 'Informe usuário e senha.');
  const u = db.prepare('SELECT * FROM usuario WHERE LOWER(usuario) = ?').get(usuario);
  if (!u || !senhaConfere(senha, u.senha_hash)) return falha(res, 401, 'Usuário ou senha incorretos.');
  if (!u.ativo) return falha(res, 403, 'Usuário inativo. Procure o administrador.');
  const token = criarSessao(db, u.id_usuario);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
  });
  res.end(JSON.stringify({ usuario: usuarioPublico(u) }));
}

function logout(db, req, res) {
  encerrarSessao(db, parseCookies(req.headers.cookie).sessao);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': 'sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
  });
  res.end(JSON.stringify({ ok: true }));
}

function sessao(db, req, res) {
  const u = usuarioDaRequisicao(db, req);
  if (!u) return falha(res, 401, 'Não autenticado.');
  enviar(res, 200, { usuario: usuarioPublico(u) });
}

// ---------- Dashboard e alertas ----------

function obterConfigAlerta(db) {
  const linha = db.prepare("SELECT valor FROM configuracao WHERE chave = 'dias_alerta_validade'").get();
  return Math.max(0, Number(linha?.valor || 7));
}

function listarAlertas(db, diasAlerta) {
  const hoje = new Date();
  const limite = new Date(hoje.getTime() + diasAlerta * 86400000);
  const alertaEstoque = db.prepare(`
    SELECT p.id_produto, p.codigo, p.nome, p.quantidade_atual, p.estoque_minimo, p.unidade, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.ativo = 1 AND p.quantidade_atual <= p.estoque_minimo
    ORDER BY p.nome`).all();
  const alertaValidade = db.prepare(`
    SELECT p.id_produto, p.codigo, p.nome, p.validade, p.unidade, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.ativo = 1 AND p.validade IS NOT NULL AND p.validade >= ? AND p.validade <= ?
    ORDER BY p.validade`).all(dataISO(hoje), dataISO(limite));
  return { alertaEstoque, alertaValidade };
}

async function dashboard(db, req, res) {
  const u = exigir(db, req, res);
  if (!u) return;
  const mes = dataHoraLocal().slice(0, 7);
  const produtosAtivos = db.prepare('SELECT COUNT(*) AS n FROM produto WHERE ativo = 1').get().n;
  const estoqueBaixo = db.prepare('SELECT COUNT(*) AS n FROM produto WHERE ativo = 1 AND quantidade_atual <= estoque_minimo').get().n;
  const entradasMes = db.prepare(
    "SELECT COALESCE(SUM(quantidade), 0) AS total FROM movimentacao WHERE tipo = 'entrada' AND substr(data_hora, 1, 7) = ?"
  ).get(mes).total;
  const saidasMes = db.prepare(
    "SELECT COALESCE(SUM(quantidade), 0) AS total FROM movimentacao WHERE tipo = 'saida' AND substr(data_hora, 1, 7) = ?"
  ).get(mes).total;
  const ultimas = db.prepare(`
    SELECT m.id_movimentacao, m.tipo, m.motivo, m.quantidade, m.data_hora, m.observacao,
           p.nome AS produto_nome, u.nome AS usuario_nome
    FROM movimentacao m
    JOIN produto p ON p.id_produto = m.id_produto
    JOIN usuario u ON u.id_usuario = m.id_usuario
    ORDER BY m.data_hora DESC, m.id_movimentacao DESC
    LIMIT 8`).all();
  const diasAlerta = obterConfigAlerta(db);
  const alertas = listarAlertas(db, diasAlerta);
  enviar(res, 200, { produtosAtivos, estoqueBaixo, entradasMes, saidasMes, ultimas, diasAlerta, ...alertas });
}

// ---------- Produtos ----------

async function listarProdutos(db, req, res, params, url) {
  const u = exigir(db, req, res);
  if (!u) return;
  const busca = (url.searchParams.get('busca') || '').trim();
  const base = `
    SELECT p.id_produto, p.codigo, p.nome, p.id_categoria, p.unidade, p.quantidade_atual,
           p.estoque_minimo, p.preco_custo, p.preco_venda, p.validade, p.ativo, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria`;
  let linhas;
  if (busca) {
    const q = `%${busca}%`;
    linhas = db.prepare(`${base} WHERE p.nome LIKE ? OR p.codigo LIKE ? OR c.nome LIKE ? ORDER BY p.nome`).all(q, q, q);
  } else {
    linhas = db.prepare(`${base} ORDER BY p.nome`).all();
  }
  enviar(res, 200, { produtos: linhas });
}

function obterProduto(db, res, id) {
  const produto = db.prepare(`
    SELECT p.*, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.id_produto = ?`).get(id);
  if (!produto) falha(res, 404, 'Produto não encontrado.');
  return produto;
}

function validarCamposProduto(corpo, parcial = false) {
  const erros = [];
  const nome = String(corpo.nome || '').trim();
  if (!parcial && !nome) erros.push('Informe o nome do produto.');
  const unidade = parcial ? undefined : String(corpo.unidade || 'un');
  if (!parcial && !UNIDADES.includes(unidade)) erros.push('Unidade de medida inválida.');
  const minimo = corpo.estoque_minimo === undefined ? undefined : numero(corpo.estoque_minimo);
  if (minimo !== undefined && (minimo === null || minimo < 0)) erros.push('Estoque mínimo inválido.');
  const custo = corpo.preco_custo === undefined || corpo.preco_custo === '' || corpo.preco_custo === null ? undefined : numero(corpo.preco_custo);
  if (custo !== undefined && (custo === null || custo < 0)) erros.push('Preço de custo inválido.');
  const venda = corpo.preco_venda === undefined || corpo.preco_venda === '' || corpo.preco_venda === null ? undefined : numero(corpo.preco_venda);
  if (venda !== undefined && (venda === null || venda < 0)) erros.push('Preço de venda inválido.');
  const validade = corpo.validade === undefined ? undefined : String(corpo.validade || '').trim();
  if (validade !== undefined && validade !== '' && !eDataValida(validade)) erros.push('Data de validade inválida.');
  if (corpo.id_categoria !== undefined && corpo.id_categoria !== null && corpo.id_categoria !== '') {
    if (!Number.isInteger(Number(corpo.id_categoria))) erros.push('Categoria inválida.');
  }
  return { erros, nome, unidade, minimo, custo, venda, validade: validade === '' ? null : validade };
}

async function criarProduto(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const corpo = await lerCorpo(req);
  const { erros, nome, unidade, minimo, custo, venda, validade } = validarCamposProduto(corpo);
  if (erros.length) return falha(res, 400, erros[0]);
  const idCategoria = corpo.id_categoria ? Number(corpo.id_categoria) : null;
  if (idCategoria && !db.prepare('SELECT id_categoria FROM categoria WHERE id_categoria = ?').get(idCategoria)) {
    return falha(res, 400, 'Categoria não encontrada.');
  }
  db.exec('BEGIN');
  try {
    const info = db.prepare(`
      INSERT INTO produto (codigo, nome, id_categoria, unidade, quantidade_atual, estoque_minimo, preco_custo, preco_venda, validade, ativo)
      VALUES ('', ?, ?, ?, 0, ?, ?, ?, ?, 1)`).run(nome, idCategoria, unidade, minimo ?? 0, custo ?? null, venda ?? null, validade ?? null);
    const id = Number(info.lastInsertRowid);
    const codigo = `PRD-${String(id).padStart(4, '0')}`;
    db.prepare('UPDATE produto SET codigo = ? WHERE id_produto = ?').run(codigo, id);
    db.exec('COMMIT');
    const produto = obterProduto(db, res, id);
    enviar(res, 201, { produto });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

async function atualizarProduto(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const id = Number(params.id);
  if (!obterProduto(db, res, id)) return;
  const corpo = await lerCorpo(req);
  const { erros, minimo, custo, venda, validade } = validarCamposProduto(corpo, true);
  if (erros.length) return falha(res, 400, erros[0]);
  if (corpo.nome !== undefined && !String(corpo.nome).trim()) return falha(res, 400, 'Informe o nome do produto.');
  const idCategoria = corpo.id_categoria ? Number(corpo.id_categoria) : null;
  if (idCategoria && !db.prepare('SELECT id_categoria FROM categoria WHERE id_categoria = ?').get(idCategoria)) {
    return falha(res, 400, 'Categoria não encontrada.');
  }
  const atual = db.prepare('SELECT * FROM produto WHERE id_produto = ?').get(id);
  const novo = {
    nome: corpo.nome !== undefined ? String(corpo.nome).trim() : atual.nome,
    id_categoria: corpo.id_categoria !== undefined ? idCategoria : atual.id_categoria,
    unidade: corpo.unidade !== undefined ? String(corpo.unidade) : atual.unidade,
    estoque_minimo: minimo !== undefined ? minimo : atual.estoque_minimo,
    preco_custo: custo !== undefined ? custo : atual.preco_custo,
    preco_venda: venda !== undefined ? venda : atual.preco_venda,
    validade: validade !== undefined ? validade : atual.validade,
  };
  if (corpo.unidade !== undefined && !UNIDADES.includes(novo.unidade)) return falha(res, 400, 'Unidade de medida inválida.');
  db.prepare(`
    UPDATE produto SET nome = ?, id_categoria = ?, unidade = ?, estoque_minimo = ?, preco_custo = ?, preco_venda = ?, validade = ?
    WHERE id_produto = ?`).run(novo.nome, novo.id_categoria, novo.unidade, novo.estoque_minimo, novo.preco_custo, novo.preco_venda, novo.validade, id);
  enviar(res, 200, { produto: obterProduto(db, res, id) });
}

async function statusProduto(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const id = Number(params.id);
  if (!obterProduto(db, res, id)) return;
  const corpo = await lerCorpo(req);
  if (typeof corpo.ativo !== 'boolean') return falha(res, 400, 'Informe o novo status do produto.');
  db.prepare('UPDATE produto SET ativo = ? WHERE id_produto = ?').run(corpo.ativo ? 1 : 0, id);
  enviar(res, 200, { produto: obterProduto(db, res, id) });
}

async function obterProdutoPorId(db, req, res, params) {
  const u = exigir(db, req, res);
  if (!u) return;
  const produto = obterProduto(db, res, Number(params.id));
  if (produto) enviar(res, 200, { produto });
}

// ---------- Categorias ----------

async function listarCategorias(db, req, res) {
  const u = exigir(db, req, res);
  if (!u) return;
  const categorias = db.prepare(`
    SELECT c.id_categoria, c.nome, COUNT(p.id_produto) AS total_produtos
    FROM categoria c LEFT JOIN produto p ON p.id_categoria = c.id_categoria
    GROUP BY c.id_categoria ORDER BY c.nome`).all();
  enviar(res, 200, { categorias });
}

async function criarCategoria(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const corpo = await lerCorpo(req);
  const nome = String(corpo.nome || '').trim();
  if (!nome) return falha(res, 400, 'Informe o nome da categoria.');
  const existente = db.prepare('SELECT id_categoria FROM categoria WHERE LOWER(nome) = LOWER(?)').get(nome);
  if (existente) return falha(res, 400, 'Já existe uma categoria com esse nome.');
  const info = db.prepare('INSERT INTO categoria (nome) VALUES (?)').run(nome);
  const id = Number(info.lastInsertRowid);
  enviar(res, 201, { categoria: { id_categoria: id, nome, total_produtos: 0 } });
}

async function atualizarCategoria(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const id = Number(params.id);
  if (!db.prepare('SELECT id_categoria FROM categoria WHERE id_categoria = ?').get(id)) return falha(res, 404, 'Categoria não encontrada.');
  const corpo = await lerCorpo(req);
  const nome = String(corpo.nome || '').trim();
  if (!nome) return falha(res, 400, 'Informe o nome da categoria.');
  const existente = db.prepare('SELECT id_categoria FROM categoria WHERE LOWER(nome) = LOWER(?) AND id_categoria != ?').get(nome, id);
  if (existente) return falha(res, 400, 'Já existe uma categoria com esse nome.');
  db.prepare('UPDATE categoria SET nome = ? WHERE id_categoria = ?').run(nome, id);
  enviar(res, 200, { ok: true });
}

async function excluirCategoria(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const id = Number(params.id);
  if (!db.prepare('SELECT id_categoria FROM categoria WHERE id_categoria = ?').get(id)) return falha(res, 404, 'Categoria não encontrada.');
  const emUso = db.prepare('SELECT COUNT(*) AS n FROM produto WHERE id_categoria = ?').get(id).n;
  if (emUso > 0) return falha(res, 400, 'Não é possível excluir: há produtos usando essa categoria.');
  db.prepare('DELETE FROM categoria WHERE id_categoria = ?').run(id);
  enviar(res, 200, { ok: true });
}

// ---------- Movimentações ----------

async function listarMovimentacoes(db, req, res, params, url) {
  const u = exigir(db, req, res);
  if (!u) return;
  const condicoes = [];
  const valores = [];
  const de = (url.searchParams.get('de') || '').trim();
  const ate = (url.searchParams.get('ate') || '').trim();
  const tipo = (url.searchParams.get('tipo') || '').trim();
  if (eDataValida(de)) { condicoes.push('substr(m.data_hora, 1, 10) >= ?'); valores.push(de); }
  if (eDataValida(ate)) { condicoes.push('substr(m.data_hora, 1, 10) <= ?'); valores.push(ate); }
  if (tipo === 'entrada' || tipo === 'saida') { condicoes.push('m.tipo = ?'); valores.push(tipo); }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const linhas = db.prepare(`
    SELECT m.id_movimentacao, m.tipo, m.motivo, m.quantidade, m.data_hora, m.observacao,
           p.id_produto, p.nome AS produto_nome, p.codigo AS produto_codigo, u.nome AS usuario_nome
    FROM movimentacao m
    JOIN produto p ON p.id_produto = m.id_produto
    JOIN usuario u ON u.id_usuario = m.id_usuario
    ${where}
    ORDER BY m.data_hora DESC, m.id_movimentacao DESC
    LIMIT 300`).all(...valores);
  enviar(res, 200, { movimentacoes: linhas });
}

async function criarMovimentacao(db, req, res) {
  const u = exigir(db, req, res);
  if (!u) return;
  const corpo = await lerCorpo(req);
  const tipo = corpo.tipo;
  if (tipo !== 'entrada' && tipo !== 'saida') return falha(res, 400, 'Tipo de movimentação inválido.');
  const quantidade = numero(corpo.quantidade);
  if (quantidade === null || quantidade <= 0) return falha(res, 400, 'A quantidade deve ser maior que zero.');
  const idProduto = Number(corpo.id_produto);
  const produto = idProduto ? db.prepare('SELECT * FROM produto WHERE id_produto = ?').get(idProduto) : null;
  if (!produto) return falha(res, 400, 'Produto não encontrado.');
  if (!produto.ativo) return falha(res, 400, 'Produto inativo não pode ser movimentado.');
  if (tipo === 'saida' && quantidade > produto.quantidade_atual) {
    return falha(res, 400, `Saldo insuficiente. Estoque atual: ${produto.quantidade_atual} ${produto.unidade}.`);
  }
  const motivo = String(corpo.motivo || '');
  if (!MOTIVOS[tipo].includes(motivo)) return falha(res, 400, 'Motivo inválido para o tipo de movimentação.');
  const data = String(corpo.data || '').trim();
  if (data && !eDataValida(data)) return falha(res, 400, 'Data inválida.');
  const observacao = String(corpo.observacao || '').trim() || null;
  const dataHora = `${data || dataISO()}T${dataHoraLocal().slice(11)}`;
  db.exec('BEGIN');
  try {
    const info = db.prepare(`
      INSERT INTO movimentacao (id_produto, id_usuario, tipo, motivo, quantidade, data_hora, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(produto.id_produto, u.id_usuario, tipo, motivo, quantidade, dataHora, observacao);
    const novoSaldo = tipo === 'entrada' ? produto.quantidade_atual + quantidade : produto.quantidade_atual - quantidade;
    db.prepare('UPDATE produto SET quantidade_atual = ? WHERE id_produto = ?').run(novoSaldo, produto.id_produto);
    db.exec('COMMIT');
    enviar(res, 201, {
      movimentacao: { id_movimentacao: Number(info.lastInsertRowid), tipo, motivo, quantidade, data_hora: dataHora, produto_nome: produto.nome, usuario_nome: u.nome },
      novoSaldo,
    });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ---------- Fornecedores ----------

async function listarFornecedores(db, req, res, params, url) {
  const u = exigir(db, req, res);
  if (!u) return;
  const busca = (url.searchParams.get('busca') || '').trim();
  let linhas;
  if (busca) {
    const q = `%${busca}%`;
    linhas = db.prepare('SELECT * FROM fornecedor WHERE nome LIKE ? OR telefone LIKE ? OR email LIKE ? ORDER BY nome').all(q, q, q);
  } else {
    linhas = db.prepare('SELECT * FROM fornecedor ORDER BY nome').all();
  }
  enviar(res, 200, { fornecedores: linhas });
}

async function criarFornecedor(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const corpo = await lerCorpo(req);
  const nome = String(corpo.nome || '').trim();
  if (!nome) return falha(res, 400, 'Informe o nome do fornecedor.');
  const info = db.prepare('INSERT INTO fornecedor (nome, telefone, email) VALUES (?, ?, ?)')
    .run(nome, String(corpo.telefone || '').trim() || null, String(corpo.email || '').trim() || null);
  enviar(res, 201, { fornecedor: { id_fornecedor: Number(info.lastInsertRowid), nome, telefone: corpo.telefone || null, email: corpo.email || null } });
}

async function atualizarFornecedor(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const id = Number(params.id);
  const atual = db.prepare('SELECT * FROM fornecedor WHERE id_fornecedor = ?').get(id);
  if (!atual) return falha(res, 404, 'Fornecedor não encontrado.');
  const corpo = await lerCorpo(req);
  const nome = String(corpo.nome ?? atual.nome).trim();
  if (!nome) return falha(res, 400, 'Informe o nome do fornecedor.');
  db.prepare('UPDATE fornecedor SET nome = ?, telefone = ?, email = ? WHERE id_fornecedor = ?')
    .run(nome, String(corpo.telefone ?? atual.telefone ?? '').trim() || null, String(corpo.email ?? atual.email ?? '').trim() || null, id);
  enviar(res, 200, { ok: true });
}

async function excluirFornecedor(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const id = Number(params.id);
  const info = db.prepare('DELETE FROM fornecedor WHERE id_fornecedor = ?').run(id);
  if (info.changes === 0) return falha(res, 404, 'Fornecedor não encontrado.');
  enviar(res, 200, { ok: true });
}

// ---------- Usuários ----------

async function listarUsuarios(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const usuarios = db.prepare('SELECT id_usuario, nome, usuario, email, perfil, ativo FROM usuario ORDER BY nome').all();
  enviar(res, 200, { usuarios });
}

function validarUsuario(corpo, parcial = false) {
  const erros = [];
  const nome = String(corpo.nome || '').trim();
  if (!parcial && !nome) erros.push('Informe o nome do usuário.');
  const loginUsuario = String(corpo.usuario || '').trim();
  if (!parcial && !loginUsuario) erros.push('Informe o nome de usuário.');
  if (loginUsuario && !/^[a-zA-Z0-9._-]{3,30}$/.test(loginUsuario)) erros.push('Usuário deve ter 3 a 30 caracteres (letras, números, ponto, traço ou sublinhado).');
  const senha = String(corpo.senha || '');
  if (corpo.senha !== undefined && senha !== '' && senha.length < 4) erros.push('A senha deve ter pelo menos 4 caracteres.');
  if (!parcial && senha.length < 4) erros.push('Informe uma senha com pelo menos 4 caracteres.');
  const perfil = corpo.perfil;
  if (perfil !== undefined && !Object.keys(PERFIS).includes(perfil)) erros.push('Perfil inválido.');
  const email = String(corpo.email || '').trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) erros.push('E-mail inválido.');
  return { erros, nome, loginUsuario, senha, perfil, email: email || null };
}

async function criarUsuario(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const corpo = await lerCorpo(req);
  const { erros, nome, loginUsuario, senha, perfil, email } = validarUsuario(corpo);
  if (erros.length) return falha(res, 400, erros[0]);
  const existente = db.prepare('SELECT id_usuario FROM usuario WHERE LOWER(usuario) = LOWER(?)').get(loginUsuario);
  if (existente) return falha(res, 400, 'Já existe um usuário com esse nome de usuário.');
  const info = db.prepare('INSERT INTO usuario (nome, usuario, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, ?, 1)')
    .run(nome, loginUsuario, email, hashSenha(senha), perfil);
  const novo = db.prepare('SELECT id_usuario, nome, usuario, email, perfil, ativo FROM usuario WHERE id_usuario = ?').get(Number(info.lastInsertRowid));
  enviar(res, 201, { usuario: novo });
}

async function atualizarUsuario(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const id = Number(params.id);
  const atual = db.prepare('SELECT * FROM usuario WHERE id_usuario = ?').get(id);
  if (!atual) return falha(res, 404, 'Usuário não encontrado.');
  const corpo = await lerCorpo(req);
  const { erros, nome, senha, perfil, email } = validarUsuario(corpo, true);
  if (erros.length) return falha(res, 400, erros[0]);
  const novoNome = corpo.nome !== undefined ? String(corpo.nome).trim() : atual.nome;
  if (!novoNome) return falha(res, 400, 'Informe o nome do usuário.');
  const novoPerfil = perfil !== undefined ? perfil : atual.perfil;
  if (id === u.id_usuario && novoPerfil !== 'Administrador') {
    return falha(res, 400, 'Você não pode remover o próprio perfil de Administrador.');
  }
  if (senha) {
    db.prepare('UPDATE usuario SET nome = ?, email = ?, perfil = ?, senha_hash = ? WHERE id_usuario = ?')
      .run(novoNome, email, novoPerfil, hashSenha(senha), id);
  } else {
    db.prepare('UPDATE usuario SET nome = ?, email = ?, perfil = ? WHERE id_usuario = ?').run(novoNome, email, novoPerfil, id);
  }
  const atualizado = db.prepare('SELECT id_usuario, nome, usuario, email, perfil, ativo FROM usuario WHERE id_usuario = ?').get(id);
  enviar(res, 200, { usuario: atualizado });
}

async function statusUsuario(db, req, res, params) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const id = Number(params.id);
  const alvo = db.prepare('SELECT * FROM usuario WHERE id_usuario = ?').get(id);
  if (!alvo) return falha(res, 404, 'Usuário não encontrado.');
  const corpo = await lerCorpo(req);
  if (typeof corpo.ativo !== 'boolean') return falha(res, 400, 'Informe o novo status do usuário.');
  if (corpo.ativo === false) {
    if (id === u.id_usuario) return falha(res, 400, 'Você não pode desativar o próprio usuário.');
    if (alvo.perfil === 'Administrador') {
      const outrosAdmins = db.prepare("SELECT COUNT(*) AS n FROM usuario WHERE perfil = 'Administrador' AND ativo = 1 AND id_usuario != ?").get(id).n;
      if (outrosAdmins === 0) return falha(res, 400, 'Não é possível desativar o último Administrador ativo.');
    }
  }
  db.prepare('UPDATE usuario SET ativo = ? WHERE id_usuario = ?').run(corpo.ativo ? 1 : 0, id);
  db.prepare('DELETE FROM sessao WHERE id_usuario = ?').run(id);
  const atualizado = db.prepare('SELECT id_usuario, nome, usuario, email, perfil, ativo FROM usuario WHERE id_usuario = ?').get(id);
  enviar(res, 200, { usuario: atualizado });
}

// ---------- Configurações e senha ----------

async function obterConfig(db, req, res) {
  const u = exigir(db, req, res);
  if (!u) return;
  enviar(res, 200, { config: configValores(db) });
}

async function salvarConfig(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Administrador');
  if (!u) return;
  const corpo = await lerCorpo(req);
  const upsert = db.prepare(`
    INSERT INTO configuracao (chave, valor) VALUES (?, ?)
    ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`);
  for (const chave of CHAVES_CONFIG) {
    if (corpo[chave] === undefined) continue;
    if (chave === 'dias_alerta_validade') {
      const dias = numero(corpo[chave]);
      if (dias === null || dias < 0 || dias > 365) return falha(res, 400, 'Dias para alerta de validade deve ser um número entre 0 e 365.');
      upsert.run(chave, String(dias));
      continue;
    }
    upsert.run(chave, String(corpo[chave] ?? '').trim());
  }
  enviar(res, 200, { config: configValores(db) });
}

async function alterarSenha(db, req, res) {
  const u = exigir(db, req, res);
  if (!u) return;
  const corpo = await lerCorpo(req);
  const senhaAtual = String(corpo.senhaAtual || '');
  const senhaNova = String(corpo.senhaNova || '');
  const hashAtual = db.prepare('SELECT senha_hash FROM usuario WHERE id_usuario = ?').get(u.id_usuario).senha_hash;
  if (!senhaConfere(senhaAtual, hashAtual)) return falha(res, 400, 'Senha atual incorreta.');
  if (senhaNova.length < 4) return falha(res, 400, 'A nova senha deve ter pelo menos 4 caracteres.');
  db.prepare('UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?').run(hashSenha(senhaNova), u.id_usuario);
  enviar(res, 200, { ok: true });
}

// ---------- Relatórios ----------

async function relatorioProdutos(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const produtos = db.prepare(`
    SELECT p.codigo, p.nome, p.unidade, p.quantidade_atual, p.estoque_minimo, p.preco_custo, p.preco_venda, p.validade, p.ativo, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    ORDER BY p.nome`).all();
  enviar(res, 200, { produtos, config: configValores(db) });
}

async function relatorioMovimentacoes(db, req, res, params, url) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const de = (url.searchParams.get('de') || '').trim();
  const ate = (url.searchParams.get('ate') || '').trim();
  const condicoes = [];
  const valores = [];
  if (de && eDataValida(de)) { condicoes.push('substr(m.data_hora, 1, 10) >= ?'); valores.push(de); }
  if (ate && eDataValida(ate)) { condicoes.push('substr(m.data_hora, 1, 10) <= ?'); valores.push(ate); }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const linhas = db.prepare(`
    SELECT m.tipo, m.motivo, m.quantidade, m.data_hora, m.observacao,
           p.nome AS produto_nome, p.codigo AS produto_codigo, u.nome AS usuario_nome
    FROM movimentacao m
    JOIN produto p ON p.id_produto = m.id_produto
    JOIN usuario u ON u.id_usuario = m.id_usuario
    ${where}
    ORDER BY m.data_hora ASC, m.id_movimentacao ASC`).all(...valores);
  let totalEntradas = 0;
  let totalSaidas = 0;
  for (const l of linhas) {
    if (l.tipo === 'entrada') totalEntradas += l.quantidade;
    else totalSaidas += l.quantidade;
  }
  enviar(res, 200, { linhas, totalEntradas, totalSaidas, de: de || null, ate: ate || null, config: configValores(db) });
}

async function relatorioEstoqueBaixo(db, req, res) {
  const u = exigirPerfil(db, req, res, 'Gerente');
  if (!u) return;
  const produtos = db.prepare(`
    SELECT p.id_produto, p.codigo, p.nome, p.unidade, p.quantidade_atual, p.estoque_minimo, p.validade, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.ativo = 1 AND p.quantidade_atual <= p.estoque_minimo
    ORDER BY (p.quantidade_atual - p.estoque_minimo) ASC, p.nome`).all();
  enviar(res, 200, { produtos, config: configValores(db) });
}

// ---------- Roteamento ----------

const ROTAS = [
  ['POST', '/api/login', login],
  ['POST', '/api/logout', logout],
  ['GET', '/api/sessao', sessao],
  ['GET', '/api/dashboard', dashboard],
  ['GET', '/api/produtos', listarProdutos],
  ['POST', '/api/produtos', criarProduto],
  ['GET', '/api/produtos/:id', obterProdutoPorId],
  ['PUT', '/api/produtos/:id', atualizarProduto],
  ['POST', '/api/produtos/:id/status', statusProduto],
  ['GET', '/api/categorias', listarCategorias],
  ['POST', '/api/categorias', criarCategoria],
  ['PUT', '/api/categorias/:id', atualizarCategoria],
  ['DELETE', '/api/categorias/:id', excluirCategoria],
  ['GET', '/api/movimentacoes', listarMovimentacoes],
  ['POST', '/api/movimentacoes', criarMovimentacao],
  ['GET', '/api/fornecedores', listarFornecedores],
  ['POST', '/api/fornecedores', criarFornecedor],
  ['PUT', '/api/fornecedores/:id', atualizarFornecedor],
  ['DELETE', '/api/fornecedores/:id', excluirFornecedor],
  ['GET', '/api/usuarios', listarUsuarios],
  ['POST', '/api/usuarios', criarUsuario],
  ['PUT', '/api/usuarios/:id', atualizarUsuario],
  ['POST', '/api/usuarios/:id/status', statusUsuario],
  ['GET', '/api/config', obterConfig],
  ['PUT', '/api/config', salvarConfig],
  ['POST', '/api/senha', alterarSenha],
  ['GET', '/api/relatorios/produtos', relatorioProdutos],
  ['GET', '/api/relatorios/movimentacoes', relatorioMovimentacoes],
  ['GET', '/api/relatorios/estoque-baixo', relatorioEstoqueBaixo],
];

function casarRota(metodo, caminho) {
  for (const [m, padrao, handler] of ROTAS) {
    if (m !== metodo) continue;
    const chaves = [];
    const regex = new RegExp('^' + padrao.replace(/:[^/]+/g, (s) => { chaves.push(s.slice(1)); return '([^/]+)'; }) + '$');
    const encontrado = caminho.match(regex);
    if (encontrado) {
      const params = {};
      chaves.forEach((chave, i) => { params[chave] = decodeURIComponent(encontrado[i + 1]); });
      return { handler, params };
    }
  }
  return null;
}

async function tratarApi(db, req, res, url) {
  const rota = casarRota(req.method, url.pathname);
  if (!rota) return falha(res, 404, 'Rota não encontrada.');
  try {
    await rota.handler(db, req, res, rota.params, url);
  } catch (e) {
    console.error('Erro na API:', e);
    if (!res.headersSent) falha(res, 500, 'Erro interno do servidor.');
  }
}

module.exports = { tratarApi };
