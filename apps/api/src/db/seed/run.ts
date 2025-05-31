#!/usr/bin/env tsx

import { addUserToTenant, getKeycloakUserId, seedDatabase } from "./index";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "seed":
      await seedDatabase();
      break;

    case "add-user":
      const tenantSlug = args[1];
      const userIdOrUsername = args[2];
      const role = (args[3] as "owner" | "admin" | "member") || "member";

      if (!tenantSlug || !userIdOrUsername) {
        console.error("Usage: pnpm seed add-user <tenant-slug> <user-id-or-username> [role]");
        console.error("Example: pnpm seed add-user acme-corp testuser admin");
        process.exit(1);
      }

      try {
        const userId = getKeycloakUserId(userIdOrUsername);
        await addUserToTenant(tenantSlug, userId, role);
      }
      catch (error) {
        console.error("❌ Error adding user to tenant:", error);
        process.exit(1);
      }
      break;

    case "help":
    default:
      console.log("🌱 Database Seeding CLI");
      console.log("");
      console.log("Commands:");
      console.log("  seed                                    - Run full database seeding");
      console.log("  add-user <tenant> <user> [role]        - Add user to tenant");
      console.log("  help                                    - Show this help");
      console.log("");
      console.log("Examples:");
      console.log("  pnpm seed seed                          - Seed the database");
      console.log("  pnpm seed add-user acme-corp testuser   - Add testuser as member");
      console.log("  pnpm seed add-user acme-corp testuser admin - Add testuser as admin");
      break;
  }
}

main().catch((error) => {
  console.error("❌ CLI Error:", error);
  process.exit(1);
});
