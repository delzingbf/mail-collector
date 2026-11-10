@echo off
setlocal EnableExtensions DisableDelayedExpansion
where node.exe >nul 2>&1
if errorlevel 1 goto sem_node
where npm.cmd >nul 2>&1
if errorlevel 1 goto sem_npm
node -e "process.exit(Number(process.versions.node.split('.')[0]) === 24 ? 0 : 1)"
if errorlevel 1 goto versao_node
if not exist "package.json" goto sem_projeto
if /i "%~1"=="install" exit /b 0
if not exist "node_modules\.bin\tsx.cmd" goto sem_dependencias
if /i not "%~1"=="sync" exit /b 0
if not exist "credentials.json" goto sem_credenciais
exit /b 0

:sem_node
echo ERRO: Node.js nao encontrado. Instale o Node.js 24 e reabra o terminal.
exit /b 1
:sem_npm
echo ERRO: npm nao encontrado. Reinstale o Node.js com npm e a opcao PATH.
exit /b 1
:versao_node
echo ERRO: Este projeto utiliza Node.js 24. Confira com node --version.
exit /b 1
:sem_projeto
echo ERRO: package.json nao encontrado. Extraia a pasta completa do projeto.
exit /b 1
:sem_dependencias
echo ERRO: Dependencias ausentes. Execute instalar.bat primeiro.
exit /b 1
:sem_credenciais
echo ERRO: Coloque o credentials.json do aplicativo Desktop na pasta do projeto.
exit /b 1
