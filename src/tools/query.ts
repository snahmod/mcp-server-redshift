import { pool } from "../config/pool.js";

export async function handleQuery(sql: string) {
  const client = await pool.connect();
  try {
    // Start a read-only transaction
    await client.query("BEGIN TRANSACTION READ ONLY");
    
    const result = await client.query(sql);
    
    return result.rows;
  } finally {
    // Always rollback the read-only transaction
    await client.query("ROLLBACK").catch((error: Error) => 
      console.warn("Could not rollback the read-only transaction:", error)
    );
    client.release();
  }
} 