import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });

// Set default test environment variables if not set
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_PORT = process.env.DB_PORT || "5432";
process.env.DB_USER = process.env.DB_USER || "myappuser";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "myapppassword";
process.env.DB_NAME = process.env.DB_NAME || "myappdb_test";
process.env.KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
process.env.KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "contrack";
process.env.KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "contrackapi";