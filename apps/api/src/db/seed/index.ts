import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { 
  users, 
  tenants, 
  userTenantAssociations, 
  sites, 
  userSiteAssignments,
  devices,
  auditLogs,
  tasks,
  tenantInvitations 
} from '../schema';
import env from '../../env';
import { eq } from 'drizzle-orm';

// Create database connection
const pool = new Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool);

class DatabaseSeeder {
  
  async clearExistingData(): Promise<void> {
    console.log('🧹 Clearing existing seed data...');
    
    // Delete in reverse order of dependencies
    await db.delete(tasks);
    await db.delete(devices);
    await db.delete(userSiteAssignments);
    await db.delete(sites);
    await db.delete(tenantInvitations);
    await db.delete(userTenantAssociations);
    await db.delete(auditLogs);
    
    // Delete users except system admin (if it exists)
    const existingAdmin = await db.select().from(users).where(eq(users.userType, 'system_admin')).limit(1);
    if (existingAdmin.length === 0) {
      await db.delete(users);
    } else {
      await db.delete(users).where(eq(users.userType, 'regular_user'));
      await db.delete(users).where(eq(users.userType, 'tenant_admin'));
    }
    
    await db.delete(tenants);
    
    console.log('✅ Existing data cleared');
  }

  async createSystemAdmin(): Promise<string> {
    console.log('👑 Creating system admin user...');
    
    // Check if system admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.userType, 'system_admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('ℹ️  System admin already exists');
      return existingAdmin[0].id;
    }

    const [systemAdmin] = await db.insert(users).values({
      keycloakId: 'system-admin-keycloak-id',
      email: 'admin@system.local',
      name: 'System Administrator',
      userType: 'system_admin',
      metadata: {
        role: 'super_admin',
        permissions: ['all'],
        created_by_seed: true
      },
      isActive: true,
    }).returning();

    // Log the admin creation
    await db.insert(auditLogs).values({
      userId: systemAdmin.id,
      action: 'create',
      resourceType: 'user',
      resourceId: systemAdmin.id,
      details: {
        userType: 'system_admin',
        createdBySeeder: true
      },
      success: true,
    });

