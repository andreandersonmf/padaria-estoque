'use strict';

const crypto = require('node:crypto');

const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function senhaConfere(senha, armazenada) {
  try {
    const [salt, hash] = String(armazenada).split(':');
    const tentativa = crypto.scryptSync(senha, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(tentativa, 'hex'));
  } catch {
    return false;
  }
}

function criarSessao(db, idUsuario) {
  const token = crypto.randomBytes(32).toString('hex');
  const agora = new Date();
  const expira = new Date(agora.getTime() + DURACAO_SESSAO_MS);
  db.prepare('DELETE FROM sessao WHERE expira_em < ?').run(agora.toISOString());
  db.prepare('INSERT INTO sessao (token, id_usuario, criada_em, expira_em) VALUES (?, ?, ?, ?)')
    .run(token, idUsuario, agora.toISOString(), expira.toISOString());
  return token;
}

function encerrarSessao(db, token) {
  if (token) db.prepare('DELETE FROM sessao WHERE token = ?').run(token);
}

function parseCookies(cabecalho) {
  const cookies = {};
  for (const parte of String(cabecalho || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return cookies;
}

function usuarioDaRequisicao(db, req) {
  const token = parseCookies(req.headers.cookie).sessao;
  if (!token) return null;
  const linha = db.prepare(`
    SELECT u.id_usuario, u.nome, u.usuario, u.email, u.perfil, u.ativo, s.expira_em
    FROM sessao s
    JOIN usuario u ON u.id_usuario = s.id_usuario
    WHERE s.token = ?`).get(token);
  if (!linha) return null;
  if (new Date(linha.expira_em).getTime() < Date.now()) {
    encerrarSessao(db, token);
    return null;
  }
  if (!linha.ativo) return null;
  return linha;
}

const PERFIS = { Administrador: 3, Gerente: 2, Funcionario: 1 };

function nivel(usuario) {
  return usuario ? (PERFIS[usuario.perfil] || 0) : 0;
}

module.exports = { hashSenha, senhaConfere, criarSessao, encerrarSessao, usuarioDaRequisicao, nivel, PERFIS };
