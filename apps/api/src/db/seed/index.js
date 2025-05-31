import { db } from "../index";
import { tenants, userTenantAssociations } from "../schema";
// Known Keycloak user IDs for development
// These should match the actual user IDs from your Keycloak instance
const KEYCLOAK_USERS = {
    testuser: "51a1090a-15d7-44bc-afc8-9b1350a4773b", // testuser@example.com
    // Add more users as needed
    //admin: "admin-user-id-here",
    //user2: "user2-id-here",
};
export async function seedDatabase() {
    console.log("🌱 Starting database seeding...");
    try {
        // Clear existing data (in reverse order due to foreign keys)
        console.log("🧹 Cleaning existing data...");
        await db.delete(userTenantAssociations);
        await db.delete(tenants);
        // Create tenants
        console.log("🏢 Creating tenants...");
        const [acmeCorp, techStartup, consultingFirm] = await db.insert(tenants).values([
            {
                name: "Acme Corporation",
                slug: "acme-corp",
                type: "enterprise",
                settings: {
                    features: {
                        maxUsers: 100,
                        maxSites: 50,
                        enabledModules: ["advanced-analytics", "custom-branding"],
                    },
                    branding: {
                        primaryColor: "#0066cc",
                    },
                },
            },
            {
                name: "Tech Startup Inc",
                slug: "tech-startup",
                type: "standard",
                settings: {
                    features: {
                        maxUsers: 20,
                        maxSites: 10,
                        enabledModules: ["team-collaboration"],
                    },
                },
            },
            {
                name: "Consulting Firm LLC",
                slug: "consulting-firm",
                type: "trial",
                settings: {
                    features: {
                        maxUsers: 5,
                        maxSites: 2,
                    },
                },
            },
        ]).returning();
        console.log(`✅ Created ${[acmeCorp, techStartup, consultingFirm].length} tenants`);
        // Create tenant-user relationships
        console.log("👥 Creating tenant-user relationships...");
        await db.insert(userTenantAssociations).values([
            // testuser is owner of Acme Corp
            {
                tenantId: acmeCorp.id,
                userId: KEYCLOAK_USERS.testuser,
                role: "owner",
            },
            // testuser is also a member of Tech Startup
            {
                tenantId: techStartup.id,
                userId: KEYCLOAK_USERS.testuser,
                role: "member",
            },
            // testuser is admin of Consulting Firm
            {
                tenantId: consultingFirm.id,
                userId: KEYCLOAK_USERS.testuser,
                role: "admin",
            },
            // Add more user-tenant relationships as needed
            // {
            //   tenantId: acmeCorp.id,
            //   userId: KEYCLOAK_USERS.admin,
            //   role: "admin",
            // },
        ]);
        console.log("✅ Created tenant-user relationships");
        // Summary
        console.log("\n🎉 Database seeding completed successfully!");
        console.log("\n📊 Summary:");
        console.log(`   • Tenants: ${[acmeCorp, techStartup, consultingFirm].length}`);
        console.log(`   • Tenant-User relationships: 3`);
        console.log("\n🏢 Created tenants:");
        console.log(`   • ${acmeCorp.name} (${acmeCorp.slug}) - ${acmeCorp.type}`);
        console.log(`   • ${techStartup.name} (${techStartup.slug}) - ${techStartup.type}`);
        console.log(`   • ${consultingFirm.name} (${consultingFirm.slug}) - ${consultingFirm.type}`);
        console.log("\n👤 User access:");
        console.log(`   • testuser (${KEYCLOAK_USERS.testuser}):`);
        console.log(`     - Owner of: ${acmeCorp.name}`);
        console.log(`     - Member of: ${techStartup.name}`);
        console.log(`     - Admin of: ${consultingFirm.name}`);
        return {
            tenants: [acmeCorp, techStartup, consultingFirm],
            success: true,
        };
    }
    catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    }
}
// Helper function to get Keycloak user ID from token or username
export function getKeycloakUserId(usernameOrToken) {
    // If it's a known username, return the mapped ID
    if (KEYCLOAK_USERS[usernameOrToken]) {
        return KEYCLOAK_USERS[usernameOrToken];
    }
    // If it looks like a UUID, return as-is
    if (usernameOrToken.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return usernameOrToken;
    }
    throw new Error(`Unknown user: ${usernameOrToken}. Please add to KEYCLOAK_USERS mapping.`);
}
// Helper function to add a user to a tenant
export async function addUserToTenant(tenantSlug, userId, role = "member") {
    const tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.slug, tenantSlug),
    });
    if (!tenant) {
        throw new Error(`Tenant not found: ${tenantSlug}`);
    }
    const [tenantUser] = await db.insert(userTenantAssociations).values({
        tenantId: tenant.id,
        userId,
        role,
    }).returning();
    console.log(`✅ Added user ${userId} to tenant ${tenantSlug} as ${role}`);
    return tenantUser;
}
// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase()
        .then(() => {
        console.log("✅ Seeding completed");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    });
}
