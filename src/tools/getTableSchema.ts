import { pool } from "../config/pool.js";

interface TableSchema {
  schema: string;
  table: string;
  columns: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
    description: string;
  }>;
}

export async function handleGetTablesSchema(tables: Array<{ schema: string; table: string }>) {
  const client = await pool.connect();
  try {
    const results: TableSchema[] = [];
    
    for (const { schema, table } of tables) {
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

      results.push({
        schema,
        table,
        columns: result.rows
      });
    }

    return results;
  } finally {
    client.release();
  }
} 