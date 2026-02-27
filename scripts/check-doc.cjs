require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const res = await pool.query("SELECT id, status, received_document_id, document_name FROM onboarding_document_requests WHERE status = 'received' LIMIT 5");
  console.log("Doc requests:", JSON.stringify(res.rows, null, 2));
  if (res.rows[0] && res.rows[0].received_document_id) {
    const doc = await pool.query("SELECT id, filename, original_filename, file_path, mime_type, type FROM documents WHERE id = $1", [res.rows[0].received_document_id]);
    console.log("Document record:", JSON.stringify(doc.rows, null, 2));
  }
  pool.end();
})();
