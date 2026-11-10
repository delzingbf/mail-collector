
@echo off
cd /d "%~dp0"

echo ================================
echo MAIL COLLECTOR - SINCRONIZACAO
echo ================================
echo.

call npm run sync

echo.
echo Operacao finalizada.
pause
