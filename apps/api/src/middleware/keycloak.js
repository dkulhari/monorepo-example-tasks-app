import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import * as jose from "jose";
import env from "../env";
const config = {
    realm: env.KEYCLOAK_REALM,
    authServerUrl: env.KEYCLOAK_URL,
    clientId: env.KEYCLOAK_CLIENT_ID,
};
const JWKS_CACHE = new Map();
async function getJWKS(issuer) {
    const cached = JWKS_CACHE.get(issuer);
    if (cached)
        return cached;
    const jwks = jose.createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
    JWKS_CACHE.set(issuer, jwks);
    return jwks;
}
export function keycloakAuth() {
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
            const user = {
                sub: payload.sub,
                email: payload.email,
                name: payload.name,
                preferred_username: payload.preferred_username,
                given_name: payload.given_name,
                family_name: payload.family_name,
                email_verified: payload.email_verified,
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
export function optionalKeycloakAuth() {
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
            const user = {
                sub: payload.sub,
                email: payload.email,
                name: payload.name,
                preferred_username: payload.preferred_username,
                given_name: payload.given_name,
                family_name: payload.family_name,
                email_verified: payload.email_verified,
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
export function getUser(c) {
    return c.get("user") || null;
}
export function requireUser(c) {
    const user = getUser(c);
    if (!user) {
        throw new HTTPException(401, { message: "Authentication required" });
    }
    return user;
}
