@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 goto sem_pasta
if exist "reports\" goto abrir
mkdir "reports"
if errorlevel 1 goto falha
:abrir
start "" "%CD%\reports"
set "resultado=%errorlevel%"
if not "%resultado%"=="0" goto falha
echo Pasta de relatorios aberta. Escolha o arquivo DOCX mais recente.
popd
exit /b 0
:falha
echo ERRO: Nao foi possivel criar ou abrir a pasta reports.
popd
if not "%MAIL_COLLECTOR_NO_PAUSE%"=="1" pause
exit /b 1
:sem_pasta
echo ERRO: Nao foi possivel acessar a pasta do projeto.
if not "%MAIL_COLLECTOR_NO_PAUSE%"=="1" pause
exit /b 1
