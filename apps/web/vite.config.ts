import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { join } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Load API .env file to get the PORT
const apiEnvPath = join(__dirname, "../api/.env");
const apiEnvResult = config({ path: apiEnvPath });

// Get API port from .env file or use default
const apiPort = !apiEnvResult.error && apiEnvResult.parsed?.PORT 
  ? apiEnvResult.parsed.PORT 
  : "4001";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    tsconfigPaths(),
    TanStackRouterVite({
      routeFilePrefix: "~",
      routeTreeFileHeader: [
        "/* eslint-disable eslint-comments/no-unlimited-disable */",
        "/* eslint-disable */",
      ],
      generatedRouteTree: "./src/route-tree.gen.ts",

    }),
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": `http://localhost:${apiPort}`,
    },
  },
});
