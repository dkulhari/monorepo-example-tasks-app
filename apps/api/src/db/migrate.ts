import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, basename, dirname } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { db } from "./index";
import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

// Migration tracking table
const migrations = pgTable("migrations", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull().unique(),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  success: boolean("success").notNull().default(true),
  checksum: varchar("checksum", { length: 64 }).notNull(),
});

interface MigrationFile {
  filename: string;
  filepath: string;
  checksum: string;
  isRollback: boolean;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor(migrationsPath: string) {
    this.migrationsPath = migrationsPath;
  }

  /**
   * Calculate checksum for a migration file
   */
  private calculateChecksum(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Get all migration files from the migrations directory
   */
  private getMigrationFiles(): MigrationFile[] {
    const files = readdirSync(this.migrationsPath)
      .filter(f => f.endsWith(".sql") && !f.includes("rollback"))
      .sort();

    return files.map(filename => {
      const filepath = join(this.migrationsPath, filename);
      const content = readFileSync(filepath, "utf-8");
      const checksum = this.calculateChecksum(content);
      
      return {
        filename,
        filepath,
        checksum,
        isRollback: false,
      };
    });
  }

  /**
   * Get rollback file for a migration
   */
  private getRollbackFile(migrationFile: string): MigrationFile | null {
    const baseName = migrationFile.replace(".sql", "");
    const rollbackFilename = `${baseName}_rollback.sql`;
    const rollbackPath = join(this.migrationsPath, rollbackFilename);

    if (existsSync(rollbackPath)) {
      const content = readFileSync(rollbackPath, "utf-8");
      return {
        filename: rollbackFilename,
        filepath: rollbackPath,
        checksum: this.calculateChecksum(content),
        isRollback: true,
      };
    }

    return null;
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async ensureMigrationsTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        checksum VARCHAR(64) NOT NULL
      )
    `);
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<Set<string>> {
    const result = await db.select({ filename: migrations.filename }).from(migrations);
    return new Set(result.map(r => r.filename));
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: MigrationFile): Promise<void> {
    const content = readFileSync(migration.filepath, "utf-8");
    
    console.log(`📄 Applying migration: ${migration.filename}`);
    
    const startTime = Date.now();
    
    try {
      // Split by semicolon but respect statements that might contain semicolons in strings
      const statements = content
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(sql.raw(statement));
        }
      }

      // Record successful migration
      await db.insert(migrations).values({
        filename: migration.filename,
        checksum: migration.checksum,
        success: true,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Applied ${migration.filename} (${duration}ms)`);
      
    } catch (error) {
      console.error(`❌ Failed to apply ${migration.filename}:`, error);
      
      // Record failed migration
      try {
        await db.insert(migrations).values({
          filename: migration.filename,
          checksum: migration.checksum,
          success: false,
        });
      } catch (recordError) {
        // Ignore error recording failure
      }
      
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async up(): Promise<void> {
    console.log("🚀 Running migrations...\n");

    await this.ensureMigrationsTable();
    
    const migrationFiles = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const pendingMigrations = migrationFiles.filter(
      m => !appliedMigrations.has(m.filename)
    );

    if (pendingMigrations.length === 0) {
      console.log("✨ No pending migrations");
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)\n`);

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    console.log("\n✨ All migrations completed successfully!");
  }

  /**
   * Rollback the last migration
   */
  async down(): Promise<void> {
    console.log("🔄 Rolling back last migration...\n");

    await this.ensureMigrationsTable();

    // Get the last successful migration
    const lastMigration = await db
      .select()
      .from(migrations)
      .where(sql`${migrations.success} = true`)
      .orderBy(sql`${migrations.appliedAt} DESC`)
      .limit(1);

    if (lastMigration.length === 0) {
      console.log("✨ No migrations to rollback");
      return;
    }

    const migrationToRollback = lastMigration[0];
    const rollbackFile = this.getRollbackFile(migrationToRollback.filename);

    if (!rollbackFile) {
      console.error(`❌ No rollback file found for ${migrationToRollback.filename}`);
      console.log(`   Expected: ${migrationToRollback.filename.replace('.sql', '_rollback.sql')}`);
      return;
    }

    console.log(`📄 Rolling back: ${migrationToRollback.filename}`);

    try {
      const content = readFileSync(rollbackFile.filepath, "utf-8");
      const statements = content
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(sql.raw(statement));
        }
      }

      // Remove the migration record
      await db
        .delete(migrations)
        .where(sql`${migrations.filename} = ${migrationToRollback.filename}`);

      console.log(`✅ Rolled back ${migrationToRollback.filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to rollback ${migrationToRollback.filename}:`, error);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    console.log("📊 Migration Status\n");

    await this.ensureMigrationsTable();

    const migrationFiles = this.getMigrationFiles();
    const appliedRecords = await db
      .select()
      .from(migrations)
      .orderBy(migrations.appliedAt);

    const appliedMap = new Map(
      appliedRecords.map(r => [r.filename, r])
    );

    console.log("File                                    | Status    | Applied At");
    console.log("---------------------------------------------------------------------");

    for (const file of migrationFiles) {
      const applied = appliedMap.get(file.filename);
      const status = applied 
        ? (applied.success ? "✅ Applied" : "❌ Failed") 
        : "⏳ Pending";
      const appliedAt = applied 
        ? applied.appliedAt.toISOString().replace("T", " ").substring(0, 19)
        : "-";
      
      console.log(
        `${file.filename.padEnd(40)} | ${status.padEnd(10)} | ${appliedAt}`
      );
    }

    const pending = migrationFiles.filter(f => !appliedMap.has(f.filename));
    console.log(`\n📌 Summary: ${appliedRecords.length} applied, ${pending.length} pending`);
  }

  /**
   * Create a new migration file
   */
  async create(name: string): Promise<void> {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .substring(0, 15);
    
    const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, "_")}.sql`;
    const rollbackFilename = filename.replace(".sql", "_rollback.sql");
    
    const migrationPath = join(this.migrationsPath, filename);
    const rollbackPath = join(this.migrationsPath, rollbackFilename);

    const migrationTemplate = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}

-- Add your migration SQL here

`;

    const rollbackTemplate = `-- Rollback for: ${name}
-- Created at: ${new Date().toISOString()}

-- Add your rollback SQL here

`;

    writeFileSync(migrationPath, migrationTemplate);
    writeFileSync(rollbackPath, rollbackTemplate);

    console.log(`✅ Created migration files:`);
    console.log(`   - ${filename}`);
    console.log(`   - ${rollbackFilename}`);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsPath = join(__dirname, "migrations");
  const runner = new MigrationRunner(migrationsPath);

  try {
    switch (command) {
      case "up":
        await runner.up();
        break;
      
      case "down":
        await runner.down();
        break;
      
      case "status":
        await runner.status();
        break;
      
      case "create":
        const name = process.argv[3];
        if (!name) {
          console.error("❌ Please provide a migration name");
          console.log("Usage: npm run migrate create <migration-name>");
          process.exit(1);
        }
        await runner.create(name);
        break;
      
      default:
        console.log("📋 Database Migration Tool\n");
        console.log("Commands:");
        console.log("  up      - Run all pending migrations");
        console.log("  down    - Rollback the last migration");
        console.log("  status  - Show migration status");
        console.log("  create  - Create a new migration file");
        console.log("\nUsage:");
        console.log("  npm run migrate <command>");
        console.log("  npm run migrate create <migration-name>");
    }
  } catch (error) {
    console.error("\n💥 Migration error:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Export for programmatic use
export { MigrationRunner };

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}