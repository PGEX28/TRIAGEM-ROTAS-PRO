@echo off
title Rotas Pro - Gerador de Executavel Windows (.exe)
echo ========================================================
echo   ROTAS PRO - GERADOR DE EXECUTAVEL (.EXE)
echo ========================================================
echo.
echo [1/4] Verificando dependencias do Backend...
cd /d "%~dp0\backend"
if not exist "node_modules\ws" (
    call npm install ws --save
)

echo.
echo [2/4] Verificando dependencias do Desktop...
cd /d "%~dp0\desktop"
if not exist "node_modules" (
    call npm install
)

echo.
echo [3/4] Compilando Frontend e Backend...
cd /d "%~dp0"
call npm run build:all
cd /d "%~dp0\print-agent"
call npm run build

echo.
echo [4/4] Empacotando Executavel Windows (.exe)...
cd /d "%~dp0\desktop"

REM Desabilitar assinatura de codigo para evitar erro de permissao de symbolic links
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set WIN_CSC_KEY_PASSWORD=

call npm run build:win

echo.
echo ========================================================
echo  SUCESSO! O executavel foi gerado na pasta:
echo  PROJETO CAPONI\desktop\dist-electron
echo ========================================================
pause
