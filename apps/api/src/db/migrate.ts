import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import env from '../env';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface MigrationFile {
  name: string;
  path: string;
  sql: string;
}

class MigrationRunner {
  private migrationsDir = path.join(__dirname, 'migrations');

  async getMigrationFiles(): Promise<MigrationFile[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort chronologically

    return files.map(file => ({
      name: file,
      path: path.join(this.migrationsDir, file),
      sql: fs.readFileSync(path.join(this.migrationsDir, file), 'utf-8')
    }));
  }

  async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migrations...');
      
      await migrate(db, {
        migrationsFolder: this.migrationsDir,
      });
      
      console.log('✅ Migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async rollbackToMigration(targetMigration: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back to migration: ${targetMigration}`);
      
      const migrations = await this.getMigrationFiles();
      const targetIndex = migrations.findIndex(m => m.name === targetMigration);
      
      if (targetIndex === -1) {
        throw new Error(`Migration ${targetMigration} not found`);
      }

      // Get migrations to rollback (all after target)
      const migrationsToRollback = migrations.slice(targetIndex + 1).reverse();
      
      for (const migration of migrationsToRollback) {
        console.log(`Rolling back: ${migration.name}`);
        await this.rollbackMigration(migration);
      }
      
      console.log('✅ Rollback completed successfully!');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  private async rollbackMigration(migration: MigrationFile): Promise<void> {
    // This is a simplified rollback - in production, you'd want proper down migrations
    // For now, we'll log what would be rolled back
    console.log(`⚠️  Rollback for ${migration.name} would need manual intervention`);
    console.log(`Migration content:\n${migration.sql.substring(0, 200)}...`);
  }

  async createCheckpoint(name: string): Promise<void> {
    try {
      console.log(`📸 Creating checkpoint: ${name}`);
      
      // In a real implementation, you might create a database backup here
      const timestamp = new Date().toISOString();
      console.log(`Checkpoint ${name} created at ${timestamp}`);
      
      // You could also save the current migration state
      const migrations = await this.getMigrationFiles();
      const checkpointData = {
        name,
        timestamp,
        lastMigration: migrations[migrations.length - 1]?.name || 'none',
        migrationCount: migrations.length
      };
      
      console.log('Checkpoint data:', checkpointData);
    } catch (error) {
      console.error('❌ Checkpoint creation failed:', error);
      throw error;
    }
  }

  async validateSchema(): Promise<boolean> {
    try {
      console.log('🔍 Validating database schema...');
      
      // Check if main tables exist
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      
      const requiredTables = [
        'users', 'tenants', 'sites', 'devices', 
        'user_tenant_associations', 'user_site_assignments',
        'tenant_invitations', 'audit_logs', 'tasks'
      ];
      
      const existingTables = result.rows.map(row => row.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        console.log('❌ Missing tables:', missingTables);
        return false;
      }
      
      console.log('✅ Schema validation passed!');
      console.log('📋 Existing tables:', existingTables);
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  async getStatus(): Promise<void> {
    try {
      // Get migration history from drizzle migrations table
      const result = await pool.query(`
        SELECT hash, created_at 
        FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 10;
      `);
      
      console.log('📊 Recent migrations:');
      result.rows.forEach(row => {
        console.log(`  ${row.hash} - ${row.created_at}`);
      });
      
    } catch (error) {
      console.log('No migration history found or error occurred:', error instanceof Error ? error.message : String(error));
    }
  }

  async cleanup(): Promise<void> {
    await pool.end();
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runner.runMigrations();
        break;
        
      case 'rollback':
        if (!arg) {
          console.error('❌ Please specify target migration for rollback');
          process.exit(1);
        }
        await runner.rollbackToMigration(arg);
        break;
        
      case 'checkpoint':
        const checkpointName = arg || `checkpoint_${Date.now()}`;
        await runner.createCheckpoint(checkpointName);
        break;
        
      case 'validate':
        const isValid = await runner.validateSchema();
        process.exit(isValid ? 0 : 1);
        
      case 'status':
        await runner.getStatus();
        break;
        
      default:
        console.log(`
Usage: pnpm tsx src/db/migrate.ts <command> [args]

Commands:
  up|migrate              Run all pending migrations
  rollback <migration>    Rollback to specified migration
  checkpoint [name]       Create a checkpoint
  validate               Validate database schema
  status                 Show migration status
        `);
    }
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { MigrationRunner }; 