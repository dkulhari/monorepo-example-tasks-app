#!/usr/bin/env tsx
/**
 * Migration script to sync existing database relationships to Permify
 * This implements the hybrid approach where database is source of truth
 *
 * Usage:
 *   pnpm tsx src/db/seed/sync-to-permify.ts
 *   pnpm tsx src/db/seed/sync-to-permify.ts --dry-run
 */

import { eq } from "drizzle-orm";

import { env } from "../../env";
import { getDataSyncService } from "../../lib/permify/data-sync";
import { getPermifyService } from "../../lib/permify/service";
import { db } from "../index";
import {
  devices,
  sites,
  tenants,
  users,
  userTenantAssociations,
} from "../schema";

const isDryRun = process.argv.includes("--dry-run");

async function syncExistingData() {
  console.log("🔄 Starting Permify data sync...");
  if (isDryRun) {
    console.log("🏃 DRY RUN MODE - No data will be written to Permify");
  }

  const permifyService = getPermifyService({
    endpoint: env.PERMIFY_ENDPOINT || "localhost:3478",
    apiKey: env.PERMIFY_API_KEY,
  });

  const dataSync = getDataSyncService();

  try {
    // Initialize Permify schema
    console.log("📋 Initializing Permify schema...");
    if (!isDryRun) {
      await permifyService.initialize();
    }

    // Stats tracking
    const stats = {
      systemAdmins: 0,
      tenants: 0,
      userTenantAssociations: 0,
      sites: 0,
      devices: 0,
      errors: [] as Error[],
    };

    // 1. Sync system admins
    console.log("\n👤 Syncing system admins...");
    const systemAdmins = await db.query.users.findMany({
      where: eq(users.userType, "system_admin"),
    });

    for (const admin of systemAdmins) {
      try {
        console.log(`  - System admin: ${admin.email}`);
        if (!isDryRun) {
          await dataSync.syncSystemAdmin(admin.keycloakId);
        }
        stats.systemAdmins++;
      }
      catch (error) {
        console.error(`  ❌ Failed to sync system admin ${admin.email}:`, error);
        stats.errors.push(error as Error);
      }
    }

    // 2. Sync tenants and their owners
    console.log("\n🏢 Syncing tenants...");
    const allTenants = await db.query.tenants.findMany({
      where: eq(tenants.status, "active"),
    });

    for (const tenant of allTenants) {
      try {
        console.log(`  - Tenant: ${tenant.name} (${tenant.slug})`);

        // Find owner
        const owner = await db.query.userTenantAssociations.findFirst({
          where: eq(userTenantAssociations.tenantId, tenant.id),
          orderBy: (associations, { asc }) => [asc(associations.createdAt)],
        });

        if (owner && !isDryRun) {
          await dataSync.syncTenantCreation(tenant.id, owner.userId);
        }
        stats.tenants++;
      }
      catch (error) {
        console.error(`  ❌ Failed to sync tenant ${tenant.name}:`, error);
        stats.errors.push(error as Error);
      }
    }

    // 3. Sync user-tenant associations
    console.log("\n👥 Syncing user-tenant associations...");
    const allAssociations = await db.query.userTenantAssociations.findMany({
      where: eq(userTenantAssociations.status, "active"),
      with: {
        tenant: true,
        user: true,
      },
    });

    for (const association of allAssociations) {
      try {
        console.log(`  - User ${association.user?.email || association.userId} -> ${association.tenant?.name || association.tenantId} (${association.role})`);

        if (!isDryRun) {
          await dataSync.syncUserTenantAssociation(
            association.tenantId,
            association.userId,
            association.role,
          );
        }
        stats.userTenantAssociations++;
      }
      catch (error) {
        console.error(`  ❌ Failed to sync association:`, error);
        stats.errors.push(error as Error);
      }
    }

    // 4. Sync sites
    console.log("\n🏭 Syncing sites...");
    const allSites = await db.query.sites.findMany({
      where: eq(sites.status, "active"),
      with: {
        tenant: true,
      },
    });

    for (const site of allSites) {
      try {
        console.log(`  - Site: ${site.name} -> ${site.tenant?.name || site.tenantId}`);

        if (!isDryRun) {
          await dataSync.syncSiteCreation(site.id, site.tenantId);
        }
        stats.sites++;
      }
      catch (error) {
        console.error(`  ❌ Failed to sync site ${site.name}:`, error);
        stats.errors.push(error as Error);
      }
    }

    // 5. Sync devices
    console.log("\n📱 Syncing devices...");
    const allDevices = await db.query.devices.findMany({
      where: eq(devices.status, "active"),
      with: {
        site: true,
      },
    });

    for (const device of allDevices) {
      try {
        console.log(`  - Device: ${device.name} (${device.serialNumber}) -> ${device.site?.name || device.siteId}`);

        if (!isDryRun) {
          await dataSync.syncDeviceCreation(device.id, device.siteId);
        }
        stats.devices++;
      }
      catch (error) {
        console.error(`  ❌ Failed to sync device ${device.name}:`, error);
        stats.errors.push(error as Error);
      }
    }

    // Print summary
    console.log("\n📊 Sync Summary:");
    console.log("================");
    console.log(`✅ System Admins: ${stats.systemAdmins}`);
    console.log(`✅ Tenants: ${stats.tenants}`);
    console.log(`✅ User-Tenant Associations: ${stats.userTenantAssociations}`);
    console.log(`✅ Sites: ${stats.sites}`);
    console.log(`✅ Devices: ${stats.devices}`);
    console.log(`❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n⚠️  Some items failed to sync. Check the errors above.");
      console.log("The database remains the source of truth.");
      console.log("Failed items can be retried by running this script again.");
    }

    if (isDryRun) {
      console.log("\n🏃 DRY RUN COMPLETE - No data was written to Permify");
      console.log("Run without --dry-run flag to perform actual sync");
    }
    else {
      console.log("\n✅ Sync completed successfully!");
    }
  }
  catch (error) {
    console.error("\n❌ Fatal error during sync:", error);
    process.exit(1);
  }
}

// Run the sync
syncExistingData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
