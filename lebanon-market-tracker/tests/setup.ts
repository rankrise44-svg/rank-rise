import { loadEnvConfig } from "@next/env";

// Tests never touch the development database: DATABASE_URL is pointed at DATABASE_URL_TEST.
loadEnvConfig(process.cwd(), true);
// Next.js does not load .env.local in test mode; default to the local throwaway cluster (npm run db:local).
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://lmt@127.0.0.1:5433/lmt_test";
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.SESSION_SECRET ??= "test-session-secret-0123456789abcdefghijklmnop";
process.env.ADMIN_PASSWORD ??= "test-password-123";
process.env.SECRETS_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.LLM_PROVIDER = "none";
