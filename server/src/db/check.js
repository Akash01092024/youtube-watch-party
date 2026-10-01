import { sql } from "drizzle-orm";
import { db, pool } from "./index.js";

try {
  const result = await db.execute(
    sql`SELECT current_database() AS database`
  );

  console.log("Database connected:", result.rows[0].database);
} catch (error) {
  console.error("Database connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}