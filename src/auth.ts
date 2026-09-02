/**
 * OAuth 2.1 for the Apps SDK.
 *
 * ChatGPT acts as an MCP OAuth client. The flow is:
 *   1. ChatGPT calls this server with no token -> we answer 401 + a
 *      `WWW-Authenticate` header pointing at our protected-resource metadata.
 *   2. ChatGPT fetches `/.well-known/oauth-protected-resource`, discovers the
 *      Authorization Server (Löpning & Livet's IdP), and runs the standard
 *      authorization-code + PKCE flow (with dynamic client registration).
 *   3. ChatGPT retries the MCP request with `Authorization: Bearer <access_token>`.
 *   4. We verify the token here on every request and expose the user id to tools.
 *
 * This file only *verifies* tokens. The Authorization Server itself is Löpning &
 * Livet's existing login system — you do not build it here, you just point at it.
 */

import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";

export interface AuthContext {
  /** Stable Löpning & Livet user id (JWT `sub`). */
  userId: string;
  /** Raw access token, forwarded to the backend API on the user's behalf. */
  accessToken: string;
  scopes: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // `auth` is already taken by the MCP SDK's Express augmentation.
      authCtx?: AuthContext;
    }
  }
}

const jwks = config.auth.jwksUrl
  ? createRemoteJWKSet(new URL(config.auth.jwksUrl))
  : null;

const resourceMetadataUrl = `${config.publicBaseUrl}/.well-known/oauth-protected-resource`;

/** RFC 9728 — Protected Resource Metadata. Served unauthenticated. */
export function protectedResourceMetadata() {
  return {
    resource: config.auth.audience,
    authorization_servers: [config.auth.issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["training:read", "training:write"],
    resource_documentation: `${config.publicBaseUrl}/`,
  };
}

function challenge(res: Response, error: string, description: string) {
  res
    .status(401)
    .set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${resourceMetadataUrl}", error="${error}", error_description="${description}"`,
    )
    .json({ error, error_description: description });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (config.auth.disabled) {
    req.authCtx = { userId: "dev-user", accessToken: "dev-token", scopes: ["training:read", "training:write"] };
    next();
    return;
  }

  const header = req.header("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(header);
  if (!match || !jwks) {
    challenge(res, "invalid_request", "Missing bearer access token");
    return;
  }

  try {
    const { payload } = await jwtVerify(match[1]!, jwks, {
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    });
    if (!payload.sub) {
      challenge(res, "invalid_token", "Token has no subject");
      return;
    }
    const scopes = String(payload["scope"] ?? "").split(" ").filter(Boolean);
    req.authCtx = { userId: payload.sub, accessToken: match[1]!, scopes };
    next();
  } catch (err) {
    challenge(res, "invalid_token", err instanceof Error ? err.message : "Token verification failed");
  }
}
