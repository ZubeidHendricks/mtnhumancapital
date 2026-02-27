require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const wfId = "1482ec9f-812d-4ac0-a4e5-3b3465ae7ffb";
(async () => {
  await pool.query("DELETE FROM onboarding_agent_logs WHERE workflow_id = $1", [wfId]);
  await pool.query("DELETE FROM onboarding_document_requests WHERE workflow_id = $1", [wfId]);
  await pool.query("DELETE FROM onboarding_workflows WHERE id = $1", [wfId]);
  console.log("Deleted workflow, document requests, and logs for Lindiwe Khumalo");
  pool.end();
})();
