@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 goto sem_pasta

echo MAIL COLLECTOR - INSTALACAO
echo.
call scripts\verificar_ambiente.bat install
if errorlevel 1 goto falha_ambiente
call npm.cmd ci
set "resultado=%errorlevel%"
if not "%resultado%"=="0" goto falha

echo.
echo Operacao concluida sem erros.
goto fim
:falha_ambiente
set "resultado=1"
:falha
echo.
echo ERRO: A operacao falhou. Confira as mensagens acima.
:fim
popd
if not "%MAIL_COLLECTOR_NO_PAUSE%"=="1" pause
exit /b %resultado%
:sem_pasta
echo ERRO: Nao foi possivel acessar a pasta do projeto.
if not "%MAIL_COLLECTOR_NO_PAUSE%"=="1" pause
exit /b 1
