import { validateConfig } from "./config/database.js";
import { createServer } from "./server/setup.js";
import { setupTransport } from "./server/transports.js";

async function main() {
  // Validate configuration
  validateConfig();

  // Create and setup server
  const server = createServer();

  // Setup transport and start server
  await setupTransport(server);
}

main().catch(console.error); 