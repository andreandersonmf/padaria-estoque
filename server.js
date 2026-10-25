'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { abrirBanco } = require('./src/db');
const { tratarApi } = require('./src/api');

const PORTA = Number(process.env.PORTA || process.argv[2] || 3000);
const CAMINHO_BANCO = process.env.BANCO || path.join(__dirname, 'dados', 'padaria.db');
const DIR_PUBLICO = path.join(__dirname, 'public');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const db = abrirBanco(CAMINHO_BANCO);

function servirEstatico(res, caminhoUrl) {
  if (caminhoUrl === '/') caminhoUrl = '/index.html';
  const alvo = path.normalize(path.join(DIR_PUBLICO, caminhoUrl));
  if (!alvo.startsWith(DIR_PUBLICO + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acesso negado.');
  }
  fs.readFile(alvo, (erro, dados) => {
    if (erro) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado.');
    }
    const ext = path.extname(alvo).toLowerCase();
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream' });
    res.end(dados);
  });
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    tratarApi(db, req, res, url);
    return;
  }
  servirEstatico(res, url.pathname);
});

servidor.listen(PORTA, () => {
  console.log('Padaria - Sistema de Controle de Estoque');
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
  console.log('Pressione Ctrl+C para encerrar.');
});
