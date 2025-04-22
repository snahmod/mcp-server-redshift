import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { handleListTables } from "../tools/listTables.js";
import { handleGetTablesSchema } from "../tools/getTablesSchema.js";
import { handleQuery } from "../tools/query.js";

export function createServer() {
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
        name: "get_tables_schema",
        description: "Get schema information for multiple tables across different schemas in a single request",
        inputSchema: {
          type: "object",
          properties: {
            tables: {
              type: "array",
              items: {
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
              },
              description: "List of tables to get schema information for"
            }
          },
          required: ["tables"]
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
    try {
      switch (request.params.name) {
        case "list_tables": {
          const schemas = request.params.arguments?.schemas as string[] | undefined;
          const result = await handleListTables(schemas);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            isError: false,
          };
        }

        case "get_tables_schema": {
          const { tables } = request.params.arguments as { tables: Array<{ schema: string; table: string }> };
          const result = await handleGetTablesSchema(tables);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            isError: false,
          };
        }

        case "query": {
          const sql = request.params.arguments?.sql as string;
          const result = await handleQuery(sql);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            isError: false,
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      throw error;
    }
  });

  return server;
} 