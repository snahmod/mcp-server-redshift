import pg from "pg";
import { config } from "./database.js";

// Create database pool
export const pool = new pg.Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
}); 