import type { Context, MiddlewareHandler } from "hono";

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import * as jose from "jose";

export type KeycloakConfig = {
  realm: string;
  authServerUrl: string;
  clientId: string;
  clientSecret?: string;
};

export type KeycloakUser = {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
};

const JWKS_CACHE = new Map<string, jose.JWTVerifyGetKey>();

async function getJWKS(issuer: string): Promise<jose.JWTVerifyGetKey> {
  const cached = JWKS_CACHE.get(issuer);
  if (cached)
    return cached;

  const jwks = jose.createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  JWKS_CACHE.set(issuer, jwks);
  return jwks;
}

export function keycloakAuth(config: KeycloakConfig): MiddlewareHandler {
  const issuer = `${config.authServerUrl}/realms/${config.realm}`;

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);

    try {
      const jwks = await getJWKS(issuer);
      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer,
        audience: "account",
      });

      if (payload.azp !== config.clientId) {
        throw new Error(`Invalid client ID. Expected ${config.clientId}, got ${payload.azp}`);
      }

      const user: KeycloakUser = {
        sub: payload.sub as string,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        preferred_username: payload.preferred_username as string | undefined,
        given_name: payload.given_name as string | undefined,
        family_name: payload.family_name as string | undefined,
        email_verified: payload.email_verified as boolean | undefined,
      };

      c.set("user", user);
      c.set("token", token);

      await next();
    }
    catch (error) {
      console.error("Token verification failed:", error);
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }
  });
}

export function optionalKeycloakAuth(config: KeycloakConfig): MiddlewareHandler {
  const issuer = `${config.authServerUrl}/realms/${config.realm}`;

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const jwks = await getJWKS(issuer);
      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer,
        audience: "account",
      });

      if (payload.azp !== config.clientId) {
        console.warn(`Client ID mismatch. Expected ${config.clientId}, got ${payload.azp}`);
      }

      const user: KeycloakUser = {
        sub: payload.sub as string,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        preferred_username: payload.preferred_username as string | undefined,
        given_name: payload.given_name as string | undefined,
        family_name: payload.family_name as string | undefined,
        email_verified: payload.email_verified as boolean | undefined,
      };

      c.set("user", user);
      c.set("token", token);
    }
    catch (error) {
      console.error("Optional auth: Token verification failed:", error);
    }

    await next();
  });
}

export function getUser(c: Context): KeycloakUser | null {
  return c.get("user") || null;
}

export function requireUser(c: Context): KeycloakUser {
  const user = getUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return user;
}
