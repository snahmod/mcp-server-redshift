import dotenv from "dotenv";
import { DatabaseConfig } from "../types.js";

// Load environment variables
dotenv.config();

// Validate and load configuration
export const config: DatabaseConfig = {
  host: process.env.REDSHIFT_HOST!,
  port: parseInt(process.env.REDSHIFT_PORT || "5439"),
  database: process.env.REDSHIFT_DATABASE!,
  user: process.env.REDSHIFT_USER!,
  password: process.env.REDSHIFT_PASSWORD!,
  schemas: (process.env.REDSHIFT_SCHEMAS || "public").split(","),
};

// Validate required environment variables
export function validateConfig() {
  const requiredEnvVars = ["REDSHIFT_HOST", "REDSHIFT_DATABASE", "REDSHIFT_USER", "REDSHIFT_PASSWORD"];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
} 