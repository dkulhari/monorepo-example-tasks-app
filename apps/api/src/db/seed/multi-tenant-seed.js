import { createHash } from "node:crypto";
// Run seed if called directly
import { fileURLToPath } from "node:url";
import { db } from "../index";
import { auditLogs, devices, sites, tenantInvitations, tenants, users, userSiteAssignments, userTenantAssociations, } from "../schema";
// Generate deterministic UUIDs for testing
function generateUUID(seed) {
    const hash = createHash("sha256").update(seed).digest("hex");
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}
export async function seedMultiTenantData() {
    console.log("🌱 Starting multi-tenant seed...");
    try {
        // Clear existing data in correct order
        console.log("🧹 Clearing existing data...");
        await db.delete(tenantInvitations);
        await db.delete(auditLogs);
        await db.delete(devices);
        await db.delete(userSiteAssignments);
        await db.delete(sites);
        await db.delete(userTenantAssociations);
        await db.delete(users);
        await db.delete(tenants);
        // Create system admin user
        console.log("👤 Creating system admin...");
        const systemAdminId = generateUUID("system-admin");
        await db.insert(users).values({
            id: systemAdminId,
            keycloakId: "keycloak-system-admin",
            email: "admin@platform.com",
            name: "System Administrator",
            userType: "system_admin",
            metadata: {
                phone: "+1234567890",
                preferences: {
                    language: "en",
                    timezone: "UTC",
                    notifications: {
                        email: true,
                        sms: true,
                        inApp: true,
                    },
                },
            },
        });
        // Create tenants
        console.log("🏢 Creating tenants...");
        const tenantData = [
            {
                id: generateUUID("acme-corp"),
                name: "ACME Corporation",
                slug: "acme-corp",
                type: "enterprise",
                status: "active",
                keycloakGroupId: "keycloak-acme-corp",
                settings: {
                    features: {
                        maxUsers: 1000,
                        maxSites: 50,
                        maxDevices: 5000,
                        enabledModules: ["inventory", "analytics", "reporting", "api"],
                    },
                    branding: {
                        primaryColor: "#0066CC",
                        secondaryColor: "#003366",
                    },
                },
            },
            {
                id: generateUUID("tech-startup"),
                name: "Tech Startup Inc",
                slug: "tech-startup",
                type: "standard",
                status: "active",
                keycloakGroupId: "keycloak-tech-startup",
                settings: {
                    features: {
                        maxUsers: 50,
                        maxSites: 5,
                        maxDevices: 200,
                        enabledModules: ["inventory", "reporting"],
                    },
                },
            },
            {
                id: generateUUID("trial-company"),
                name: "Trial Company LLC",
                slug: "trial-company",
                type: "trial",
                status: "active",
                settings: {
                    features: {
                        maxUsers: 10,
                        maxSites: 2,
                        maxDevices: 50,
                        enabledModules: ["inventory"],
                    },
                },
            },
        ];
        await db.insert(tenants).values(tenantData);
        // Create users
        console.log("👥 Creating users...");
        const userData = [
            {
                id: generateUUID("john-doe"),
                keycloakId: "keycloak-john-doe",
                email: "john.doe@acme.com",
                name: "John Doe",
                createdBy: systemAdminId,
                userType: "regular",
                metadata: {
                    phone: "+1234567891",
                    preferences: { timezone: "America/New_York" },
                },
            },
            {
                id: generateUUID("jane-smith"),
                keycloakId: "keycloak-jane-smith",
                email: "jane.smith@acme.com",
                name: "Jane Smith",
                createdBy: systemAdminId,
                userType: "regular",
                metadata: {
                    phone: "+1234567892",
                    preferences: { timezone: "America/Los_Angeles" },
                },
            },
            {
                id: generateUUID("bob-wilson"),
                keycloakId: "keycloak-bob-wilson",
                email: "bob.wilson@techstartup.com",
                name: "Bob Wilson",
                createdBy: systemAdminId,
                userType: "regular",
                metadata: {
                    preferences: { timezone: "Europe/London" },
                },
            },
            {
                id: generateUUID("alice-brown"),
                keycloakId: "keycloak-alice-brown",
                email: "alice.brown@crosscompany.com",
                name: "Alice Brown",
                createdBy: systemAdminId,
                userType: "regular",
                metadata: {
                    preferences: { timezone: "Asia/Tokyo" },
                },
            },
            {
                id: generateUUID("service-account"),
                keycloakId: "keycloak-service-api",
                email: "api@platform.com",
                name: "API Service Account",
                createdBy: systemAdminId,
                userType: "service_account",
                metadata: {
                    preferences: { timezone: "UTC" },
                },
            },
        ];
        await db.insert(users).values(userData);
        // Create user-tenant associations
        console.log("🔗 Creating user-tenant associations...");
        const userTenantData = [
            // ACME Corp associations
            {
                userId: generateUUID("john-doe"),
                tenantId: generateUUID("acme-corp"),
                role: "owner",
                status: "active",
                invitedBy: systemAdminId,
                invitedAt: new Date("2024-01-01"),
                acceptedAt: new Date("2024-01-02"),
                lastActiveAt: new Date(),
            },
            {
                userId: generateUUID("jane-smith"),
                tenantId: generateUUID("acme-corp"),
                role: "admin",
                status: "active",
                invitedBy: generateUUID("john-doe"),
                invitedAt: new Date("2024-01-05"),
                acceptedAt: new Date("2024-01-06"),
                lastActiveAt: new Date(),
            },
            // Tech Startup associations
            {
                userId: generateUUID("bob-wilson"),
                tenantId: generateUUID("tech-startup"),
                role: "owner",
                status: "active",
                invitedBy: systemAdminId,
                invitedAt: new Date("2024-02-01"),
                acceptedAt: new Date("2024-02-01"),
                lastActiveAt: new Date(),
            },
            // Cross-tenant user (Alice works for both ACME and Tech Startup)
            {
                userId: generateUUID("alice-brown"),
                tenantId: generateUUID("acme-corp"),
                role: "member",
                status: "active",
                invitedBy: generateUUID("jane-smith"),
                invitedAt: new Date("2024-03-01"),
                acceptedAt: new Date("2024-03-02"),
                lastActiveAt: new Date(),
            },
            {
                userId: generateUUID("alice-brown"),
                tenantId: generateUUID("tech-startup"),
                role: "admin",
                status: "active",
                invitedBy: generateUUID("bob-wilson"),
                invitedAt: new Date("2024-03-10"),
                acceptedAt: new Date("2024-03-11"),
                lastActiveAt: new Date(),
            },
            // Service account for ACME
            {
                userId: generateUUID("service-account"),
                tenantId: generateUUID("acme-corp"),
                role: "member",
                status: "active",
                invitedBy: generateUUID("john-doe"),
                invitedAt: new Date("2024-01-10"),
                acceptedAt: new Date("2024-01-10"),
            },
        ];
        await db.insert(userTenantAssociations).values(userTenantData);
        // Create sites
        console.log("🏭 Creating sites...");
        const siteData = [
            // ACME Corp sites
            {
                id: generateUUID("acme-hq"),
                tenantId: generateUUID("acme-corp"),
                name: "ACME Headquarters",
                address: "123 Main St, New York, NY 10001",
                coordinates: { latitude: 40.7128, longitude: -74.0060 },
                timezone: "America/New_York",
                metadata: {
                    type: "headquarters",
                    size: 50000,
                    operatingHours: {
                        monday: { open: "08:00", close: "18:00" },
                        tuesday: { open: "08:00", close: "18:00" },
                        wednesday: { open: "08:00", close: "18:00" },
                        thursday: { open: "08:00", close: "18:00" },
                        friday: { open: "08:00", close: "18:00" },
                    },
                    contactInfo: {
                        phone: "+1-212-555-0100",
                        email: "hq@acme.com",
                    },
                },
            },
            {
                id: generateUUID("acme-warehouse"),
                tenantId: generateUUID("acme-corp"),
                name: "ACME West Coast Warehouse",
                address: "456 Industrial Blvd, Los Angeles, CA 90001",
                coordinates: { latitude: 34.0522, longitude: -118.2437 },
                timezone: "America/Los_Angeles",
                metadata: {
                    type: "warehouse",
                    size: 100000,
                    operatingHours: {
                        monday: { open: "06:00", close: "22:00" },
                        tuesday: { open: "06:00", close: "22:00" },
                        wednesday: { open: "06:00", close: "22:00" },
                        thursday: { open: "06:00", close: "22:00" },
                        friday: { open: "06:00", close: "22:00" },
                        saturday: { open: "08:00", close: "16:00" },
                    },
                },
            },
            // Tech Startup sites
            {
                id: generateUUID("tech-office"),
                tenantId: generateUUID("tech-startup"),
                name: "Tech Startup Office",
                address: "789 Innovation Way, San Francisco, CA 94105",
                coordinates: { latitude: 37.7749, longitude: -122.4194 },
                timezone: "America/Los_Angeles",
                metadata: {
                    type: "office",
                    size: 5000,
                },
            },
        ];
        await db.insert(sites).values(siteData);
        // Create user-site assignments
        console.log("📍 Creating user-site assignments...");
        const userSiteData = [
            {
                userId: generateUUID("john-doe"),
                siteId: generateUUID("acme-hq"),
                tenantId: generateUUID("acme-corp"),
                assignedBy: generateUUID("john-doe"),
            },
            {
                userId: generateUUID("john-doe"),
                siteId: generateUUID("acme-warehouse"),
                tenantId: generateUUID("acme-corp"),
                assignedBy: generateUUID("john-doe"),
            },
            {
                userId: generateUUID("jane-smith"),
                siteId: generateUUID("acme-hq"),
                tenantId: generateUUID("acme-corp"),
                assignedBy: generateUUID("john-doe"),
            },
            {
                userId: generateUUID("alice-brown"),
                siteId: generateUUID("acme-warehouse"),
                tenantId: generateUUID("acme-corp"),
                assignedBy: generateUUID("jane-smith"),
            },
            {
                userId: generateUUID("bob-wilson"),
                siteId: generateUUID("tech-office"),
                tenantId: generateUUID("tech-startup"),
                assignedBy: generateUUID("bob-wilson"),
            },
        ];
        await db.insert(userSiteAssignments).values(userSiteData);
        // Create devices
        console.log("📱 Creating devices...");
        const deviceData = [
            // ACME HQ devices
            {
                siteId: generateUUID("acme-hq"),
                name: "Main Entrance Camera",
                type: "camera",
                serialNumber: "CAM-001-HQ",
                metadata: {
                    manufacturer: "SecureCam",
                    model: "SC-4K-PRO",
                    installationDate: "2024-01-15",
                    location: {
                        building: "Main",
                        floor: "1",
                        room: "Lobby",
                    },
                },
            },
            {
                siteId: generateUUID("acme-hq"),
                name: "Server Room Sensor",
                type: "sensor",
                serialNumber: "SENS-001-HQ",
                metadata: {
                    manufacturer: "TempGuard",
                    model: "TG-ENV-01",
                    capabilities: ["temperature", "humidity", "motion"],
                    location: {
                        building: "Main",
                        floor: "B1",
                        room: "Server Room",
                    },
                },
            },
            // ACME Warehouse devices
            {
                siteId: generateUUID("acme-warehouse"),
                name: "Loading Dock Scanner",
                type: "scanner",
                serialNumber: "SCAN-001-WH",
                metadata: {
                    manufacturer: "LogiScan",
                    model: "LS-3000",
                    location: {
                        building: "Warehouse A",
                        floor: "1",
                        room: "Loading Dock 1",
                    },
                },
            },
            // Tech office devices
            {
                siteId: generateUUID("tech-office"),
                name: "Conference Room Display",
                type: "display",
                serialNumber: "DISP-001-TO",
                metadata: {
                    manufacturer: "SmartView",
                    model: "SV-75-4K",
                    location: {
                        floor: "2",
                        room: "Conference Room A",
                    },
                },
            },
        ];
        await db.insert(devices).values(deviceData);
        // Create some audit logs
        console.log("📝 Creating audit logs...");
        const auditLogData = [
            {
                tenantId: generateUUID("acme-corp"),
                userId: systemAdminId,
                action: "create",
                resourceType: "tenant",
                resourceId: generateUUID("acme-corp"),
                details: {
                    metadata: { source: "seed_script" },
                },
                ipAddress: "127.0.0.1",
                userAgent: "seed-script/1.0",
            },
            {
                tenantId: generateUUID("acme-corp"),
                userId: generateUUID("john-doe"),
                action: "invite",
                resourceType: "user",
                resourceId: generateUUID("jane-smith"),
                details: {
                    metadata: { role: "admin" },
                },
                ipAddress: "192.168.1.100",
            },
            {
                tenantId: generateUUID("acme-corp"),
                userId: generateUUID("jane-smith"),
                action: "create",
                resourceType: "site",
                resourceId: generateUUID("acme-warehouse"),
                details: {
                    after: { name: "ACME West Coast Warehouse" },
                },
            },
        ];
        await db.insert(auditLogs).values(auditLogData);
        // Create pending invitations
        console.log("✉️ Creating pending invitations...");
        const invitationData = [
            {
                email: "pending.user@acme.com",
                tenantId: generateUUID("acme-corp"),
                role: "member",
                token: `invite-token-${Date.now()}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                createdBy: generateUUID("jane-smith"),
                accepted: false,
            },
            {
                email: "contractor@external.com",
                tenantId: generateUUID("tech-startup"),
                role: "viewer",
                token: `invite-token-${Date.now() + 1}`,
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                createdBy: generateUUID("bob-wilson"),
                accepted: false,
            },
        ];
        await db.insert(tenantInvitations).values(invitationData);
        console.log("✅ Multi-tenant seed completed successfully!");
        // Print summary
        console.log("\n📊 Seed Summary:");
        console.log("- System Admin: admin@platform.com");
        console.log("- Tenants: 3 (ACME Corp, Tech Startup, Trial Company)");
        console.log("- Users: 5 (including 1 cross-tenant user)");
        console.log("- Sites: 3");
        console.log("- Devices: 4");
        console.log("- Pending Invitations: 2");
        console.log("\n🔑 Cross-tenant user: alice.brown@crosscompany.com");
        console.log("  - Member at ACME Corp");
        console.log("  - Admin at Tech Startup");
    }
    catch (error) {
        console.error("❌ Seed failed:", error);
        throw error;
    }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    seedMultiTenantData()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
