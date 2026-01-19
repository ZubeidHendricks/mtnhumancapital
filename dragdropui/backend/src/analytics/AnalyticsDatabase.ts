import { Pool } from 'pg';

interface AnalyticsSnapshot {
  id?: number;
  total_posts: number;
  total_pages: number;
  total_users: number;
  total_comments: number;
  total_media: number;
  active_plugins: number;
  created_at?: Date;
}

export class AnalyticsDatabase {
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
        CREATE TABLE IF NOT EXISTS analytics_snapshots (
          id SERIAL PRIMARY KEY,
          total_posts INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          total_users INTEGER DEFAULT 0,
          total_comments INTEGER DEFAULT 0,
          total_media INTEGER DEFAULT 0,
          active_plugins INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_created_at (created_at)
        )
      `);
    } finally {
      client.release();
    }
  }

  async saveSnapshot(snapshot: AnalyticsSnapshot): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO analytics_snapshots 
         (total_posts, total_pages, total_users, total_comments, total_media, active_plugins)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          snapshot.total_posts,
          snapshot.total_pages,
          snapshot.total_users,
          snapshot.total_comments,
          snapshot.total_media,
          snapshot.active_plugins,
        ]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async getSnapshots(limit: number = 30): Promise<AnalyticsSnapshot[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM analytics_snapshots ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getSnapshotsBetween(startDate: Date, endDate: Date): Promise<AnalyticsSnapshot[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM analytics_snapshots WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC',
        [startDate, endDate]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async cleanupOldSnapshots(daysToKeep: number = 365): Promise<number> {
    const client = await this.pool.connect();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await client.query(
        'DELETE FROM analytics_snapshots WHERE created_at < $1',
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
