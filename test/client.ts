import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTest() {
  console.log("Starting MCP Redshift Server Test Client\n");

  let serverProcess: ChildProcess | null = null;
  let isShuttingDown = false;

  // Handle process termination
  const cleanup = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (serverProcess) {
      console.log("\nShutting down server process...");
      serverProcess.kill();
      serverProcess = null;
    }
    process.exit(0);
  };

  // Handle termination signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Start the MCP server as a child process
    serverProcess = spawn("node", [join(__dirname, "../dist/index.js")], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Handle server process errors
    if (serverProcess.stderr) {
      serverProcess.stderr.on("data", (data) => {
        console.error("Server error:", data.toString());
      });
    }

    // Handle server process exit
    serverProcess.on('exit', (code) => {
      if (code !== 0 && !isShuttingDown) {
        console.error(`Server process exited with code ${code}`);
        cleanup();
      }
    });

    // Create MCP client
    const transport = new StdioClientTransport({
      command: "node",
      args: [join(__dirname, "../dist/index.js")],
    });
    
    const client = new Client(
      {
        name: "mcp-test-client",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Connect to the server
    await client.connect(transport);
    console.log("✅ Connected to MCP server\n");

    // Test 1: List Resources (Tables, Views, Materialized Views)
    console.log("Test 1: Listing all tables, views, and materialized views");
    const resources = await client.listResources({});
    console.log("Found resources:");
    resources.resources.forEach(resource => {
      console.log(`- ${resource.name}${resource.description ? ` (${resource.description})` : ""}`);
    });
    console.log();

    // Test 2: Get Schema for first table
    if (resources.resources.length > 0) {
      console.log("Test 2: Getting schema for first table");
      const firstTable = resources.resources[0];
      console.log(`Using table: ${firstTable.name} with URI: ${firstTable.uri}`);
      
      const schema = await client.readResource({ uri: firstTable.uri });
      console.log("Table schema:");
      console.log(JSON.stringify(JSON.parse(schema.contents[0].text as string), null, 2));
      console.log();
    }

    // Test 3: Get Schema for a view (if available)
    const viewResource = resources.resources.find(resource => 
      resource.name.includes("(VIEW)") || resource.name.includes("(MATERIALIZED VIEW)")
    );
    
    if (viewResource) {
      console.log("Test 3: Getting schema for a view");
      console.log(`Using view: ${viewResource.name} with URI: ${viewResource.uri}`);
      
      const viewSchema = await client.readResource({ uri: viewResource.uri });
      console.log("View schema:");
      console.log(JSON.stringify(JSON.parse(viewSchema.contents[0].text as string), null, 2));
      console.log();
    } else {
      console.log("Test 3: No views found in the database");
      console.log();
    }

    // Test 4: Execute a count query on a table
    if (resources.resources.length > 0) {
      console.log("Test 4: Executing a count query on a table");
      const tableToCount = resources.resources[0];
      const tableName = tableToCount.name.split(" (")[0]; // Remove the type part
      
      console.log(`Counting rows in: ${tableName}`);
      const countResult = await client.callTool({
        name: "query",
        arguments: {
          sql: `SELECT COUNT(*) as count FROM ${tableName}`
        }
      });
      
      if (countResult.content && countResult.content[0] && 'text' in countResult.content[0]) {
        console.log("Count result:");
        console.log(JSON.stringify(JSON.parse(countResult.content[0].text as string), null, 2));
      } else {
        console.log("No count results returned");
      }
      console.log();
    }

    // Test 5: Execute a simple query
    console.log("Test 5: Executing a simple query");
    const queryResult = await client.callTool({
      name: "query",
      arguments: {
        sql: "SELECT current_database() as database, current_user as user, current_timestamp as timestamp"
      }
    });
    
    if (queryResult.content && queryResult.content[0] && 'text' in queryResult.content[0]) {
      console.log("Query result:");
      console.log(JSON.stringify(JSON.parse(queryResult.content[0].text as string), null, 2));
    } else {
      console.log("No query results returned");
    }
    console.log();

    // Cleanup and exit
    await cleanup();

  } catch (error) {
    console.error("❌ Error during test:", error);
    await cleanup();
  }
}

// Run the test
runTest().catch(async (error) => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 