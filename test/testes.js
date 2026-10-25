'use strict';

// Testes automatizados do plano de testes (CT01 a CT14) do Projeto Integrador.
// Executa o servidor em porta isolada com banco temporário.

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PORTA = 4817;
const BANCO_TEMP = path.join(os.tmpdir(), `padaria-teste-${Date.now()}.db`);
const RAIZ = path.join(__dirname, '..');
const BASE = `http://localhost:${PORTA}`;

let servidor;
let cookie = '';
let produtoTesteId = null;
let falhas = 0;
const resultados = [];

function iniciarServidor() {
  servidor = spawn(process.execPath, [path.join(RAIZ, 'server.js')], {
    env: { ...process.env, PORTA: String(PORTA), BANCO: BANCO_TEMP },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    let saida = '';
    const tempo = setTimeout(() => reject(new Error('Servidor não iniciou a tempo.')), 20000);
    const checar = (dados) => {
      saida += dados.toString();
      if (saida.includes('Servidor rodando')) {
        clearTimeout(tempo);
        resolve();
      }
    };
    servidor.stdout.on('data', checar);
    servidor.stderr.on('data', checar);
    servidor.on('exit', (codigo) => {
      if (!saida.includes('Servidor rodando')) reject(new Error(`Servidor encerrou com código ${codigo}.`));
    });
  });
}

