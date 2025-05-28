import { db } from "../index";
import { tenants, tenantUsers, tasks } from "../schema";

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
    await db.delete(tasks);
    await db.delete(tenantUsers);
    await db.delete(tenants);

    // Create tenants
    console.log("🏢 Creating tenants...");
    const [acmeCorp, techStartup, consultingFirm] = await db.insert(tenants).values([
      {
        name: "Acme Corporation",
        slug: "acme-corp",
        domain: "acme.example.com",
        plan: "enterprise",
        settings: JSON.stringify({
          theme: "corporate",
          features: ["advanced-analytics", "custom-branding"],
        }),
      },
      {
        name: "Tech Startup Inc",
        slug: "tech-startup",
        plan: "pro",
        settings: JSON.stringify({
          theme: "modern",
          features: ["team-collaboration"],
        }),
      },
      {
        name: "Consulting Firm LLC",
        slug: "consulting-firm",
        plan: "free",
        settings: JSON.stringify({
          theme: "minimal",
          features: [],
        }),
      },
    ]).returning();

    console.log(`✅ Created ${[acmeCorp, techStartup, consultingFirm].length} tenants`);

    // Create tenant-user relationships
    console.log("👥 Creating tenant-user relationships...");
    await db.insert(tenantUsers).values([
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

    // Create sample tasks
    console.log("📝 Creating sample tasks...");
    await db.insert(tasks).values([
      // Tasks for Acme Corp
      {
        tenantId: acmeCorp.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Review Q4 financial reports",
        done: false,
      },
      {
        tenantId: acmeCorp.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Prepare board presentation",
        done: true,
      },
      {
        tenantId: acmeCorp.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Update company policies",
        done: false,
      },
      
      // Tasks for Tech Startup
      {
        tenantId: techStartup.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Deploy new feature to production",
        done: false,
      },
      {
        tenantId: techStartup.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Code review for authentication module",
        done: true,
      },
      {
        tenantId: techStartup.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Write API documentation",
        done: false,
      },
      
      // Tasks for Consulting Firm
      {
        tenantId: consultingFirm.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Client meeting preparation",
        done: false,
      },
      {
        tenantId: consultingFirm.id,
        userId: KEYCLOAK_USERS.testuser,
        name: "Research industry trends",
        done: false,
      },
    ]);

    console.log("✅ Created sample tasks");

    // Summary
    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • Tenants: ${[acmeCorp, techStartup, consultingFirm].length}`);
    console.log(`   • Tenant-User relationships: 3`);
    console.log(`   • Sample tasks: 8`);
    
    console.log("\n🏢 Created tenants:");
    console.log(`   • ${acmeCorp.name} (${acmeCorp.slug}) - ${acmeCorp.plan}`);
    console.log(`   • ${techStartup.name} (${techStartup.slug}) - ${techStartup.plan}`);
    console.log(`   • ${consultingFirm.name} (${consultingFirm.slug}) - ${consultingFirm.plan}`);
    
    console.log("\n👤 User access:");
    console.log(`   • testuser (${KEYCLOAK_USERS.testuser}):`);
    console.log(`     - Owner of: ${acmeCorp.name}`);
    console.log(`     - Member of: ${techStartup.name}`);
    console.log(`     - Admin of: ${consultingFirm.name}`);

    return {
      tenants: [acmeCorp, techStartup, consultingFirm],
      success: true,
    };

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Helper function to get Keycloak user ID from token or username
export function getKeycloakUserId(usernameOrToken: string): string {
  // If it's a known username, return the mapped ID
  if (KEYCLOAK_USERS[usernameOrToken as keyof typeof KEYCLOAK_USERS]) {
    return KEYCLOAK_USERS[usernameOrToken as keyof typeof KEYCLOAK_USERS];
  }
  
  // If it looks like a UUID, return as-is
  if (usernameOrToken.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return usernameOrToken;
  }
  
  throw new Error(`Unknown user: ${usernameOrToken}. Please add to KEYCLOAK_USERS mapping.`);
}

// Helper function to add a user to a tenant
export async function addUserToTenant(
  tenantSlug: string, 
  userId: string, 
  role: "owner" | "admin" | "member" = "member"
) {
  const tenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.slug, tenantSlug),
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  const [tenantUser] = await db.insert(tenantUsers).values({
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