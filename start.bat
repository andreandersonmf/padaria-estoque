@echo off
title Padaria - Sistema de Controle de Estoque

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado neste computador.
  echo        Instale em https://nodejs.org (versao 22 ou superior) e tente novamente.
  pause
  exit /b 1
)

node -e "process.exit(parseInt(process.versions.node) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo [ERRO] A versao do Node.js instalada e muito antiga.
  echo        Instale a versao 22 ou superior em https://nodejs.org
  pause
  exit /b 1
)

start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
echo Iniciando o sistema... A janela do navegador abrira automaticamente.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
node server.js
pause
