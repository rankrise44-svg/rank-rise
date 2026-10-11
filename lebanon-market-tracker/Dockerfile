# Production image for the web app (Next.js standalone output).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN useradd -r -u 1001 app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]

# Worker image: scheduler + ingestion + Python forecasting engine.
FROM node:22-bookworm-slim AS worker
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN python3 -m venv analytics/.venv && analytics/.venv/bin/pip install --no-cache-dir -r analytics/requirements.txt
ENV NODE_ENV=production
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx tsx --conditions=react-server scripts/ingest.ts --sync && npx tsx --conditions=react-server scripts/worker.ts"]
