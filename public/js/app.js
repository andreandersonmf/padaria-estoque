'use strict';

/* ==================== Utilitários ==================== */

const $ = (sel) => document.querySelector(sel);

function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtNum(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function fmtMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso) {
  if (!iso) return '—';
  const [d] = String(iso).split('T');
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}`;
}

function fmtDataHora(iso) {
  if (!iso) return '—';
  const [d, t] = String(iso).split('T');
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a} ${t ? t.slice(0, 5) : ''}`.trim();
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diasAte(iso) {
  const alvo = new Date(`${iso}T12:00:00`);
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

function iniciais(nome) {
  const partes = String(nome || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?';
}

/* ==================== Ícones ==================== */

function icone(caminhos, tamanho = 18) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${caminhos}</svg>`;
}

const ICONES = {
  home: () => icone('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
  caixa: () => icone('<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
  setas: () => icone('<path d="M7 4v13"/><path d="m4 14 3 3 3-3"/><path d="M17 20V7"/><path d="m14 10 3-3 3 3"/>'),
  caminhao: () => icone('<path d="M1 5h13v11H1z"/><path d="M14 8h4l4 4v4h-8z"/><circle cx="6" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/>'),
  grafico: () => icone('<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>'),
  usuarios: () => icone('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.6c2.9.3 5 2.1 5.6 4.9"/>'),
  engrenagem: () => icone('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>'),
  alerta: () => icone('<path d="M10.3 3.6 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  relogio: () => icone('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  lapis: () => icone('<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>', 15),
  lixeira: () => icone('<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>', 15),
  energia: () => icone('<path d="M12 3v9"/><circle cx="12" cy="17.5" r="1.5" fill="currentColor" stroke="none"/>', 15),
  imprimir: () => icone('<path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>', 15),
};

function logo(tamanho = 34) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 48 48" fill="none">
    <path d="M10 32c0-9.5 5.5-16.5 14-16.5S38 22.5 38 32c0 5.5-2.6 9.8-6 12H16c-3.4-2.2-6-6.5-6-12z" fill="#c87941"/>
    <path d="M15.5 31c0-4.5 3.5-8 7.5-8.5" stroke="#f6f0e4" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M17 34.5c1.2 2.2 3.2 3.4 5.5 3.6" stroke="#f6f0e4" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M27.5 32.5c1 2 2.8 3.2 4.8 3.4" stroke="#f6f0e4" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M24 13v-3M20.5 10l1.8 1.8M27.5 10l-1.8 1.8" stroke="#a8622f" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

/* ==================== API ==================== */

async function api(caminho, opcoes = {}) {
  const resp = await fetch(caminho, {
    method: opcoes.metodo || (opcoes.corpo !== undefined ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json' },
    body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
  });
  const dados = await resp.json().catch(() => ({}));
  if (resp.status === 401 && estado.usuario) {
    estado.usuario = null;
    rotear();
    throw new Error(dados.erro || 'Sessão expirada. Faça login novamente.');
  }
  if (!resp.ok) throw new Error(dados.erro || 'Erro ao processar a solicitação.');
  return dados;
}

/* ==================== Estado e autenticação ==================== */

const estado = { usuario: null, config: null };

const PERFIS_NIVEL = { Administrador: 3, Gerente: 2, Funcionario: 1 };

function nivelAtual() {
  return PERFIS_NIVEL[estado.usuario?.perfil] || 0;
}

function podeGerenciar() {
  return nivelAtual() >= 2;
}

function eAdministrador() {
  return nivelAtual() >= 3;
}

async function fazerLogin(usuario, senha) {
  const dados = await api('/api/login', { corpo: { usuario, senha } });
  estado.usuario = dados.usuario;
  estado.config = await api('/api/config').then((d) => d.config).catch(() => null);
}

async function fazerLogout() {
  await api('/api/logout', { corpo: {} }).catch(() => {});
  estado.usuario = null;
  location.hash = '#/';
  rotear();
}

/* ==================== Toast, modal e confirmação ==================== */

function toast(mensagem, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = mensagem;
  $('#toast-raiz').appendChild(el);
  setTimeout(() => el.classList.add('sumir'), 3400);
  setTimeout(() => el.remove(), 3900);
}

function abrirModal(html) {
  $('#modal-raiz').innerHTML = `<div class="overlay" id="overlay">${html}</div>`;
  $('#overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModal();
  });
}

function fecharModal() {
  $('#modal-raiz').innerHTML = '';
}

function confirmar(mensagem) {
  return new Promise((resolve) => {
    abrirModal(`
      <div class="modal modal-confirmar">
        <div class="modal-cabecalho"><h3>Confirmar ação</h3></div>
        <div class="modal-corpo"><p>${esc(mensagem)}</p></div>
        <div class="modal-acoes">
          <button class="btn btn-fantasma" id="conf-nao">Cancelar</button>
          <button class="btn btn-perigo" id="conf-sim">Confirmar</button>
        </div>
      </div>`);
    $('#conf-sim').addEventListener('click', () => { fecharModal(); resolve(true); });
    $('#conf-nao').addEventListener('click', () => { fecharModal(); resolve(false); });
  });
}

/* ==================== Layout ==================== */

const MENU = [
  { hash: '#/', rotulo: 'Início', icone: 'home', nivel: 1 },
  { hash: '#/produtos', rotulo: 'Produtos', icone: 'caixa', nivel: 1 },
  { hash: '#/movimentacoes', rotulo: 'Movimentações', icone: 'setas', nivel: 1 },
  { hash: '#/fornecedores', rotulo: 'Fornecedores', icone: 'caminhao', nivel: 2 },
  { hash: '#/relatorios', rotulo: 'Relatórios', icone: 'grafico', nivel: 2 },
  { hash: '#/usuarios', rotulo: 'Usuários', icone: 'usuarios', nivel: 3 },
  { hash: '#/configuracoes', rotulo: 'Configurações', icone: 'engrenagem', nivel: 3 },
];

function layout(conteudo, titulo, hashAtual = location.hash) {
  const u = estado.usuario;
  const itens = MENU.filter((item) => nivelAtual() >= item.nivel).map((item) => {
    let ativo = false;
    if (item.hash === '#/' && (hashAtual === '' || hashAtual === '#/')) ativo = true;
    else if (item.hash !== '#/' && hashAtual.startsWith(item.hash)) ativo = true;
    return `<a href="${item.hash}" class="${ativo ? 'ativo' : ''}">${ICONES[item.icone]()}<span>${item.rotulo}</span></a>`;
  }).join('');
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="logo">${logo()}<div><strong>Padaria</strong><span>Controle de Estoque</span></div></div>
        <nav>${itens}</nav>
        <div class="sidebar-rodape">Projeto Integrador · UNISA</div>
      </aside>
      <div class="principal">
        <header class="topo">
          <div>
            <h1>${esc(titulo)}</h1>
            <div class="subtitulo">${esc(estado.config?.nome_padaria || 'Sistema de Controle de Estoque')}</div>
          </div>
          <div class="usuario-chip">
            <div class="avatar">${esc(iniciais(u.nome))}</div>
            <div><strong>${esc(u.nome)}</strong><span>${esc(u.perfil)}</span></div>
            <button class="btn btn-fantasma btn-pequeno" id="btn-sair">Sair</button>
          </div>
        </header>
        <main class="conteudo">${conteudo}</main>
      </div>
    </div>`;
}

function pintar(html) {
  $('#app').innerHTML = html;
}

function bindSair() {
  $('#btn-sair')?.addEventListener('click', fazerLogout);
}

/* ==================== Tela de Login ==================== */

function renderizarLogin() {
  pintar(`
    <div class="login-pagina">
      <form class="login-card" id="form-login" autocomplete="on">
        <div class="logo-login">${logo(56)}</div>
        <h1>Padaria</h1>
        <p class="subtitulo">Sistema de Controle de Estoque</p>
        <div class="campo">
          <label for="login-usuario">Usuário</label>
          <input id="login-usuario" name="usuario" autocomplete="username" required autofocus>
        </div>
        <div class="campo">
          <label for="login-senha">Senha</label>
          <input id="login-senha" name="senha" type="password" autocomplete="current-password" required>
        </div>
        <div class="login-erro" id="login-erro"></div>
        <button class="btn btn-primario btn-bloco" type="submit">Entrar</button>
        <p class="login-dica">Acesso de demonstração: <b>admin</b> / <b>admin123</b></p>
      </form>
    </div>`);
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const botao = e.target.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await fazerLogin(String(form.get('usuario')), String(form.get('senha')));
      location.hash = '#/';
      rotear();
      toast(`Bem-vindo(a), ${estado.usuario.nome.split(' ')[0]}!`);
    } catch (erro) {
      const caixa = $('#login-erro');
      caixa.textContent = erro.message;
      caixa.classList.add('visivel');
    } finally {
      botao.disabled = false;
    }
  });
}

