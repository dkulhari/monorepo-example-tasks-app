import { serve } from "@hono/node-server";
import { config } from "dotenv";

import app from "./app";

// Load environment variables
config();

const port = Number(process.env.PORT) || 3001;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
