import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
    port: 4000,
    proxy: {
      "/api": "http://localhost:4001",
    },
  },
});