/* ==================== Dashboard ==================== */

async function renderizarInicio() {
  pintar(layout('<div class="carregando">Carregando...</div>', 'Dashboard'));
  let dados;
  try {
    dados = await api('/api/dashboard');
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Dashboard'));
    return;
  }
  const cards = `
    <div class="cards">
      <div class="card card-metrica" data-ir="#/produtos">
        <div class="icone icone-marrom">${ICONES.caixa()}</div>
        <div><div class="valor">${fmtNum(dados.produtosAtivos)}</div><div class="rotulo">Produtos cadastrados</div></div>
      </div>
      <div class="card card-metrica" data-ir="#/produtos">
        <div class="icone icone-ambar">${ICONES.alerta()}</div>
        <div><div class="valor">${fmtNum(dados.estoqueBaixo)}</div><div class="rotulo">Estoque baixo</div></div>
      </div>
      <div class="card card-metrica" data-ir="#/movimentacoes">
        <div class="icone icone-verde">${ICONES.setas()}</div>
        <div><div class="valor">${fmtNum(dados.entradasMes)}</div><div class="rotulo">Entradas este mês</div></div>
      </div>
      <div class="card card-metrica" data-ir="#/movimentacoes">
        <div class="icone icone-vermelho">${ICONES.setas()}</div>
        <div><div class="valor">${fmtNum(dados.saidasMes)}</div><div class="rotulo">Saídas este mês</div></div>
      </div>
    </div>`;

  const alertaEstoqueHtml = dados.alertaEstoque.length
    ? dados.alertaEstoque.map((p) => `
        <li><span><b>${esc(p.nome)}</b> <span class="detalhe">(${esc(p.categoria_nome || 'Sem categoria')})</span></span>
        <span class="detalhe">${fmtNum(p.quantidade_atual)} / mín. ${fmtNum(p.estoque_minimo)} ${esc(p.unidade)}</span></li>`).join('')
    : '<li class="vazio">Nenhum produto abaixo do estoque mínimo.</li>';

  const alertaValidadeHtml = dados.alertaValidade.length
    ? dados.alertaValidade.map((p) => {
        const dias = diasAte(p.validade);
        return `<li><span><b>${esc(p.nome)}</b></span>
        <span class="detalhe">vence ${fmtData(p.validade)}${dias >= 0 ? ` (${dias === 0 ? 'hoje' : `em ${dias} dia${dias === 1 ? '' : 's'}`})` : ''}</span></li>`;
      }).join('')
    : '<li class="vazio">Nenhum produto próximo do vencimento.</li>';

  const paineis = `
    <div class="alerta-paineis">
      <div class="card alerta-painel ambar">
        <h3>${ICONES.alerta()} Estoque baixo</h3>
        <ul>${alertaEstoqueHtml}</ul>
      </div>
      <div class="card alerta-painel vermelho">
        <h3>${ICONES.relogio()} Validade próxima (${fmtNum(dados.diasAlerta)} dias)</h3>
        <ul>${alertaValidadeHtml}</ul>
      </div>
    </div>`;

  const linhas = dados.ultimas.length
    ? dados.ultimas.map((m) => `
        <tr>
          <td>${fmtDataHora(m.data_hora)}</td>
          <td>${esc(m.produto_nome)}</td>
          <td><span class="badge badge-${m.tipo === 'entrada' ? 'entrada' : 'saida'}">${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
          <td class="num">${fmtNum(m.quantidade)}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" class="vazio">Nenhuma movimentação registrada.</td></tr>';

  pintar(layout(`
    ${cards}
    ${paineis}
    <div class="card tabela-card">
      <h2>Últimas movimentações</h2>
      <table class="tabela">
        <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th class="num">Quantidade</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`, 'Dashboard'));
  bindSair();
  document.querySelectorAll('[data-ir]').forEach((el) => {
    el.addEventListener('click', () => { location.hash = el.dataset.ir; });
  });
}

/* ==================== Produtos ==================== */

async function renderizarProdutos() {
  pintar(layout('<div class="carregando">Carregando...</div>', 'Produtos'));
  let dados;
  try {
    dados = await api('/api/produtos');
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Produtos'));
    return;
  }
  const pode = podeGerenciar();
  const linhas = dados.produtos.map((p) => {
    const baixo = p.ativo && p.quantidade_atual <= p.estoque_minimo;
    const acoes = pode
      ? `<button class="btn-icone" title="Editar" data-editar="${p.id_produto}">${ICONES.lapis()}</button>
         <button class="btn-icone perigo" title="${p.ativo ? 'Inativar' : 'Reativar'}" data-status="${p.id_produto}">${ICONES.energia()}</button>`
      : '';
    return `
      <tr class="${p.ativo ? '' : 'linha-inativa'}">
        <td>${esc(p.codigo)}</td>
        <td>${esc(p.nome)}${p.ativo ? '' : ' <span class="badge badge-inativo">Inativo</span>'}</td>
        <td>${esc(p.categoria_nome || '—')}</td>
        <td class="num">${fmtNum(p.quantidade_atual)} ${esc(p.unidade)}${baixo ? ' <span class="badge badge-baixo">Baixo</span>' : ''}</td>
        <td class="centro">${acoes}</td>
      </tr>`;
  }).join('');
  pintar(layout(`
    <div class="filtros">
      <input id="busca-produto" type="search" placeholder="Pesquisar produto...">
      ${pode ? '<button class="btn btn-primario" id="btn-novo-produto">+ Novo Produto</button>' : ''}
    </div>
    <div class="card tabela-card">
      <h2>Produtos <span class="detalhe-titulo">${dados.produtos.length} registro(s)</span></h2>
      <table class="tabela">
        <thead><tr><th>Código</th><th>Nome</th><th>Categoria</th><th class="num">Estoque</th><th class="centro">Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="5" class="vazio">Nenhum produto encontrado.</td></tr>'}</tbody>
      </table>
    </div>`, 'Produtos'));
  bindSair();
  let temporizador = null;
  $('#busca-produto').addEventListener('input', (e) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(async () => {
      const dados2 = await api(`/api/produtos?busca=${encodeURIComponent(e.target.value.trim())}`);
      renderizarTabelaProdutos(dados2.produtos);
    }, 250);
  });
  $('#btn-novo-produto')?.addEventListener('click', () => { location.hash = '#/produtos/novo'; });
  document.querySelectorAll('[data-editar]').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/produtos/editar/${b.dataset.editar}`; });
  });
  document.querySelectorAll('[data-status]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = Number(b.dataset.status);
      const alvo = dados.produtos.find((p) => p.id_produto === id);
      const novoAtivo = !alvo.ativo;
      const ok = await confirmar(`${novoAtivo ? 'Reativar' : 'Inativar'} o produto "${alvo.nome}"?`);
      if (!ok) return;
      try {
        await api(`/api/produtos/${id}/status`, { corpo: { ativo: novoAtivo } });
        toast(novoAtivo ? 'Produto reativado.' : 'Produto inativado.');
        renderizarProdutos();
      } catch (erro) { toast(erro.message, 'erro'); }
    });
  });

  function renderizarTabelaProdutos(produtos) {
    const tbody = $('tbody');
    tbody.innerHTML = produtos.map((p) => {
      const baixo = p.ativo && p.quantidade_atual <= p.estoque_minimo;
      return `
        <tr>
          <td>${esc(p.codigo)}</td>
          <td>${esc(p.nome)}${p.ativo ? '' : ' <span class="badge badge-inativo">Inativo</span>'}</td>
          <td>${esc(p.categoria_nome || '—')}</td>
          <td class="num">${fmtNum(p.quantidade_atual)} ${esc(p.unidade)}${baixo ? ' <span class="badge badge-baixo">Baixo</span>' : ''}</td>
          <td class="centro">${podeGerenciar() ? `<button class="btn-icone" title="Editar" data-editar="${p.id_produto}">${ICONES.lapis()}</button>
            <button class="btn-icone perigo" title="${p.ativo ? 'Inativar' : 'Reativar'}" data-status="${p.id_produto}">${ICONES.energia()}</button>` : ''}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="vazio">Nenhum produto encontrado.</td></tr>';
    tbody.querySelectorAll('[data-editar]').forEach((b) => {
      b.addEventListener('click', () => { location.hash = `#/produtos/editar/${b.dataset.editar}`; });
    });
    tbody.querySelectorAll('[data-status]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = Number(b.dataset.status);
        const alvo = produtos.find((p) => p.id_produto === id);
        const novoAtivo = !alvo.ativo;
        const ok = await confirmar(`${novoAtivo ? 'Reativar' : 'Inativar'} o produto "${alvo.nome}"?`);
        if (!ok) return;
        try {
          await api(`/api/produtos/${id}/status`, { corpo: { ativo: novoAtivo } });
          toast(novoAtivo ? 'Produto reativado.' : 'Produto inativado.');
          renderizarProdutos();
        } catch (erro) { toast(erro.message, 'erro'); }
      });
    });
  }
}

