import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ReadResourceRequest,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import dotenv from "dotenv";
import { DatabaseConfig, TableInfo, ColumnInfo } from "./types.js";

// Load environment variables
dotenv.config();

// Validate and load configuration
const config: DatabaseConfig = {
  host: process.env.REDSHIFT_HOST!,
  port: parseInt(process.env.REDSHIFT_PORT || "5439"),
  database: process.env.REDSHIFT_DATABASE!,
  user: process.env.REDSHIFT_USER!,
  password: process.env.REDSHIFT_PASSWORD!,
  schemas: (process.env.REDSHIFT_SCHEMAS || "public").split(","),
};

// Validate required environment variables
const requiredEnvVars = ["REDSHIFT_HOST", "REDSHIFT_DATABASE", "REDSHIFT_USER", "REDSHIFT_PASSWORD"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create database pool
const pool = new pg.Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
});

// Create MCP server
const server = new Server(
  {
    name: "mcp-server-redshift",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Resource: List all tables, views, and materialized views
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const client = await pool.connect();
  try {
    const schemasList = config.schemas.map(s => `'${s}'`).join(",");
    const result = await client.query(`
      SELECT 
        table_schema as schema,
        table_name as name,
        table_type as type,
        COALESCE(
          (SELECT pg_catalog.obj_description(c.oid) 
           FROM pg_catalog.pg_class c 
           WHERE c.relname = t.table_name 
           AND c.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = t.table_schema)
          ), 
          '') as description
      FROM information_schema.tables t
      WHERE table_schema IN (${schemasList})
      AND table_type IN ('BASE TABLE', 'VIEW', 'MATERIALIZED VIEW')
      ORDER BY table_schema, table_name
    `);

    return {
      resources: result.rows.map((row: TableInfo & { type: string }) => ({
        uri: `redshift://${config.host}/${row.schema}/${row.name}`,
        mimeType: "application/json",
        name: `${row.schema}.${row.name} (${row.type})`,
        description: row.description || undefined,
      })),
    };
  } finally {
    client.release();
  }
});

// Resource: Get table schema
server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
  try {
    const uri = new URL(request.params.uri);
    
    // Extract schema and table from the URI path
    // The path format is: /schema/table
    const pathParts = uri.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 2) {
      throw new Error(`Invalid resource URI: ${request.params.uri}. Expected format: redshift://host/schema/table`);
    }
    
    const schema = pathParts[0];
    const table = pathParts[1];
    
    console.log(`Reading schema for table: ${schema}.${table}`);

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          column_name as name,
          data_type as "dataType",
          is_nullable = 'YES' as "isNullable",
          COALESCE(
            (SELECT pg_catalog.col_description(c.oid, a.attnum) 
             FROM pg_catalog.pg_class c 
             JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid 
             WHERE c.relname = $2 
             AND c.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = $1)
             AND a.attname = information_schema.columns.column_name
             AND a.attnum > 0
            ), 
            '') as description
        FROM information_schema.columns 
        WHERE table_schema = $1 
        AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, table]);

      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(result.rows, null, 2),
        }],
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error processing request: ${error}`);
    throw error;
  }
});

// Tool: Execute read-only query
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "query",
      description: "Execute a read-only SQL query against the Redshift database",
      inputSchema: {
        type: "object",
        properties: {
          sql: { 
            type: "string",
            description: "The SQL query to execute"
          },
        },
        required: ["sql"],
      },
    }],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  if (request.params.name === "query") {
    const sql = request.params.arguments?.sql as string;
    const client = await pool.connect();

    try {
      // Start a read-only transaction
      await client.query("BEGIN TRANSACTION READ ONLY");
      
      const result = await client.query(sql);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result.rows, null, 2)
        }],
        isError: false,
      };
    } catch (error) {
      throw error;
    } finally {
      // Always rollback the read-only transaction
      await client.query("ROLLBACK").catch((error: Error) => 
        console.warn("Could not rollback the read-only transaction:", error)
      );
      client.release();
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error); 