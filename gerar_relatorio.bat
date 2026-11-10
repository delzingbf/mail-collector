
@echo off
cd /d "%~dp0"

echo ================================
echo MAIL COLLECTOR - RELATORIO
echo ================================
echo.

call npm run report

echo.
echo Operacao finalizada.
pause
