@echo off
title Connect Financials - Valgon
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Install the LTS version from https://nodejs.org , then double-click this file again.
  echo.
  start "" https://nodejs.org
  pause
  exit /b
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo  First time setup: Notepad will open the .env file.
  echo  Paste your GROQ_API_KEY and ELEVENLABS_API_KEY after the = signs, save, and close Notepad.
  echo.
  notepad ".env"
)

if not exist "node_modules" (
  echo  Installing the website ^(only the first time, about a minute^)...
  call npm install
  if errorlevel 1 ( echo  npm install failed. & pause & exit /b )
)

echo  Starting the website. Chrome will open at http://localhost:8787
set OPEN_BROWSER=1
call npm start
pause
