import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation. Nothing in here is ever sent to the browser
 * (the module is marked server-only). Optional integrations stay optional: the
 * platform must run without any third-party keys.
 */
const bool = (def: boolean) =>
  z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : v === "true" || v === "1"));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_SSL: bool(false),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
  ADMIN_PASSWORD: z.string().min(10, "ADMIN_PASSWORD must be at least 10 characters").optional(),
  REQUIRE_LOGIN: bool(true),
  SECRETS_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "SECRETS_ENCRYPTION_KEY must be 32 bytes, base64-encoded")
    .optional(),
  CRON_SECRET: z.string().min(16).optional(),
  DEFAULT_TIMEZONE: z.string().default("Asia/Beirut"),
  RAW_PAYLOAD_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(30),
  DEMO_MODE: bool(false),
  LLM_PROVIDER: z.enum(["none", "anthropic", "openai_compatible"]).default("none"),
  LLM_MODEL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MAX_TOOL_ROUNDS: z.coerce.number().int().min(1).max(8).default(5),
  TWELVEDATA_API_KEY: z.string().optional(),
  ALPHAVANTAGE_API_KEY: z.string().optional(),
  ANALYTICS_PYTHON: z.string().optional(),
  GDELT_MIN_INTERVAL_MS: z.coerce.number().int().min(5000).default(6000),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  // Empty strings in .env files mean "unset".
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    const missing = (["DATABASE_URL", "SESSION_SECRET", "ADMIN_PASSWORD", "SECRETS_ENCRYPTION_KEY"] as const).filter(
      (k) => !env[k],
    );
    if (missing.length) throw new Error(`Missing required production settings: ${missing.join(", ")}`);
    if (env.DEMO_MODE) throw new Error("DEMO_MODE cannot be enabled in production");
  }
  cached = env;
  return env;
}

/** For tests only. */
export function resetEnvCache() {
  cached = null;
}

/** A non-throwing summary of configuration state, safe to show in the UI. */
export function configStatus() {
  let env: Env | null = null;
  let error: string | null = null;
  try {
    env = getEnv();
  } catch (e) {
    error = (e as Error).message;
  }
  return {
    error,
    database: Boolean(env?.DATABASE_URL),
    auth: Boolean(env?.SESSION_SECRET && env?.ADMIN_PASSWORD),
    secretsEncryption: Boolean(env?.SECRETS_ENCRYPTION_KEY),
    llmProvider: env?.LLM_PROVIDER ?? "none",
    llmConfigured: Boolean(env && env.LLM_PROVIDER !== "none" && env.LLM_MODEL && (env.LLM_API_KEY || env.LLM_PROVIDER === "openai_compatible")),
    demoMode: Boolean(env?.DEMO_MODE),
    timezone: env?.DEFAULT_TIMEZONE ?? "Asia/Beirut",
  };
}
