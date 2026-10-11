// Loads .env / .env.local the same way Next.js does, for CLI scripts.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