    console.log(`✅ System admin created: ${systemAdmin.email}`);
    return systemAdmin.id;
  }

  async createTenants(systemAdminId: string): Promise<{ [key: string]: string }> {
    console.log('🏢 Creating sample tenants...');

    const tenantData = [
      {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        type: 'enterprise' as const,
        status: 'active' as const,
        keycloakGroupId: 'acme-corp-group',
        settings: {
          features: ['multi_site', 'advanced_analytics', 'api_access'],
          max_users: 1000,
          max_sites: 50
        },
        domain: 'acme.example.com'
      },
      {
        name: 'TechStart Inc',
        slug: 'techstart',
        type: 'standard' as const,
        status: 'active' as const,
        keycloakGroupId: 'techstart-group',
        settings: {
          features: ['basic_analytics', 'limited_api'],
          max_users: 100,
          max_sites: 10
        }
      },
      {
        name: 'Beta Solutions',
        slug: 'beta-solutions',
        type: 'starter' as const,
        status: 'active' as const,
        keycloakGroupId: 'beta-solutions-group',
        settings: {
          features: ['basic_features'],
          max_users: 25,
          max_sites: 3
        }
      },
      {
        name: 'Demo Company',
        slug: 'demo-company',
        type: 'trial' as const,
        status: 'pending' as const,
        settings: {
          features: ['demo_mode'],
          max_users: 5,
          max_sites: 1,
          trial_ends: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      }
    ];

    const createdTenants: { [key: string]: string } = {};

    for (const tenant of tenantData) {
      const [createdTenant] = await db.insert(tenants).values(tenant).returning();
      createdTenants[tenant.slug] = createdTenant.id;

      // Log tenant creation
      await db.insert(auditLogs).values({
        userId: systemAdminId,
        tenantId: createdTenant.id,
        action: 'create',
        resourceType: 'tenant',
        resourceId: createdTenant.id,
        details: {
          tenantType: tenant.type,
          createdBySeeder: true
        },
        success: true,
      });

      console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug})`);
    }

    return createdTenants;
  }

  async createUsers(systemAdminId: string): Promise<{ [key: string]: string }> {
    console.log('👥 Creating sample users...');

    const userData = [
      {
        key: 'acme-admin',
        keycloakId: 'acme-admin-keycloak',
        email: 'admin@acme.example.com',
        name: 'John Smith',
        userType: 'tenant_admin' as const,
        createdBy: systemAdminId,
        metadata: { department: 'IT', employee_id: 'EMP001' }
      },
      {
        key: 'acme-manager',
        keycloakId: 'acme-manager-keycloak',
        email: 'manager@acme.example.com',
        name: 'Sarah Johnson',
        userType: 'regular_user' as const,
        createdBy: systemAdminId,
        metadata: { department: 'Operations', employee_id: 'EMP002' }
      },
      {
        key: 'acme-operator',
        keycloakId: 'acme-operator-keycloak',
        email: 'operator@acme.example.com',
        name: 'Mike Wilson',
        userType: 'regular_user' as const,
        createdBy: systemAdminId,
        metadata: { department: 'Maintenance', employee_id: 'EMP003' }
      },
      {
        key: 'techstart-admin',
        keycloakId: 'techstart-admin-keycloak',
        email: 'admin@techstart.com',
        name: 'Lisa Chen',
        userType: 'tenant_admin' as const,
        createdBy: systemAdminId,
        metadata: { department: 'Engineering', employee_id: 'TS001' }
      },
      {
        key: 'techstart-user',
        keycloakId: 'techstart-user-keycloak',
        email: 'user@techstart.com',
        name: 'David Park',
        userType: 'regular_user' as const,
        createdBy: systemAdminId,
        metadata: { department: 'Product', employee_id: 'TS002' }
      },
      {
        key: 'beta-admin',
        keycloakId: 'beta-admin-keycloak',
        email: 'admin@beta-solutions.com',
        name: 'Maria Garcia',
        userType: 'tenant_admin' as const,
        createdBy: systemAdminId,
        metadata: { department: 'Management', employee_id: 'BS001' }
      },
      {
        key: 'cross-tenant-user',
        keycloakId: 'cross-tenant-keycloak',
        email: 'consultant@external.com',
        name: 'Alex Thompson',
        userType: 'regular_user' as const,
        createdBy: systemAdminId,
        metadata: { role: 'external_consultant', specialization: 'IoT' }
      }
    ];

    const createdUsers: { [key: string]: string } = {};

    for (const user of userData) {
      const [createdUser] = await db.insert(users).values(user).returning();
      createdUsers[user.key] = createdUser.id;

      // Log user creation
      await db.insert(auditLogs).values({
        userId: systemAdminId,
        action: 'create',
        resourceType: 'user',
        resourceId: createdUser.id,
        details: {
          userType: user.userType,
          createdBySeeder: true
        },
        success: true,
      });

      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    return createdUsers;
  }

  async createUserTenantAssociations(
    systemAdminId: string, 
    userIds: { [key: string]: string }, 
    tenantIds: { [key: string]: string }
  ): Promise<void> {
    console.log('🔗 Creating user-tenant associations...');

    const associations = [
      // Acme Corp associations
      { userId: userIds['acme-admin'], tenantId: tenantIds['acme-corp'], role: 'owner' as const },
      { userId: userIds['acme-manager'], tenantId: tenantIds['acme-corp'], role: 'admin' as const },
      { userId: userIds['acme-operator'], tenantId: tenantIds['acme-corp'], role: 'member' as const },
      
      // TechStart associations
      { userId: userIds['techstart-admin'], tenantId: tenantIds['techstart'], role: 'owner' as const },
      { userId: userIds['techstart-user'], tenantId: tenantIds['techstart'], role: 'member' as const },
      
      // Beta Solutions associations
      { userId: userIds['beta-admin'], tenantId: tenantIds['beta-solutions'], role: 'owner' as const },
      
      // Cross-tenant associations (consultant works with multiple tenants)
      { userId: userIds['cross-tenant-user'], tenantId: tenantIds['acme-corp'], role: 'viewer' as const },
      { userId: userIds['cross-tenant-user'], tenantId: tenantIds['techstart'], role: 'member' as const },
      { userId: userIds['cross-tenant-user'], tenantId: tenantIds['beta-solutions'], role: 'viewer' as const },
    ];

    for (const assoc of associations) {
      await db.insert(userTenantAssociations).values({
        ...assoc,
        status: 'active',
        acceptedAt: new Date(),
        invitedBy: systemAdminId,
      });

      // Log association creation
      await db.insert(auditLogs).values({
        userId: systemAdminId,
        tenantId: assoc.tenantId,
        action: 'assign',
        resourceType: 'association',
        resourceId: `${assoc.userId}-${assoc.tenantId}`,
        details: {
          role: assoc.role,
          createdBySeeder: true
        },
        success: true,
      });
    }

    console.log(`✅ Created ${associations.length} user-tenant associations`);
  }

  async createSites(systemAdminId: string, tenantIds: { [key: string]: string }): Promise<{ [key: string]: string }> {
    console.log('🏭 Creating sample sites...');

    const sitesData = [
      {
        key: 'acme-hq',
        tenantId: tenantIds['acme-corp'],
        name: 'Acme Headquarters',
        address: '123 Main Street, New York, NY 10001',
        latitude: 40.7505,
        longitude: -73.9934,
        timezone: 'America/New_York',
        metadata: {
          building_type: 'office',
          floors: 25,
          employees: 500
        }
      },
      {
        key: 'acme-warehouse',
        tenantId: tenantIds['acme-corp'],
        name: 'Acme Warehouse',
        address: '456 Industrial Blvd, Newark, NJ 07102',
        latitude: 40.7362,
        longitude: -74.1742,
        timezone: 'America/New_York',
        metadata: {
          building_type: 'warehouse',
          area_sqft: 50000,
          storage_capacity: '1000 pallets'
        }
      },
      {
        key: 'techstart-office',
        tenantId: tenantIds['techstart'],
        name: 'TechStart Office',
        address: '789 Tech Lane, San Francisco, CA 94105',
        latitude: 37.7849,
        longitude: -122.4094,
        timezone: 'America/Los_Angeles',
        metadata: {
          building_type: 'office',
          floors: 3,
          employees: 25
        }
      },
      {
        key: 'beta-lab',
        tenantId: tenantIds['beta-solutions'],
        name: 'Beta Research Lab',
        address: '321 Innovation Drive, Austin, TX 78701',
        latitude: 30.2672,
        longitude: -97.7431,
        timezone: 'America/Chicago',
        metadata: {
          building_type: 'laboratory',
          labs: 5,
          research_focus: 'IoT devices'
        }
      }
    ];

    const createdSites: { [key: string]: string } = {};

    for (const site of sitesData) {
      const [createdSite] = await db.insert(sites).values(site).returning();
      createdSites[site.key] = createdSite.id;

      // Log site creation
      await db.insert(auditLogs).values({
        userId: systemAdminId,
        tenantId: site.tenantId,
        action: 'create',
        resourceType: 'site',
        resourceId: createdSite.id,
        details: {
          siteName: site.name,
          createdBySeeder: true
        },
        success: true,
      });

      console.log(`✅ Created site: ${site.name}`);
    }

    return createdSites;
  }

  async createDevices(systemAdminId: string, siteIds: { [key: string]: string }): Promise<void> {
    console.log('📱 Creating sample devices...');

    const devicesData = [
      // Acme HQ devices
      { siteId: siteIds['acme-hq'], name: 'HVAC Controller 1', type: 'controller' as const, serialNumber: 'HVAC-001', manufacturer: 'ClimateControl Inc', model: 'CC-3000' },
      { siteId: siteIds['acme-hq'], name: 'Security Camera 1', type: 'camera' as const, serialNumber: 'CAM-001', manufacturer: 'SecureTech', model: 'ST-4K-Pro' },
      { siteId: siteIds['acme-hq'], name: 'Temperature Sensor 1', type: 'sensor' as const, serialNumber: 'TEMP-001', manufacturer: 'SensorCorp', model: 'SC-T100' },
      { siteId: siteIds['acme-hq'], name: 'Network Gateway', type: 'gateway' as const, serialNumber: 'GW-001', manufacturer: 'NetworkTech', model: 'NT-GW500' },
      
      // Acme Warehouse devices
      { siteId: siteIds['acme-warehouse'], name: 'Inventory Scanner 1', type: 'sensor' as const, serialNumber: 'INV-001', manufacturer: 'ScanTech', model: 'ST-Scan200' },
      { siteId: siteIds['acme-warehouse'], name: 'Loading Dock Camera', type: 'camera' as const, serialNumber: 'CAM-002', manufacturer: 'SecureTech', model: 'ST-4K-Pro' },
      { siteId: siteIds['acme-warehouse'], name: 'Environmental Monitor', type: 'sensor' as const, serialNumber: 'ENV-001', manufacturer: 'EnviroTech', model: 'ET-Multi' },
      
      // TechStart devices
      { siteId: siteIds['techstart-office'], name: 'Smart Thermostat', type: 'controller' as const, serialNumber: 'THERM-001', manufacturer: 'SmartHome', model: 'SH-T300' },
      { siteId: siteIds['techstart-office'], name: 'Conference Room Display', type: 'actuator' as const, serialNumber: 'DISP-001', manufacturer: 'DisplayTech', model: 'DT-55' },
      
      // Beta Lab devices
      { siteId: siteIds['beta-lab'], name: 'Lab Server 1', type: 'server' as const, serialNumber: 'SRV-001', manufacturer: 'DataCorp', model: 'DC-Server-Pro' },
      { siteId: siteIds['beta-lab'], name: 'Research Workstation 1', type: 'workstation' as const, serialNumber: 'WS-001', manufacturer: 'TechStation', model: 'TS-Pro-2024' },
      { siteId: siteIds['beta-lab'], name: 'Environmental Beacon', type: 'beacon' as const, serialNumber: 'BCN-001', manufacturer: 'BeaconTech', model: 'BT-Env' },
    ];

    for (const device of devicesData) {
      const [createdDevice] = await db.insert(devices).values({
        ...device,
        status: Math.random() > 0.2 ? 'online' : 'offline', // 80% online
        metadata: {
          installation_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in last year
          last_maintenance: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
          firmware_updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
          created_by_seeder: true
        },
        lastSeenAt: Math.random() > 0.1 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null, // 90% have been seen in last 24h
      }).returning();

      // Log device creation
      await db.insert(auditLogs).values({
        userId: systemAdminId,
        action: 'create',
        resourceType: 'device',
        resourceId: createdDevice.id,
        details: {
          deviceName: device.name,
          deviceType: device.type,
          createdBySeeder: true
        },
        success: true,
      });
    }

    console.log(`✅ Created ${devicesData.length} devices`);
  }

  async createSampleTasks(userIds: { [key: string]: string }, tenantIds: { [key: string]: string }): Promise<void> {
    console.log('📋 Creating sample tasks...');

    const tasksData = [
      {
        tenantId: tenantIds['acme-corp'],
        userId: userIds['acme-manager'],
        name: 'Review quarterly security audit',
        description: 'Complete the quarterly security audit review for all systems',
        priority: 'high' as const,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        done: false
      },
      {
        tenantId: tenantIds['acme-corp'],
        userId: userIds['acme-operator'],
        name: 'HVAC maintenance check',
        description: 'Perform routine maintenance on HVAC systems',
        priority: 'medium' as const,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        done: false
      },
      {
        tenantId: tenantIds['techstart'],
        userId: userIds['techstart-user'],
        name: 'Update device firmware',
        description: 'Update firmware on all IoT devices to latest version',
        priority: 'urgent' as const,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        done: false
      },
      {
        tenantId: tenantIds['beta-solutions'],
        userId: userIds['beta-admin'],
        name: 'Prepare demo environment',
        description: 'Set up demo environment for client presentation',
        priority: 'high' as const,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        done: true
      }
    ];

    for (const task of tasksData) {
      await db.insert(tasks).values(task);
    }

    console.log(`✅ Created ${tasksData.length} sample tasks`);
  }

  async run(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');
      
      await this.clearExistingData();
      
      const systemAdminId = await this.createSystemAdmin();
      const tenantIds = await this.createTenants(systemAdminId);
      const userIds = await this.createUsers(systemAdminId);
      
      await this.createUserTenantAssociations(systemAdminId, userIds, tenantIds);
      
      const siteIds = await this.createSites(systemAdminId, tenantIds);
      await this.createDevices(systemAdminId, siteIds);
      await this.createSampleTasks(userIds, tenantIds);

      console.log('\n🎉 Database seeding completed successfully!');
      console.log('\n📊 Summary:');
      console.log(`- System Admin: 1`);
      console.log(`- Tenants: ${Object.keys(tenantIds).length}`);
      console.log(`- Users: ${Object.keys(userIds).length}`);
      console.log(`- Sites: ${Object.keys(siteIds).length}`);
      console.log(`- Devices: 12`);
      console.log(`- Tasks: 4`);
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await pool.end();
  }
}

// CLI interface
async function main() {
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.run();
  } catch (error) {
    console.error('Seeding script failed:', error);
    process.exit(1);
  } finally {
    await seeder.cleanup();
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { DatabaseSeeder }; 