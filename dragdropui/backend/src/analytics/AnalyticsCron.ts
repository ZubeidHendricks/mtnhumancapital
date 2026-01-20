import { CronJob } from 'cron';
import { AnalyticsDatabase } from './AnalyticsDatabase';

export class AnalyticsCron {
  private db: AnalyticsDatabase;
  private snapshotJob: CronJob | null = null;
  private cleanupJob: CronJob | null = null;

  constructor() {
    this.db = new AnalyticsDatabase();
  }

  /**
   * Start snapshot cron job - runs hourly
   */
  startSnapshot(): void {
    if (this.snapshotJob) {
      console.log('Analytics snapshot job already running');
      return;
    }

    // Run every hour
    this.snapshotJob = new CronJob(
      '0 * * * *',
      async () => {
        try {
          console.log('Creating analytics snapshot...');
          const snapshot = await this.collectAnalytics();
          await this.db.saveSnapshot(snapshot);
          console.log('Analytics snapshot created successfully');
        } catch (error) {
          console.error('Analytics snapshot failed:', error);
        }
      },
      null,
      true,
      'UTC'
    );

    console.log('Analytics snapshot cron job started (runs hourly)');
  }

  /**
   * Start cleanup cron job - runs daily
   */
  startCleanup(daysToKeep: number = 365): void {
    if (this.cleanupJob) {
      console.log('Analytics cleanup job already running');
      return;
    }

    // Run daily at 2 AM
    this.cleanupJob = new CronJob(
      '0 2 * * *',
      async () => {
        try {
          console.log('Running analytics cleanup...');
          const deletedCount = await this.db.cleanupOldSnapshots(daysToKeep);
          console.log(`Analytics cleanup complete: ${deletedCount} snapshots deleted`);
        } catch (error) {
          console.error('Analytics cleanup failed:', error);
        }
      },
      null,
      true,
      'UTC'
    );

    console.log(`Analytics cleanup cron job started (keeping last ${daysToKeep} days)`);
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    if (this.snapshotJob) {
      this.snapshotJob.stop();
      this.snapshotJob = null;
    }
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
    }
    console.log('All analytics cron jobs stopped');
  }

  /**
   * Collect analytics from WordPress
   */
  private async collectAnalytics(): Promise<any> {
    try {
      const auth = `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`;

      // Fetch counts from WordPress
      const [postsRes, pagesRes, usersRes, commentsRes, mediaRes, pluginsRes] = await Promise.all([
        fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=1`, {
          headers: { Authorization: auth },
        }),
        fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/pages?per_page=1`, {
          headers: { Authorization: auth },
        }),
        fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/users?per_page=1`, {
          headers: { Authorization: auth },
        }),
        fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/comments?per_page=1`, {
          headers: { Authorization: auth },
        }),
        fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/media?per_page=1`, {
          headers: { Authorization: auth },
        }),
        fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/plugins`, {
          headers: { Authorization: auth },
        }),
      ]);

      const totalPosts = parseInt(postsRes.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(pagesRes.headers.get('X-WP-Total') || '0');
      const totalUsers = parseInt(usersRes.headers.get('X-WP-Total') || '0');
      const totalComments = parseInt(commentsRes.headers.get('X-WP-Total') || '0');
      const totalMedia = parseInt(mediaRes.headers.get('X-WP-Total') || '0');
      
      const plugins = await pluginsRes.json();
      const activePlugins = plugins.filter((p: any) => p.status === 'active').length;

      return {
        total_posts: totalPosts,
        total_pages: totalPages,
        total_users: totalUsers,
        total_comments: totalComments,
        total_media: totalMedia,
        active_plugins: activePlugins,
      };
    } catch (error) {
      console.error('Failed to collect analytics:', error);
      throw error;
    }
  }

  /**
   * Run snapshot immediately
   */
  async runSnapshotNow(): Promise<void> {
    try {
      console.log('Running manual analytics snapshot...');
      const snapshot = await this.collectAnalytics();
      await this.db.saveSnapshot(snapshot);
      console.log('Manual snapshot created successfully');
    } catch (error) {
      console.error('Manual snapshot failed:', error);
      throw error;
    }
  }
}
