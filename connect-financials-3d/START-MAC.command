#!/bin/bash
# Double-click to start Connect Financials with Valgon (macOS).
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org, then double-click this file again."
  open "https://nodejs.org"; read -p "Press Enter to close"; exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "First time setup: TextEdit will open the .env file. Paste your keys after the = signs, save and close it."
  open -W -e .env
fi
if [ ! -d node_modules ]; then
  echo "Installing the website (only the first time, about a minute)..."
  npm install || { read -p "npm install failed. Press Enter to close"; exit 1; }
fi
echo "Starting the website at http://localhost:8787"
OPEN_BROWSER=1 npm start
