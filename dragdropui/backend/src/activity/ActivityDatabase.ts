import { Pool, PoolClient } from 'pg';

interface ActivityLogEntry {
  id?: number;
  user_id: number;
  action: string;
  object_type: string;
  object_id: number;
  ip_address: string;
  user_agent: string;
  created_at?: Date;
  meta?: Record<string, any>;
}

export class ActivityDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'uixpress',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          action VARCHAR(255) NOT NULL,
          object_type VARCHAR(100),
          object_id INTEGER,
          ip_address VARCHAR(45),
          user_agent TEXT,
          meta JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_action (action),
          INDEX idx_created_at (created_at),
          INDEX idx_object_type_id (object_type, object_id)
        )
      `);
    } finally {
      client.release();
    }
  }

  async logActivity(entry: ActivityLogEntry): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO activity_log 
         (user_id, action, object_type, object_id, ip_address, user_agent, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          entry.user_id,
          entry.action,
          entry.object_type,
          entry.object_id,
          entry.ip_address,
          entry.user_agent,
          JSON.stringify(entry.meta || {}),
        ]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async getActivities(options: {
    userId?: number;
    action?: string;
    objectType?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ActivityLogEntry[]> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM activity_log WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (options.userId) {
        query += ` AND user_id = $${paramCount++}`;
        params.push(options.userId);
      }

      if (options.action) {
        query += ` AND action = $${paramCount++}`;
        params.push(options.action);
      }

      if (options.objectType) {
        query += ` AND object_type = $${paramCount++}`;
        params.push(options.objectType);
      }

      if (options.startDate) {
        query += ` AND created_at >= $${paramCount++}`;
        params.push(options.startDate);
      }

      if (options.endDate) {
        query += ` AND created_at <= $${paramCount++}`;
        params.push(options.endDate);
      }

      query += ' ORDER BY created_at DESC';

      if (options.limit) {
        query += ` LIMIT $${paramCount++}`;
        params.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${paramCount++}`;
        params.push(options.offset);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const client = await this.pool.connect();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await client.query(
        'DELETE FROM activity_log WHERE created_at < $1',
        [cutoffDate]
      );
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