async function requisicao(caminho, { metodo = 'GET', corpo } = {}) {
  const cabecalhos = { 'Content-Type': 'application/json' };
  if (cookie) cabecalhos.Cookie = cookie;
  const resp = await fetch(BASE + caminho, {
    method: metodo,
    headers: cabecalhos,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resp.json().catch(() => ({}));
  const cookiesSet = resp.headers.getSetCookie?.() || [];
  if (cookiesSet.some((c) => c.includes('Max-Age=0'))) cookie = '';
  else if (cookiesSet.length) cookie = cookiesSet.map((c) => c.split(';')[0]).join('; ');
  return { status: resp.status, dados };
}

function afirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function teste(nome, fn) {
  try {
    await fn();
    resultados.push({ nome, ok: true });
    console.log(`[PASS] ${nome}`);
  } catch (e) {
    resultados.push({ nome, ok: false, erro: e.message });
    falhas++;
    console.log(`[FAIL] ${nome} -> ${e.message}`);
  }
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

(async () => {
  console.log('Iniciando servidor de teste...');
  await iniciarServidor();

  try {
    await teste('CT01 - Login válido', async () => {
      const r = await requisicao('/api/login', { metodo: 'POST', corpo: { usuario: 'admin', senha: 'admin123' } });
      afirmar(r.status === 200, `status ${r.status}`);
      afirmar(r.dados.usuario?.perfil === 'Administrador', 'perfil incorreto');
    });

    await teste('CT02 - Login inválido', async () => {
      const r = await requisicao('/api/login', { metodo: 'POST', corpo: { usuario: 'admin', senha: 'senhaerrada' } });
      afirmar(r.status === 401, `status ${r.status}`);
      const r2 = await requisicao('/api/dashboard');
      afirmar(r2.status === 200, 'sessão anterior deveria continuar válida');
    });

    await teste('CT03 - Cadastro de produto válido', async () => {
      const r = await requisicao('/api/produtos', {
        metodo: 'POST',
        corpo: { nome: 'Pão Teste', id_categoria: 1, unidade: 'un', estoque_minimo: 10, preco_custo: 1.5, preco_venda: 3 },
      });
      afirmar(r.status === 201, `status ${r.status}`);
      afirmar(/^PRD-\d{4}$/.test(r.dados.produto?.codigo), 'código único não gerado');
      produtoTesteId = r.dados.produto.id_produto;
    });

    await teste('CT04 - Cadastro de produto incompleto', async () => {
      const r = await requisicao('/api/produtos', { metodo: 'POST', corpo: { estoque_minimo: 5 } });
      afirmar(r.status === 400, `status ${r.status}`);
    });

    await teste('CT05 - Entrada de estoque', async () => {
      const r = await requisicao('/api/movimentacoes', {
        metodo: 'POST',
        corpo: { id_produto: produtoTesteId, tipo: 'entrada', motivo: 'compra', quantidade: 10, data: hojeISO() },
      });
      afirmar(r.status === 201, `status ${r.status}`);
      afirmar(r.dados.novoSaldo === 10, `saldo ${r.dados.novoSaldo}`);
    });

    await teste('CT06 - Saída com saldo suficiente', async () => {
      const r = await requisicao('/api/movimentacoes', {
        metodo: 'POST',
        corpo: { id_produto: produtoTesteId, tipo: 'saida', motivo: 'venda', quantidade: 4 },
      });
      afirmar(r.status === 201, `status ${r.status}`);
      afirmar(r.dados.novoSaldo === 6, `saldo ${r.dados.novoSaldo}`);
    });

    await teste('CT07 - Saída maior que o saldo (bloqueio)', async () => {
      const r = await requisicao('/api/movimentacoes', {
        metodo: 'POST',
        corpo: { id_produto: produtoTesteId, tipo: 'saida', motivo: 'venda', quantidade: 999 },
      });
      afirmar(r.status === 400, `status ${r.status}`);
    });

    await teste('CT08 - Quantidade inválida', async () => {
      for (const quantidade of [0, -5, 'abc']) {
        const r = await requisicao('/api/movimentacoes', {
          metodo: 'POST',
          corpo: { id_produto: produtoTesteId, tipo: 'entrada', motivo: 'compra', quantidade },
        });
        afirmar(r.status === 400, `quantidade ${quantidade} foi aceita (status ${r.status})`);
      }
    });

    await teste('CT09 - Alerta de estoque mínimo', async () => {
      const r = await requisicao('/api/dashboard');
      afirmar(r.status === 200, 'dashboard falhou');
      afirmar(r.dados.alertaEstoque.some((p) => p.id_produto === produtoTesteId), 'produto abaixo do mínimo não aparece no alerta');
    });

    await teste('CT10 - Busca de produto', async () => {
      const r = await requisicao('/api/produtos?busca=' + encodeURIComponent('Pão Teste'));
      afirmar(r.dados.produtos.some((p) => p.id_produto === produtoTesteId), 'busca não encontrou o produto');
      const r2 = await requisicao('/api/produtos?busca=' + encodeURIComponent('PRD-'));
      afirmar(r2.dados.produtos.length > 0, 'busca por código falhou');
    });

    await teste('CT11 - Permissão de usuário', async () => {
      const login = await requisicao('/api/login', { metodo: 'POST', corpo: { usuario: 'funcionario', senha: 'funcionario123' } });
      afirmar(login.status === 200, 'login do funcionário falhou');
      const rUsuarios = await requisicao('/api/usuarios');
      afirmar(rUsuarios.status === 403, `funcionário acessou usuários (status ${rUsuarios.status})`);
      const rProduto = await requisicao('/api/produtos', { metodo: 'POST', corpo: { nome: 'X' } });
      afirmar(rProduto.status === 403, `funcionário criou produto (status ${rProduto.status})`);
      const rRelatorio = await requisicao('/api/relatorios/produtos');
      afirmar(rRelatorio.status === 403, `funcionário acessou relatório (status ${rRelatorio.status})`);
      const rMov = await requisicao('/api/movimentacoes', {
        metodo: 'POST',
        corpo: { id_produto: produtoTesteId, tipo: 'entrada', motivo: 'compra', quantidade: 1 },
      });
      afirmar(rMov.status === 201, `funcionário não conseguiu registrar movimentação (status ${rMov.status})`);
      const volta = await requisicao('/api/login', { metodo: 'POST', corpo: { usuario: 'admin', senha: 'admin123' } });
      afirmar(volta.status === 200, 'relogin do admin falhou');
    });

    await teste('CT12 - Relatório por período', async () => {
      const login = await requisicao('/api/login', { metodo: 'POST', corpo: { usuario: 'gerente', senha: 'gerente123' } });
      afirmar(login.status === 200, 'login do gerente falhou');
      const vazio = await requisicao('/api/relatorios/movimentacoes?de=2000-01-01&ate=2000-01-02');
      afirmar(vazio.status === 200, 'relatório falhou');
      afirmar(vazio.dados.linhas.length === 0, 'período sem movimentações deveria retornar 0 linhas');
      const completo = await requisicao('/api/relatorios/movimentacoes');
      afirmar(completo.dados.linhas.length > 0, 'relatório completo deveria ter linhas');
      afirmar(completo.dados.totalEntradas > 0 && completo.dados.totalSaidas > 0, 'totais do relatório incorretos');
      const produtos = await requisicao('/api/relatorios/produtos');
      afirmar(produtos.status === 200 && produtos.dados.produtos.length > 0, 'relatório de produtos vazio');
      const baixo = await requisicao('/api/relatorios/estoque-baixo');
      afirmar(baixo.dados.produtos.some((p) => p.id_produto === produtoTesteId), 'produto baixo não está no relatório');
      const volta = await requisicao('/api/login', { metodo: 'POST', corpo: { usuario: 'admin', senha: 'admin123' } });
      afirmar(volta.status === 200, 'relogin do admin falhou');
    });

    await teste('CT13 - Produto inativado', async () => {
      const inativar = await requisicao(`/api/produtos/${produtoTesteId}/status`, { metodo: 'POST', corpo: { ativo: false } });
      afirmar(inativar.status === 200, 'inativação falhou');
      const mover = await requisicao('/api/movimentacoes', {
        metodo: 'POST',
        corpo: { id_produto: produtoTesteId, tipo: 'entrada', motivo: 'compra', quantidade: 1 },
      });
      afirmar(mover.status === 400, `movimentação em produto inativo foi aceita (status ${mover.status})`);
      const dashboard = await requisicao('/api/dashboard');
      afirmar(!dashboard.dados.alertaEstoque.some((p) => p.id_produto === produtoTesteId), 'produto inativo aparece nos alertas');
      const produtos = await requisicao('/api/produtos?busca=' + encodeURIComponent('Pão Teste'));
      afirmar(!produtos.dados.produtos[0].ativo, 'produto deveria constar como inativo');
    });

    await teste('CT14 - Validade próxima', async () => {
      const futura = new Date(Date.now() + 3 * 86400000);
      const iso = `${futura.getFullYear()}-${String(futura.getMonth() + 1).padStart(2, '0')}-${String(futura.getDate()).padStart(2, '0')}`;
      const criar = await requisicao('/api/produtos', {
        metodo: 'POST',
        corpo: { nome: 'Produto Vence Logo', estoque_minimo: 1, validade: iso },
      });
      afirmar(criar.status === 201, 'cadastro falhou');
      const dashboard = await requisicao('/api/dashboard');
      afirmar(dashboard.dados.alertaValidade.some((p) => p.id_produto === criar.dados.produto.id_produto),
        'produto com validade próxima não aparece no alerta');
    });
  } finally {
    servidor.kill();
    try { fs.unlinkSync(BANCO_TEMP); } catch { /* banco temporário já removido */ }
  }

  const passaram = resultados.filter((r) => r.ok).length;
  console.log(`\nResultado: ${passaram}/${resultados.length} testes passaram.`);
  process.exit(falhas > 0 ? 1 : 0);
})();
