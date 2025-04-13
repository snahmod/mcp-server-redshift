import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env
const envPath = resolve(__dirname, "../.env");
const result = config({ path: envPath });

if (result.error) {
  console.error("Error loading .env file:", result.error);
  process.exit(1);
}

// Verify required environment variables
const requiredEnvVars = ["REDSHIFT_HOST", "REDSHIFT_DATABASE", "REDSHIFT_USER", "REDSHIFT_PASSWORD"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("Missing required environment variables:", missingVars.join(", "));
  console.error("Please make sure your .env file contains all required variables.");
  process.exit(1);
}

// Create a clean environment object with only string values
const cleanEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    cleanEnv[key] = value;
  }
}

interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError: boolean;
}

async function runTests() {
  let serverProcess: ChildProcess | null = null;

  try {
    // Start the MCP server with environment variables
    serverProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "inherit"],
      env: cleanEnv
    });

    // Create MCP client
    const transport = new StdioClientTransport({
      command: "node",
      args: [join(__dirname, "../dist/index.js")],
      env: cleanEnv
    });
    
    const client = new Client(
      {
        name: "mcp-test-client",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Connect to the server
    await client.connect(transport);
    console.log("Connected to MCP server\n");

    // Test 1: List available tools
    console.log("Test 1: Listing available tools");
    const tools = await client.listTools({});
    console.log("Available tools:", JSON.stringify(tools, null, 2));
    console.log();

    // Test 2: List tables (using default schemas)
    console.log("Test 2: Listing tables (default schemas)");
    const listTablesResult = await client.callTool({
      name: "list_tables",
      arguments: {}
    }) as ToolResponse;
    console.log("Tables:", JSON.stringify(JSON.parse(listTablesResult.content[0].text), null, 2));
    console.log();

    // Test 3: List tables (specific schema)
    console.log("Test 3: Listing tables (specific schema)");
    const listTablesSchemaResult = await client.callTool({
      name: "list_tables",
      arguments: {
        schemas: ["utility_go"]
      }
    }) as ToolResponse;
    console.log("Tables in utility_go schema:", JSON.stringify(JSON.parse(listTablesSchemaResult.content[0].text), null, 2));
    console.log();

    // Test 4: Get table schema
    console.log("Test 4: Getting table schema");
    const getSchemaResult = await client.callTool({
      name: "get_table_schema",
      arguments: {
        schema: "utility_go",
        table: "users"
      }
    }) as ToolResponse;
    console.log("Table schema:", JSON.stringify(JSON.parse(getSchemaResult.content[0].text), null, 2));
    console.log();

    // Test 5: Execute query
    console.log("Test 5: Executing query");
    const queryResult = await client.callTool({
      name: "query",
      arguments: {
        sql: "SELECT * FROM utility_go.users LIMIT 5"
      }
    }) as ToolResponse;
    console.log("Query result:", JSON.stringify(JSON.parse(queryResult.content[0].text), null, 2));
    console.log();

    console.log("All tests completed successfully!");
    
  } catch (error) {
    console.error("Error running tests:", error);
    process.exit(1);
  } finally {
    // Kill the server process
    if (serverProcess) {
      serverProcess.kill();
    }
    
    // Exit the process
    process.exit(0);
  }
}

// Run the tests
runTests(); 