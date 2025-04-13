import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import dotenv from "dotenv";
import { DatabaseConfig, TableInfo, ColumnInfo } from "./types.js";


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
      tools: {},
    },
  }
);

// Tool: List all tables, views, and materialized views
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "list_tables",
      description: "List all tables, views, and materialized views in the specified schemas",
      inputSchema: {
        type: "object",
        properties: {
          schemas: {
            type: "array",
            items: { type: "string" },
            description: "List of schemas to list tables from. If not provided, uses configured schemas."
          }
        }
      }
    }, {
      name: "get_table_schema",
      description: "Get the schema information for a specific table",
      inputSchema: {
        type: "object",
        properties: {
          schema: {
            type: "string",
            description: "The schema name"
          },
          table: {
            type: "string",
            description: "The table name"
          }
        },
        required: ["schema", "table"]
      }
    }, {
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
  const client = await pool.connect();
  try {
    switch (request.params.name) {
      case "list_tables": {
        const schemas = (request.params.arguments?.schemas as string[] | undefined) || config.schemas;
        const schemasList = schemas.map(s => `'${s}'`).join(",");
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
          content: [{
            type: "text",
            text: JSON.stringify(result.rows, null, 2)
          }],
          isError: false,
        };
      }

      case "get_table_schema": {
        const { schema, table } = request.params.arguments as { schema: string, table: string };
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
          content: [{
            type: "text",
            text: JSON.stringify(result.rows, null, 2)
          }],
          isError: false,
        };
      }

      case "query": {
        const sql = request.params.arguments?.sql as string;
        
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
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    throw error;
  } finally {
    if (request.params.name === "query") {
      // Always rollback the read-only transaction for query tool
      await client.query("ROLLBACK").catch((error: Error) => 
        console.warn("Could not rollback the read-only transaction:", error)
      );
    }
    client.release();
  }
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error); 