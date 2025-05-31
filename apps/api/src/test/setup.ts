// Jest setup file for API tests

/* eslint-disable node/no-process-env */

// Set test environment
process.env.NODE_ENV = "test";

// Mock environment variables for tests
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5432";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";
process.env.DB_NAME = "test";
process.env.KEYCLOAK_URL = "http://localhost:8080";
process.env.KEYCLOAK_REALM = "test";
process.env.KEYCLOAK_CLIENT_ID = "test";
process.env.PERMIFY_ENABLED = "true";
process.env.PERMIFY_ENDPOINT = "localhost:3476";
process.env.PERMIFY_TENANT_ID = "test";

/* eslint-enable node/no-process-env */