const OPCOES_UNIDADE = [
  ['un', 'Unidade (un)'], ['kg', 'Quilograma (kg)'], ['g', 'Grama (g)'], ['L', 'Litro (L)'],
  ['ml', 'Mililitro (ml)'], ['cx', 'Caixa (cx)'], ['pct', 'Pacote (pct)'], ['dz', 'Dúzia (dz)'],
];

async function renderizarProdutoForm(modo, id) {
  pintar(layout('<div class="carregando">Carregando...</div>', modo === 'novo' ? 'Novo Produto' : 'Editar Produto'));
  let categorias;
  let produto = null;
  try {
    categorias = (await api('/api/categorias')).categorias;
    if (modo === 'editar') produto = (await api(`/api/produtos/${id}`)).produto;
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Produtos'));
    return;
  }
  const p = produto || {};
  const opcoesCategoria = categorias.map((c) => `<option value="${c.id_categoria}" ${p.id_categoria === c.id_categoria ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
  const opcoesUnidade = OPCOES_UNIDADE.map(([v, rotulo]) => `<option value="${v}" ${p.unidade === v ? 'selected' : ''}>${rotulo}</option>`).join('');
  pintar(layout(`
    <div class="card form-card">
      <h2>${modo === 'novo' ? 'Novo Produto' : `Editar Produto — ${esc(p.codigo)}`}</h2>
      <form id="form-produto">
        <div class="linha-campos">
          <div class="campo">
            <label for="f-nome">Nome do produto *</label>
            <input id="f-nome" name="nome" required maxlength="80" value="${esc(p.nome || '')}">
          </div>
          <div class="campo">
            <label for="f-categoria">Categoria</label>
            <select id="f-categoria" name="id_categoria"><option value="">Selecione...</option>${opcoesCategoria}</select>
          </div>
        </div>
        <div class="linha-campos tres">
          <div class="campo">
            <label for="f-unidade">Unidade de medida</label>
            <select id="f-unidade" name="unidade"><option value="">Selecione...</option>${opcoesUnidade}</select>
          </div>
          <div class="campo">
            <label for="f-minimo">Estoque mínimo *</label>
            <input id="f-minimo" name="estoque_minimo" type="number" min="0" step="any" required value="${p.estoque_minimo ?? 0}">
          </div>
          <div class="campo">
            <label for="f-validade">Data de validade</label>
            <input id="f-validade" name="validade" type="date" value="${esc(p.validade || '')}">
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo">
            <label for="f-custo">Preço de custo (R$)</label>
            <input id="f-custo" name="preco_custo" type="number" min="0" step="0.01" value="${p.preco_custo ?? ''}">
          </div>
          <div class="campo">
            <label for="f-venda">Preço de venda (R$)</label>
            <input id="f-venda" name="preco_venda" type="number" min="0" step="0.01" value="${p.preco_venda ?? ''}">
          </div>
        </div>
        ${modo === 'editar' ? `
        <div class="linha-campos">
          <div class="campo">
            <label>Estoque atual</label>
            <input readonly value="${fmtNum(p.quantidade_atual)} ${esc(p.unidade || '')}">
            <span class="dica">O estoque é alterado apenas por movimentações de entrada e saída.</span>
          </div>
        </div>` : ''}
        <div class="form-acoes">
          <button type="button" class="btn btn-fantasma" id="btn-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>
    </div>`, modo === 'novo' ? 'Novo Produto' : 'Editar Produto'));
  bindSair();
  $('#btn-cancelar').addEventListener('click', () => { location.hash = '#/produtos'; });
  $('#form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const corpo = {
      nome: String(form.get('nome')).trim(),
      id_categoria: form.get('id_categoria') ? Number(form.get('id_categoria')) : null,
      unidade: form.get('unidade') || 'un',
      estoque_minimo: Number(form.get('estoque_minimo') || 0),
      preco_custo: form.get('preco_custo') === '' ? null : Number(form.get('preco_custo')),
      preco_venda: form.get('preco_venda') === '' ? null : Number(form.get('preco_venda')),
      validade: String(form.get('validade') || ''),
    };
    try {
      if (modo === 'novo') await api('/api/produtos', { corpo });
      else await api(`/api/produtos/${id}`, { metodo: 'PUT', corpo });
      toast(modo === 'novo' ? 'Produto cadastrado com sucesso!' : 'Produto atualizado com sucesso!');
      location.hash = '#/produtos';
    } catch (erro) { toast(erro.message, 'erro'); }
  });
}

/* ==================== Movimentações ==================== */

const MOTIVOS_ROTULOS = {
  compra: 'Compra', producao: 'Produção', devolucao: 'Devolução',
  venda: 'Venda', consumo: 'Consumo interno', perda: 'Perda', descarte: 'Descarte',
};

async function renderizarMovimentacoes() {
  pintar(layout('<div class="carregando">Carregando...</div>', 'Movimentações'));
  let produtos;
  let historico;
  try {
    produtos = (await api('/api/produtos')).produtos.filter((p) => p.ativo);
    historico = (await api('/api/movimentacoes')).movimentacoes;
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Movimentações'));
    return;
  }
  const opcoesProdutos = produtos.map((p) => `<option value="${p.id_produto}">${esc(p.nome)} — saldo ${fmtNum(p.quantidade_atual)} ${esc(p.unidade)}</option>`).join('');
  const linhas = historico.map((m) => `
    <tr>
      <td>${fmtDataHora(m.data_hora)}</td>
      <td>${esc(m.produto_nome)}</td>
      <td><span class="badge badge-${m.tipo === 'entrada' ? 'entrada' : 'saida'}">${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td>${esc(MOTIVOS_ROTULOS[m.motivo] || m.motivo)}</td>
      <td class="num">${fmtNum(m.quantidade)}</td>
      <td>${esc(m.usuario_nome)}</td>
    </tr>`).join('');
  pintar(layout(`
    <div class="card form-card">
      <h2>Nova Movimentação</h2>
      <form id="form-movimentacao">
        <div class="campo">
          <label>Tipo de movimentação</label>
          <div class="segmento" id="segmento-tipo">
            <label class="selecionado entrada" id="seg-entrada"><input type="radio" name="tipo" value="entrada" checked>Entrada (compra/produção)</label>
            <label class="saida" id="seg-saida"><input type="radio" name="tipo" value="saida">Saída (venda/consumo)</label>
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo">
            <label for="m-produto">Produto *</label>
            <select id="m-produto" name="id_produto" required><option value="">Selecione um produto...</option>${opcoesProdutos}</select>
          </div>
          <div class="campo">
            <label for="m-motivo">Motivo *</label>
            <select id="m-motivo" name="motivo" required></select>
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo">
            <label for="m-quantidade">Quantidade *</label>
            <input id="m-quantidade" name="quantidade" type="number" min="0.01" step="any" required placeholder="0">
          </div>
          <div class="campo">
            <label for="m-data">Data</label>
            <input id="m-data" name="data" type="date" value="${hojeISO()}">
          </div>
        </div>
        <div class="campo">
          <label for="m-observacao">Observação (opcional)</label>
          <textarea id="m-observacao" name="observacao" rows="2" maxlength="300" placeholder="Ex.: pedido do fornecedor, consumo interno..."></textarea>
        </div>
        <div class="form-acoes">
          <button type="button" class="btn btn-fantasma" id="btn-limpar">Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>
    </div>
    <div class="card tabela-card">
      <h2>Histórico de movimentações</h2>
      <table class="tabela">
        <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Motivo</th><th class="num">Quantidade</th><th>Usuário</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6" class="vazio">Nenhuma movimentação registrada.</td></tr>'}</tbody>
      </table>
    </div>`, 'Movimentações'));
  bindSair();

  const selectMotivo = $('#m-motivo');
  function atualizarMotivos(tipo) {
    const motivos = tipo === 'entrada' ? ['compra', 'producao', 'devolucao'] : ['venda', 'consumo', 'perda', 'descarte'];
    selectMotivo.innerHTML = motivos.map((m) => `<option value="${m}">${MOTIVOS_ROTULOS[m]}</option>`).join('');
  }
  function atualizarSegmento(tipo) {
    $('#seg-entrada').classList.toggle('selecionado', tipo === 'entrada');
    $('#seg-saida').classList.toggle('selecionado', tipo === 'saida');
  }
  atualizarMotivos('entrada');
  document.querySelectorAll('input[name="tipo"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      atualizarSegmento(radio.value);
      atualizarMotivos(radio.value);
    });
  });

  $('#btn-limpar').addEventListener('click', () => { $('#form-movimentacao').reset(); atualizarSegmento('entrada'); atualizarMotivos('entrada'); });
  $('#form-movimentacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const corpo = {
      id_produto: Number(form.get('id_produto')),
      tipo: form.get('tipo'),
      motivo: form.get('motivo'),
      quantidade: Number(form.get('quantidade')),
      data: String(form.get('data') || ''),
      observacao: String(form.get('observacao') || ''),
    };
    try {
      const r = await api('/api/movimentacoes', { corpo });
      toast(`Movimentação registrada! Novo saldo: ${fmtNum(r.novoSaldo)}`);
      renderizarMovimentacoes();
    } catch (erro) { toast(erro.message, 'erro'); }
  });
}

/* ==================== Fornecedores ==================== */

async function renderizarFornecedores() {
  pintar(layout('<div class="carregando">Carregando...</div>', 'Fornecedores'));
  await desenharFornecedores('');
}

async function desenharFornecedores(busca) {
  let dados;
  try {
    dados = await api(`/api/fornecedores${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`);
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Fornecedores'));
    return;
  }
  const linhas = dados.fornecedores.map((f) => `
    <tr>
      <td>${esc(f.nome)}</td>
      <td>${esc(f.telefone || '—')}</td>
      <td>${esc(f.email || '—')}</td>
      <td class="centro">
        <button class="btn-icone" title="Editar" data-editar="${f.id_fornecedor}">${ICONES.lapis()}</button>
        <button class="btn-icone perigo" title="Excluir" data-excluir="${f.id_fornecedor}">${ICONES.lixeira()}</button>
      </td>
    </tr>`).join('');
  pintar(layout(`
    <div class="filtros">
      <input id="busca-fornecedor" type="search" placeholder="Pesquisar fornecedor..." value="${esc(busca)}">
      <button class="btn btn-primario" id="btn-novo-fornecedor">+ Novo Fornecedor</button>
    </div>
    <div class="card tabela-card">
      <h2>Fornecedores</h2>
      <table class="tabela">
        <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th class="centro">Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="4" class="vazio">Nenhum fornecedor encontrado.</td></tr>'}</tbody>
      </table>
    </div>`, 'Fornecedores'));
  bindSair();
  let temporizador = null;
  $('#busca-fornecedor').addEventListener('input', (e) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => desenharFornecedores(e.target.value.trim()), 250);
  });
  $('#btn-novo-fornecedor').addEventListener('click', () => abrirFormFornecedor(null));
  document.querySelectorAll('[data-editar]').forEach((b) => {
    b.addEventListener('click', () => {
      const f = dados.fornecedores.find((x) => x.id_fornecedor === Number(b.dataset.editar));
      abrirFormFornecedor(f);
    });
  });
  document.querySelectorAll('[data-excluir]').forEach((b) => {
    b.addEventListener('click', async () => {
      const f = dados.fornecedores.find((x) => x.id_fornecedor === Number(b.dataset.excluir));
      const ok = await confirmar(`Excluir o fornecedor "${f.nome}"?`);
      if (!ok) return;
      try {
        await api(`/api/fornecedores/${f.id_fornecedor}`, { metodo: 'DELETE' });
        toast('Fornecedor excluído.');
        desenharFornecedores(busca);
      } catch (erro) { toast(erro.message, 'erro'); }
    });
  });
}

function abrirFormFornecedor(fornecedor) {
  const f = fornecedor || {};
  abrirModal(`
    <div class="modal">
      <div class="modal-cabecalho"><h3>${fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3><button class="btn-icone btn-fechar" id="fechar-modal">×</button></div>
      <form id="form-fornecedor">
        <div class="modal-corpo">
          <div class="campo">
            <label for="fn-nome">Nome *</label>
            <input id="fn-nome" required maxlength="80" value="${esc(f.nome || '')}">
          </div>
          <div class="campo">
            <label for="fn-telefone">Telefone</label>
            <input id="fn-telefone" maxlength="20" value="${esc(f.telefone || '')}" placeholder="(11) 99999-9999">
          </div>
          <div class="campo">
            <label for="fn-email">E-mail</label>
            <input id="fn-email" type="email" maxlength="80" value="${esc(f.email || '')}">
          </div>
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn btn-fantasma" id="btn-cancelar-forn">Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>
    </div>`);
  $('#fechar-modal').addEventListener('click', fecharModal);
  $('#btn-cancelar-forn').addEventListener('click', fecharModal);
  $('#form-fornecedor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const corpo = {
      nome: $('#fn-nome').value.trim(),
      telefone: $('#fn-telefone').value.trim(),
      email: $('#fn-email').value.trim(),
    };
    try {
      if (fornecedor) await api(`/api/fornecedores/${fornecedor.id_fornecedor}`, { metodo: 'PUT', corpo });
      else await api('/api/fornecedores', { corpo });
      fecharModal();
      toast(fornecedor ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
      desenharFornecedores('');
    } catch (erro) { toast(erro.message, 'erro'); }
  });
}

/* ==================== Relatórios ==================== */

function renderizarRelatorios() {
  pintar(layout(`
    <div class="cards-relatorios">
      <div class="card card-relatorio">
        <div class="icone">${ICONES.caixa()}</div>
        <h3>Relatório de Produtos</h3>
        <p>Lista completa de produtos com estoque, preços e validade.</p>
        <button class="btn btn-primario" id="rel-produtos">Gerar</button>
      </div>
      <div class="card card-relatorio">
        <div class="icone">${ICONES.setas()}</div>
        <h3>Relatório de Entradas e Saídas</h3>
        <p>Movimentações do período selecionado, com totais.</p>
        <div class="periodo">
          <input type="date" id="rel-de" title="Data inicial">
          <input type="date" id="rel-ate" title="Data final">
        </div>
        <button class="btn btn-primario" id="rel-movimentacoes">Gerar</button>
      </div>
      <div class="card card-relatorio">
        <div class="icone">${ICONES.alerta()}</div>
        <h3>Relatório de Estoque Baixo</h3>
        <p>Produtos que estão no estoque mínimo ou abaixo dele.</p>
        <button class="btn btn-perigo" id="rel-baixo">Gerar</button>
      </div>
    </div>`, 'Relatórios'));
  bindSair();
  $('#rel-produtos').addEventListener('click', async () => {
    try {
      const d = await api('/api/relatorios/produtos');
      const linhas = d.produtos.map((p) => `
        <tr>
          <td>${esc(p.codigo)}</td><td>${esc(p.nome)}</td><td>${esc(p.categoria_nome || '—')}</td>
          <td class="centro">${esc(p.unidade)}</td>
          <td class="num">${fmtNum(p.quantidade_atual)}</td>
          <td class="num">${fmtNum(p.estoque_minimo)}</td>
          <td class="num">${fmtMoeda(p.preco_custo)}</td>
          <td class="num">${fmtMoeda(p.preco_venda)}</td>
          <td class="centro">${fmtData(p.validade)}</td>
          <td class="centro">${p.ativo ? '<span class="badge badge-ativo">Ativo</span>' : '<span class="badge badge-inativo">Inativo</span>'}</td>
        </tr>`).join('');
      abrirRelatorio(d.config.nome_padaria, 'Relatório de Produtos', `
        <table class="tabela">
          <thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Un</th><th class="num">Estoque</th><th class="num">Mínimo</th><th class="num">Custo</th><th class="num">Venda</th><th>Validade</th><th>Status</th></tr></thead>
          <tbody>${linhas || '<tr><td colspan="10" class="vazio">Nenhum produto cadastrado.</td></tr>'}</tbody>
        </table>`);
    } catch (erro) { toast(erro.message, 'erro'); }
  });
  $('#rel-movimentacoes').addEventListener('click', async () => {
    try {
      const de = $('#rel-de').value || '';
      const ate = $('#rel-ate').value || '';
      const params = new URLSearchParams();
      if (de) params.set('de', de);
      if (ate) params.set('ate', ate);
      const d = await api(`/api/relatorios/movimentacoes${params.toString() ? `?${params}` : ''}`);
      const linhas = d.linhas.map((m) => `
        <tr>
          <td>${fmtDataHora(m.data_hora)}</td><td>${esc(m.produto_nome)}</td>
          <td>${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td><td>${esc(MOTIVOS_ROTULOS[m.motivo] || m.motivo)}</td>
          <td class="num">${fmtNum(m.quantidade)}</td><td>${esc(m.usuario_nome)}</td>
          <td>${esc(m.observacao || '—')}</td>
        </tr>`).join('');
      const periodo = d.de || d.ate ? `${d.de || 'início'} a ${d.ate || 'hoje'}` : 'todo o período';
      abrirRelatorio(d.config.nome_padaria, 'Relatório de Entradas e Saídas', `
        <div class="relatorio-resumo">
          <div class="item">Entradas: <b>${fmtNum(d.totalEntradas)}</b></div>
          <div class="item">Saídas: <b>${fmtNum(d.totalSaidas)}</b></div>
        </div>
        <table class="tabela">
          <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Motivo</th><th class="num">Quantidade</th><th>Usuário</th><th>Observação</th></tr></thead>
          <tbody>${linhas || '<tr><td colspan="7" class="vazio">Nenhuma movimentação no período.</td></tr>'}</tbody>
        </table>`, periodo);
    } catch (erro) { toast(erro.message, 'erro'); }
  });
  $('#rel-baixo').addEventListener('click', async () => {
    try {
      const d = await api('/api/relatorios/estoque-baixo');
      const linhas = d.produtos.map((p) => `
        <tr>
          <td>${esc(p.codigo)}</td><td>${esc(p.nome)}</td><td>${esc(p.categoria_nome || '—')}</td>
          <td class="num">${fmtNum(p.quantidade_atual)}</td><td class="num">${fmtNum(p.estoque_minimo)}</td>
          <td class="centro">${esc(p.unidade)}</td><td class="centro">${fmtData(p.validade)}</td>
        </tr>`).join('');
      abrirRelatorio(d.config.nome_padaria, 'Relatório de Estoque Baixo', `
        <table class="tabela">
          <thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th class="num">Estoque</th><th class="num">Mínimo</th><th>Un</th><th>Validade</th></tr></thead>
          <tbody>${linhas || '<tr><td colspan="7" class="vazio">Nenhum produto com estoque baixo. Parabéns!</td></tr>'}</tbody>
        </table>`);
    } catch (erro) { toast(erro.message, 'erro'); }
  });
}

function abrirRelatorio(empresa, titulo, corpo, periodo = '') {
  const agora = new Date();
  abrirModal(`
    <div class="modal modal-relatorio">
      <div class="modal-cabecalho">
        <h3>${esc(titulo)}</h3>
        <div class="acoes-impressao">
          <button class="btn btn-fantasma btn-pequeno btn-fechar" id="fechar-relatorio">Fechar</button>
          <button class="btn btn-primario btn-pequeno" id="imprimir-relatorio">${ICONES.imprimir()} Imprimir</button>
        </div>
      </div>
      <div class="modal-corpo">
        <div class="relatorio-cabecalho">
          <div class="empresa">${esc(empresa)}</div>
          <h2>${esc(titulo)}</h2>
          ${periodo ? `<div class="periodo-info">Período: ${esc(periodo)}</div>` : ''}
        </div>
        ${corpo}
        <div class="relatorio-rodape">
          Gerado por ${esc(estado.usuario.nome)} em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>`);
  $('#fechar-relatorio').addEventListener('click', fecharModal);
  $('#imprimir-relatorio').addEventListener('click', () => window.print());
}

/* ==================== Usuários ==================== */

async function renderizarUsuarios() {
  pintar(layout('<div class="carregando">Carregando...</div>', 'Usuários'));
  let dados;
  try {
    dados = await api('/api/usuarios');
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Usuários'));
    return;
  }
  const linhas = dados.usuarios.map((u) => `
    <tr>
      <td>${esc(u.nome)}</td>
      <td>${esc(u.usuario)}</td>
      <td><span class="badge badge-perfil">${esc(u.perfil)}</span></td>
      <td>${u.ativo ? '<span class="badge badge-ativo">Ativo</span>' : '<span class="badge badge-inativo">Inativo</span>'}</td>
      <td class="centro">
        ${u.id_usuario === estado.usuario.id_usuario ? '<span class="detalhe-titulo">você</span>' : `
          <button class="btn-icone" title="Editar" data-editar="${u.id_usuario}">${ICONES.lapis()}</button>
          <button class="btn-icone perigo" title="${u.ativo ? 'Desativar' : 'Reativar'}" data-status="${u.id_usuario}">${ICONES.energia()}</button>`}
      </td>
    </tr>`).join('');
  pintar(layout(`
    <div class="filtros">
      <button class="btn btn-primario" id="btn-novo-usuario">+ Novo Usuário</button>
    </div>
    <div class="card tabela-card">
      <h2>Usuários do sistema</h2>
      <table class="tabela">
        <thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Status</th><th class="centro">Ações</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`, 'Usuários'));
  bindSair();
  $('#btn-novo-usuario').addEventListener('click', () => abrirFormUsuario(null));
  document.querySelectorAll('[data-editar]').forEach((b) => {
    b.addEventListener('click', () => {
      const u = dados.usuarios.find((x) => x.id_usuario === Number(b.dataset.editar));
      abrirFormUsuario(u);
    });
  });
  document.querySelectorAll('[data-status]').forEach((b) => {
    b.addEventListener('click', async () => {
      const u = dados.usuarios.find((x) => x.id_usuario === Number(b.dataset.status));
      const novoAtivo = !u.ativo;
      const ok = await confirmar(`${novoAtivo ? 'Reativar' : 'Desativar'} o usuário "${u.nome}"?${novoAtivo ? '' : ' Ele perderá o acesso ao sistema.'}`);
      if (!ok) return;
      try {
        await api(`/api/usuarios/${u.id_usuario}/status`, { corpo: { ativo: novoAtivo } });
        toast(novoAtivo ? 'Usuário reativado.' : 'Usuário desativado.');
        renderizarUsuarios();
      } catch (erro) { toast(erro.message, 'erro'); }
    });
  });
}

function abrirFormUsuario(usuario) {
  const u = usuario || {};
  const opcoesPerfil = ['Administrador', 'Gerente', 'Funcionario']
    .map((p) => `<option value="${p}" ${u.perfil === p ? 'selected' : ''}>${p}</option>`).join('');
  abrirModal(`
    <div class="modal">
      <div class="modal-cabecalho"><h3>${usuario ? 'Editar Usuário' : 'Novo Usuário'}</h3><button class="btn-icone btn-fechar" id="fechar-modal">×</button></div>
      <form id="form-usuario">
        <div class="modal-corpo">
          <div class="campo">
            <label for="fu-nome">Nome completo *</label>
            <input id="fu-nome" required maxlength="80" value="${esc(u.nome || '')}">
          </div>
          <div class="linha-campos">
            <div class="campo">
              <label for="fu-usuario">Usuário (login) *</label>
              <input id="fu-usuario" required maxlength="30" value="${esc(u.usuario || '')}" ${usuario ? 'readonly' : ''}>
            </div>
            <div class="campo">
              <label for="fu-perfil">Perfil</label>
              <select id="fu-perfil">${opcoesPerfil}</select>
            </div>
          </div>
          <div class="campo">
            <label for="fu-email">E-mail</label>
            <input id="fu-email" type="email" maxlength="80" value="${esc(u.email || '')}">
          </div>
          <div class="campo">
            <label for="fu-senha">${usuario ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}</label>
            <input id="fu-senha" type="password" minlength="4" ${usuario ? '' : 'required'} autocomplete="new-password">
          </div>
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn btn-fantasma" id="btn-cancelar-usuario">Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>
    </div>`);
  $('#fechar-modal').addEventListener('click', fecharModal);
  $('#btn-cancelar-usuario').addEventListener('click', fecharModal);
  $('#form-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const corpo = {
      nome: $('#fu-nome').value.trim(),
      email: $('#fu-email').value.trim(),
      perfil: $('#fu-perfil').value,
      senha: $('#fu-senha').value,
    };
    if (!usuario) corpo.usuario = $('#fu-usuario').value.trim();
    try {
      if (usuario) await api(`/api/usuarios/${usuario.id_usuario}`, { metodo: 'PUT', corpo });
      else await api('/api/usuarios', { corpo });
      fecharModal();
      toast(usuario ? 'Usuário atualizado.' : 'Usuário cadastrado.');
      renderizarUsuarios();
    } catch (erro) { toast(erro.message, 'erro'); }
  });
}

/* ==================== Configurações ==================== */

let secaoConfigAtual = 'dados';

async function renderizarConfiguracoes() {
  pintar(layout('<div class="carregando">Carregando...</div>', 'Configurações'));
  let config;
  let categorias;
  try {
    config = (await api('/api/config')).config;
    categorias = (await api('/api/categorias')).categorias;
  } catch (erro) {
    pintar(layout(`<div class="card tabela-card"><p class="vazio">${esc(erro.message)}</p></div>`, 'Configurações'));
    return;
  }
  pintar(layout(`
    <div class="config-layout">
      <div class="config-nav">
        <button data-secao="dados" class="${secaoConfigAtual === 'dados' ? 'ativo' : ''}">Dados da empresa</button>
        <button data-secao="notificacoes" class="${secaoConfigAtual === 'notificacoes' ? 'ativo' : ''}">Notificações</button>
        <button data-secao="seguranca" class="${secaoConfigAtual === 'seguranca' ? 'ativo' : ''}">Segurança</button>
        <button data-secao="categorias" class="${secaoConfigAtual === 'categorias' ? 'ativo' : ''}">Categorias</button>
      </div>
      <div class="card config-painel" id="config-painel"></div>
    </div>`, 'Configurações'));
  bindSair();
  document.querySelectorAll('[data-secao]').forEach((b) => {
    b.addEventListener('click', () => {
      secaoConfigAtual = b.dataset.secao;
      renderizarConfiguracoes();
    });
  });

  const painel = $('#config-painel');
  if (secaoConfigAtual === 'dados') {
    painel.innerHTML = `
      <h2>Dados da empresa</h2>
      <p class="descricao">Informações exibidas nos relatórios do sistema.</p>
      <form id="form-empresa">
        <div class="linha-campos">
          <div class="campo"><label>Nome da padaria</label><input id="cfg-nome" maxlength="80" value="${esc(config.nome_padaria || '')}"></div>
          <div class="campo"><label>CNPJ</label><input id="cfg-cnpj" maxlength="20" value="${esc(config.cnpj || '')}"></div>
        </div>
        <div class="campo"><label>Endereço</label><input id="cfg-endereco" maxlength="120" value="${esc(config.endereco || '')}"></div>
        <div class="linha-campos">
          <div class="campo"><label>Telefone</label><input id="cfg-telefone" maxlength="20" value="${esc(config.telefone || '')}"></div>
          <div class="campo"><label>E-mail</label><input id="cfg-email" type="email" maxlength="80" value="${esc(config.email || '')}"></div>
        </div>
        <div class="form-acoes"><button type="submit" class="btn btn-primario">Salvar</button></div>
      </form>`;
    $('#form-empresa').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/config', { metodo: 'PUT', corpo: {
          nome_padaria: $('#cfg-nome').value.trim(),
          cnpj: $('#cfg-cnpj').value.trim(),
          endereco: $('#cfg-endereco').value.trim(),
          telefone: $('#cfg-telefone').value.trim(),
          email: $('#cfg-email').value.trim(),
        } });
        estado.config = (await api('/api/config')).config;
        toast('Dados da empresa salvos.');
        renderizarConfiguracoes();
      } catch (erro) { toast(erro.message, 'erro'); }
    });
  } else if (secaoConfigAtual === 'notificacoes') {
    painel.innerHTML = `
      <h2>Notificações</h2>
      <p class="descricao">Define com quantos dias de antecedência os produtos próximos do vencimento aparecem no painel de alertas.</p>
      <form id="form-notificacoes">
        <div class="campo" style="max-width: 260px;">
          <label>Dias para alerta de validade</label>
          <input id="cfg-dias" type="number" min="0" max="365" value="${esc(config.dias_alerta_validade || '7')}">
        </div>
        <div class="form-acoes"><button type="submit" class="btn btn-primario">Salvar</button></div>
      </form>`;
    $('#form-notificacoes').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/config', { metodo: 'PUT', corpo: { dias_alerta_validade: Number($('#cfg-dias').value) } });
        toast('Preferência de notificação salva.');
      } catch (erro) { toast(erro.message, 'erro'); }
    });
  } else if (secaoConfigAtual === 'seguranca') {
    painel.innerHTML = `
      <h2>Segurança</h2>
      <p class="descricao">Altere a senha do seu usuário. A senha é armazenada com hash seguro.</p>
      <form id="form-senha">
        <div class="campo" style="max-width: 320px;"><label>Senha atual</label><input id="sg-atual" type="password" required autocomplete="current-password"></div>
        <div class="linha-campos" style="max-width: 560px;">
          <div class="campo"><label>Nova senha</label><input id="sg-nova" type="password" minlength="4" required autocomplete="new-password"></div>
          <div class="campo"><label>Confirmar nova senha</label><input id="sg-confirmar" type="password" minlength="4" required autocomplete="new-password"></div>
        </div>
        <div class="form-acoes"><button type="submit" class="btn btn-primario">Alterar senha</button></div>
      </form>`;
    $('#form-senha').addEventListener('submit', async (e) => {
      e.preventDefault();
      if ($('#sg-nova').value !== $('#sg-confirmar').value) return toast('As senhas não conferem.', 'erro');
      try {
        await api('/api/senha', { corpo: { senhaAtual: $('#sg-atual').value, senhaNova: $('#sg-nova').value } });
        toast('Senha alterada com sucesso!');
        $('#form-senha').reset();
      } catch (erro) { toast(erro.message, 'erro'); }
    });
  } else {
    painel.innerHTML = `
      <h2>Categorias</h2>
      <p class="descricao">Organize os produtos em categorias. Uma categoria em uso não pode ser excluída.</p>
      <form id="form-categoria" class="filtros">
        <input id="cat-nome" maxlength="50" placeholder="Nome da nova categoria..." required>
        <button type="submit" class="btn btn-primario btn-pequeno">Adicionar</button>
      </form>
      <ul class="lista-categorias" id="lista-categorias">
        ${categorias.map((c) => `
          <li data-id="${c.id_categoria}">
            <span class="cat-rotulo">${esc(c.nome)} <span class="detalhe-titulo">(${c.total_produtos} produto(s))</span></span>
            <span class="acoes">
              <button class="btn-icone" title="Renomear" data-renomear="${c.id_categoria}">${ICONES.lapis()}</button>
              <button class="btn-icone perigo" title="Excluir" data-excluir-cat="${c.id_categoria}">${ICONES.lixeira()}</button>
            </span>
          </li>`).join('') || '<li class="vazio">Nenhuma categoria cadastrada.</li>'}
      </ul>`;
    $('#form-categoria').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/categorias', { corpo: { nome: $('#cat-nome').value.trim() } });
        toast('Categoria adicionada.');
        renderizarConfiguracoes();
      } catch (erro) { toast(erro.message, 'erro'); }
    });
    document.querySelectorAll('[data-renomear]').forEach((b) => {
      b.addEventListener('click', () => {
        const li = b.closest('li');
        const categoria = categorias.find((c) => c.id_categoria === Number(b.dataset.renomear));
        li.innerHTML = `
          <input class="cat-edit-input" value="${esc(categoria.nome)}" maxlength="50">
          <span class="acoes">
            <button class="btn btn-primario btn-pequeno" data-salvar-renomeacao="${categoria.id_categoria}">Salvar</button>
            <button class="btn btn-fantasma btn-pequeno" data-cancelar-renomeacao>Cancelar</button>
          </span>`;
        li.querySelector('[data-cancelar-renomeacao]').addEventListener('click', renderizarConfiguracoes);
        li.querySelector('[data-salvar-renomeacao]').addEventListener('click', async () => {
          try {
            await api(`/api/categorias/${categoria.id_categoria}`, { metodo: 'PUT', corpo: { nome: li.querySelector('.cat-edit-input').value.trim() } });
            toast('Categoria renomeada.');
            renderizarConfiguracoes();
          } catch (erro) { toast(erro.message, 'erro'); }
        });
      });
    });
    document.querySelectorAll('[data-excluir-cat]').forEach((b) => {
      b.addEventListener('click', async () => {
        const categoria = categorias.find((c) => c.id_categoria === Number(b.dataset.excluirCat));
        const ok = await confirmar(`Excluir a categoria "${categoria.nome}"?`);
        if (!ok) return;
        try {
          await api(`/api/categorias/${categoria.id_categoria}`, { metodo: 'DELETE' });
          toast('Categoria excluída.');
          renderizarConfiguracoes();
        } catch (erro) { toast(erro.message, 'erro'); }
      });
    });
  }
}

/* ==================== Roteador ==================== */

function rotear() {
  if (!estado.usuario) return renderizarLogin();
  const hash = location.hash.replace(/^#\/?/, '');
  const [a, b, c] = hash.split('/').filter(Boolean);
  if (!a) return renderizarInicio();
  if (a === 'produtos') {
    if (b === 'novo') return podeGerenciar() ? renderizarProdutoForm('novo') : renderizarInicio();
    if (b === 'editar' && c) return podeGerenciar() ? renderizarProdutoForm('editar', c) : renderizarInicio();
    return renderizarProdutos();
  }
  if (a === 'movimentacoes') return renderizarMovimentacoes();
  if (a === 'fornecedores') return podeGerenciar() ? renderizarFornecedores() : renderizarInicio();
  if (a === 'relatorios') return podeGerenciar() ? renderizarRelatorios() : renderizarInicio();
  if (a === 'usuarios') return eAdministrador() ? renderizarUsuarios() : renderizarInicio();
  if (a === 'configuracoes') return eAdministrador() ? renderizarConfiguracoes() : renderizarInicio();
  return renderizarInicio();
}

async function iniciar() {
  try {
    estado.usuario = (await api('/api/sessao')).usuario;
    estado.config = await api('/api/config').then((d) => d.config).catch(() => null);
  } catch {
    estado.usuario = null;
  }
  window.addEventListener('hashchange', rotear);
  rotear();
}

iniciar();
