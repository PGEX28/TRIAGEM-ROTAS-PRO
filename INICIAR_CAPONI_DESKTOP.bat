@echo off
title Rotas Pro - Inicializador Desktop
echo ========================================================
echo   ROTAS PRO - SISTEMA DE TRIAGEM E ROTEIRIZACAO
echo ========================================================
echo.
echo [1/4] Verificando dependencias do Backend...
cd /d "%~dp0\backend"
if not exist "node_modules\ws" (
    echo Instalando dependencias do backend...
    call npm install ws --save
)

echo.
echo [2/4] Verificando dependencias do Desktop...
cd /d "%~dp0\desktop"
if not exist "node_modules" (
    echo Instalando modulo desktop...
    call npm install
)

echo.
echo [3/4] Compilando Backend, Frontend e Print Agent...
cd /d "%~dp0"
call npm run build:all
cd /d "%~dp0\print-agent"
call npm run build

echo.
echo [4/4] Iniciando Aplicativo Desktop...
cd /d "%~dp0\desktop"
call npm start

exit
