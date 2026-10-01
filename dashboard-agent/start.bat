@echo off
setlocal
cd /d "%~dp0"
title GTECH Desk Agent

echo.
echo ======================================
echo          GTECH DESK AGENT
echo ======================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  set "PY=py"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set "PY=python"
  ) else (
    echo Python nao foi encontrado neste PC.
    echo Instale Python 3.11 ou superior e marque Add Python to PATH.
    echo.
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo Criando ambiente local...
  %PY% -m venv .venv
  if errorlevel 1 goto :error
)

echo Atualizando dependencias...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto :error

echo.
echo Se o Windows Firewall perguntar, permita acesso em redes PRIVADAS.
echo Para encerrar o painel, feche esta janela ou pressione Ctrl+C.
echo.
".venv\Scripts\python.exe" server.py
exit /b 0

:error
echo.
echo Ocorreu um erro ao iniciar o GTECH Desk.
pause
exit /b 1
