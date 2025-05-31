import { fileURLToPath } from "node:url";
import { Client } from "pg";

import env from "../env";

async function resetDatabase() {
  console.log("⚠️  Database Reset Script");
  console.log("========================\n");
  console.log("This will DROP and RECREATE the database!");
  console.log(`Database: ${env.DB_NAME}`);
  console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Connect to PostgreSQL without specifying a database
  const client = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: "postgres",
  });

  try {
    console.log(`📡 Connecting to PostgreSQL...`);
    await client.connect();

    // Terminate existing connections to the database
    console.log(`🔌 Terminating existing connections to '${env.DB_NAME}'...`);
    const terminateQuery = `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `;
    await client.query(terminateQuery, [env.DB_NAME]);

    // Drop the database if it exists
    console.log(`🗑️  Dropping database '${env.DB_NAME}' if exists...`);
    await client.query(`DROP DATABASE IF EXISTS "${env.DB_NAME}"`);

    // Create fresh database
    console.log(`📦 Creating fresh database '${env.DB_NAME}'...`);
    await client.query(`CREATE DATABASE "${env.DB_NAME}"`);

    console.log("✅ Database reset complete!\n");

    // Connect to the new database and create extensions
    const targetClient = new Client({
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    });

    await targetClient.connect();

    console.log("🔧 Creating database extensions...");
    await targetClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await targetClient.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log("✅ Extensions created\n");

    await targetClient.end();

    console.log("📝 Next steps:");
    console.log("   1. Run 'pnpm db:migrate' to apply schema migrations");
    console.log("   2. Run 'pnpm seed:multi-tenant' to add sample data");
  }
  catch (error) {
    console.error("\n❌ Database reset failed:", error);
    process.exit(1);
  }
  finally {
    await client.end();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetDatabase().catch(console.error);
}

export { resetDatabase };
