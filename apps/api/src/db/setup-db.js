// Run if called directly
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import env from "../env";
async function setupDatabase() {
    console.log("🔧 Database Setup Script");
    console.log("========================\n");
    // Connect to PostgreSQL without specifying a database
    const client = new Client({
        host: env.DB_HOST,
        port: Number(env.DB_PORT),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        // Connect to the default 'postgres' database to check/create our target database
        database: "postgres",
    });
    try {
        console.log(`📡 Connecting to PostgreSQL at ${env.DB_HOST}:${env.DB_PORT}...`);
        await client.connect();
        console.log("✅ Connected successfully\n");
        // Check if database exists
        console.log(`🔍 Checking if database '${env.DB_NAME}' exists...`);
        const checkDbQuery = `
      SELECT 1 FROM pg_database 
      WHERE datname = $1
    `;
        const result = await client.query(checkDbQuery, [env.DB_NAME]);
        if (result.rowCount === 0) {
            // Database doesn't exist, create it
            console.log(`📦 Database '${env.DB_NAME}' not found. Creating...`);
            // Note: CREATE DATABASE cannot be executed in a transaction block
            // and cannot use parameterized queries, so we need to be careful with SQL injection
            const createDbQuery = `CREATE DATABASE "${env.DB_NAME}"`;
            await client.query(createDbQuery);
            console.log(`✅ Database '${env.DB_NAME}' created successfully!\n`);
        }
        else {
            console.log(`✅ Database '${env.DB_NAME}' already exists\n`);
        }
        // Check if we can connect to the target database
        const targetClient = new Client({
            host: env.DB_HOST,
            port: Number(env.DB_PORT),
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
        });
        console.log(`🔗 Testing connection to '${env.DB_NAME}'...`);
        await targetClient.connect();
        console.log("✅ Successfully connected to target database\n");
        // Check if any tables exist
        const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
        const tablesResult = await targetClient.query(tablesQuery);
        if (tablesResult.rows.length > 0) {
            console.log("📊 Existing tables found:");
            tablesResult.rows.forEach((row) => {
                console.log(`   - ${row.tablename}`);
            });
        }
        else {
            console.log("📭 No tables found. Database is empty.");
        }
        await targetClient.end();
        console.log("\n✨ Database setup complete!");
        console.log("\n📝 Next steps:");
        console.log("   1. Run 'pnpm db:migrate' to apply migrations");
        console.log("   2. Run 'pnpm seed:multi-tenant' to add sample data");
    }
    catch (error) {
        console.error("\n❌ Database setup failed:", error);
        if (error instanceof Error) {
            if (error.message.includes("ECONNREFUSED")) {
                console.error("\n🔌 Connection refused. Please ensure:");
                console.error("   - PostgreSQL is running");
                console.error("   - Connection details in .env are correct");
                console.error("   - Database server is accessible");
            }
            else if (error.message.includes("password authentication failed")) {
                console.error("\n🔑 Authentication failed. Please check:");
                console.error("   - DB_USER and DB_PASSWORD in .env");
                console.error("   - User exists in PostgreSQL");
                console.error("   - User has correct permissions");
            }
        }
        process.exit(1);
    }
    finally {
        await client.end();
    }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    setupDatabase().catch(console.error);
}
export { setupDatabase };
