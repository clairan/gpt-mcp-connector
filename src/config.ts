/**
 * Central configuration, read once from the environment.
 * See .env.example for the meaning of each variable.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? "http://localhost:8788").replace(/\/$/, "");
const issuer = (process.env.OAUTH_ISSUER ?? "").replace(/\/$/, "");

export const config = {
  port: Number(process.env.PORT ?? 8788),
  publicBaseUrl,

  backend: {
    apiBaseUrl: (process.env.LOPNING_LIVET_API_BASE_URL ?? "").replace(/\/$/, ""),
    useMock: (process.env.USE_MOCK_BACKEND ?? "true").toLowerCase() === "true",
  },

  auth: {
    disabled: (process.env.AUTH_DISABLED ?? "false").toLowerCase() === "true",
    issuer,
    audience: process.env.OAUTH_AUDIENCE ?? publicBaseUrl,
    jwksUrl: process.env.OAUTH_JWKS_URL || (issuer ? `${issuer}/.well-known/jwks.json` : ""),
  },
} as const;

export function assertRuntimeConfig(): void {
  if (!config.backend.useMock) {
    required("LOPNING_LIVET_API_BASE_URL");
  }
  if (!config.auth.disabled) {
    required("OAUTH_ISSUER");
    if (!config.auth.jwksUrl) {
      throw new Error("OAUTH_JWKS_URL could not be derived; set it explicitly.");
    }
  }
}
