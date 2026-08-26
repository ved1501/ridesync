import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "ridesync_db",
  password: "postgres",
  port: 5432,
});

export default pool;