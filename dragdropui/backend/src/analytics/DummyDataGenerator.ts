import { AnalyticsDatabase } from './AnalyticsDatabase';

export class DummyDataGenerator {
  private db: AnalyticsDatabase;

  constructor() {
    this.db = new AnalyticsDatabase();
  }

  /**
   * Generate dummy analytics data for testing
   */
  async generateDummyData(days: number = 30): Promise<void> {
    console.log(`Generating ${days} days of dummy analytics data...`);

    const now = new Date();
    const snapshots = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Generate realistic-looking random data with trends
      const baseValue = 100;
      const growthFactor = (days - i) / days;

      const snapshot = {
        total_posts: Math.floor(baseValue + Math.random() * 50 + growthFactor * 100),
        total_pages: Math.floor(baseValue / 2 + Math.random() * 20 + growthFactor * 30),
        total_users: Math.floor(baseValue / 5 + Math.random() * 10 + growthFactor * 50),
        total_comments: Math.floor(baseValue * 2 + Math.random() * 100 + growthFactor * 200),
        total_media: Math.floor(baseValue * 3 + Math.random() * 150 + growthFactor * 300),
        active_plugins: Math.floor(10 + Math.random() * 5),
      };

      snapshots.push(snapshot);
    }

    // Insert snapshots with proper dates
    for (let i = 0; i < snapshots.length; i++) {
      await this.db.saveSnapshot(snapshots[i]);
      
      if ((i + 1) % 10 === 0) {
        console.log(`Generated ${i + 1}/${snapshots.length} snapshots`);
      }
    }

    console.log('Dummy data generation complete!');
  }

  /**
   * Clear all snapshots
   */
  async clearAllData(): Promise<void> {
    console.log('Clearing all analytics data...');
    await this.db.cleanupOldSnapshots(0);
    console.log('All analytics data cleared!');
  }

  /**
   * Generate sample data with specific patterns
   */
  async generatePatternData(pattern: 'growth' | 'decline' | 'stable' | 'seasonal', days: number = 90): Promise<void> {
    console.log(`Generating ${pattern} pattern data for ${days} days...`);

    const now = new Date();
    const baseValues = {
      posts: 500,
      pages: 50,
      users: 100,
      comments: 1000,
      media: 2000,
      plugins: 15,
    };

    for (let i = days; i >= 0; i--) {
      const progress = (days - i) / days;
      let multiplier = 1;

      switch (pattern) {
        case 'growth':
          multiplier = 1 + progress * 2; // 100% to 300%
          break;
        case 'decline':
          multiplier = 2 - progress; // 200% to 100%
          break;
        case 'stable':
          multiplier = 1 + (Math.random() - 0.5) * 0.1; // +/- 5%
          break;
        case 'seasonal':
          multiplier = 1 + Math.sin(progress * Math.PI * 4) * 0.3; // Wave pattern
          break;
      }

      const snapshot = {
        total_posts: Math.floor(baseValues.posts * multiplier + Math.random() * 20),
        total_pages: Math.floor(baseValues.pages * multiplier + Math.random() * 5),
        total_users: Math.floor(baseValues.users * multiplier + Math.random() * 10),
        total_comments: Math.floor(baseValues.comments * multiplier + Math.random() * 50),
        total_media: Math.floor(baseValues.media * multiplier + Math.random() * 100),
        active_plugins: Math.floor(baseValues.plugins + Math.random() * 3),
      };

      await this.db.saveSnapshot(snapshot);
    }

    console.log(`${pattern} pattern data generation complete!`);
  }
}
