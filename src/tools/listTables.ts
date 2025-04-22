import { pool } from "../config/pool.js";
import { config } from "../config/database.js";

export async function handleListTables(schemas?: string[]) {
  console.log("Starting list_tables handler...");
  const client = await pool.connect();
  try {
    console.log("Connected to database");
    const schemasToUse = schemas || config.schemas;
    console.log("Using schemas:", schemasToUse);
    const schemasList = schemasToUse.map(s => `'${s}'`).join(",");
    console.log("Executing query...");
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
    console.log("Query completed successfully");
    return result.rows;
  } catch (error) {
    console.error("Error in list_tables:", error);
    throw error;
  } finally {
    console.log("Releasing database connection");
    client.release();
  }
} 