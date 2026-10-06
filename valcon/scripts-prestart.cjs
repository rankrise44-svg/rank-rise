// Runs before `npm start`: installs dependencies the first time and makes sure .env exists.
const fs = require('fs');
const { execSync } = require('child_process');
if (!fs.existsSync('node_modules/express')) {
  console.log('First run: installing dependencies…');
  execSync('npm install --no-audit --no-fund', { stdio: 'inherit' });
}
if (!fs.existsSync('.env')) {
  fs.copyFileSync('.env.example', '.env');
  console.log('\n  Created .env from .env.example. Open .env, paste your Groq and ElevenLabs keys, then run npm start again.\n');
  process.exit(1);
}
