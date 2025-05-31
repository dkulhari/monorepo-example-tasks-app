#!/usr/bin/env tsx
/**
 * Helper script to get Keycloak user IDs for seeding
 *
 * This script helps you find the actual Keycloak user IDs that you need
 * to update in the KEYCLOAK_USERS mapping in the seed script.
 *
 * Usage:
 *   pnpm tsx src/db/seed/get-keycloak-users.ts
 */
import env from "../../env";
const KEYCLOAK_BASE_URL = env.KEYCLOAK_URL;
const KEYCLOAK_REALM = env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = env.KEYCLOAK_CLIENT_ID;
async function getAdminToken() {
    // For development, we'll try to get a token using the client credentials flow
    // This requires the client to have "Service accounts enabled" in Keycloak
    const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    // Try with just client_id first (for public clients)
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: KEYCLOAK_CLIENT_ID,
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get admin token: ${response.status} ${response.statusText}\n${errorText}\n\nNote: This requires the Keycloak client to have "Service accounts enabled" and proper permissions.`);
    }
    const data = await response.json();
    return data.access_token;
}
async function getKeycloakUsers() {
    const token = await getAdminToken();
    const usersUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users`;
    const response = await fetch(usersUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get users: ${response.status} ${response.statusText}\n${errorText}`);
    }
    const users = await response.json();
    return users;
}
async function main() {
    console.log("🔍 Fetching Keycloak users...");
    console.log(`   Keycloak URL: ${KEYCLOAK_BASE_URL}`);
    console.log(`   Realm: ${KEYCLOAK_REALM}`);
    console.log(`   Client ID: ${KEYCLOAK_CLIENT_ID}`);
    console.log("");
    try {
        const users = await getKeycloakUsers();
        if (users.length === 0) {
            console.log("❌ No users found in Keycloak realm");
            return;
        }
        console.log("👥 Found Keycloak users:");
        console.log("");
        users.forEach((user) => {
            const displayName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email || "No name";
            console.log(`   • ${user.username} (${displayName})`);
            console.log(`     ID: ${user.id}`);
            console.log(`     Email: ${user.email || "N/A"}`);
            console.log(`     Enabled: ${user.enabled}`);
            console.log("");
        });
        console.log("📝 Copy this mapping to your seed script:");
        console.log("");
        console.log("const KEYCLOAK_USERS = {");
        users.forEach((user) => {
            console.log(`  ${user.username}: "${user.id}", // ${user.email || "no email"}`);
        });
        console.log("};");
    }
    catch (error) {
        console.error("❌ Error fetching users:", error);
        console.log("");
        console.log("💡 Make sure:");
        console.log("   1. Keycloak is running");
        console.log("   2. The client has 'Service accounts enabled' in Keycloak");
        console.log("   3. The client has admin permissions (view-users, etc.)");
        console.log("   4. The realm and client ID are correct");
        console.log("");
        console.log("🔧 Alternative: Use manual method via Keycloak Admin Console:");
        console.log(`   1. Go to ${KEYCLOAK_BASE_URL}`);
        console.log(`   2. Login as admin`);
        console.log(`   3. Select realm: ${KEYCLOAK_REALM}`);
        console.log(`   4. Go to Users → Click on user → Copy ID from URL`);
    }
}
main();
