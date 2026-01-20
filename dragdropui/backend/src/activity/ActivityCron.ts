import { CronJob } from 'cron';
import { ActivityDatabase } from './ActivityDatabase';

export class ActivityCron {
  private db: ActivityDatabase;
  private cleanupJob: CronJob | null = null;

  constructor() {
    this.db = new ActivityDatabase();
  }

  /**
   * Start cleanup cron job - runs daily at midnight
   */
  startCleanup(daysToKeep: number = 90): void {
    if (this.cleanupJob) {
      console.log('Activity cleanup job already running');
      return;
    }

    // Run daily at midnight
    this.cleanupJob = new CronJob(
      '0 0 * * *',
      async () => {
        try {
          console.log('Running activity log cleanup...');
          const deletedCount = await this.db.cleanupOldLogs(daysToKeep);
          console.log(`Activity cleanup complete: ${deletedCount} logs deleted`);
        } catch (error) {
          console.error('Activity cleanup failed:', error);
        }
      },
      null,
      true,
      'UTC'
    );

    console.log(`Activity cleanup cron job started (keeping last ${daysToKeep} days)`);
  }

  /**
   * Stop cleanup cron job
   */
  stopCleanup(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
      console.log('Activity cleanup cron job stopped');
    }
  }

  /**
   * Run cleanup immediately
   */
  async runCleanupNow(daysToKeep: number = 90): Promise<number> {
    try {
      console.log('Running manual activity cleanup...');
      const deletedCount = await this.db.cleanupOldLogs(daysToKeep);
      console.log(`Manual cleanup complete: ${deletedCount} logs deleted`);
      return deletedCount;
    } catch (error) {
      console.error('Manual cleanup failed:', error);
      throw error;
    }
  }
}
