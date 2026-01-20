import { Router, Request, Response } from 'express';

interface DailyRegistration {
  date: string;
  count: number;
}

interface UserRole {
  role: string;
  count: number;
}

interface MonthlyUser {
  month: string;
  count: number;
}

export class UserAnalyticsRouter {
  private router: Router;
  private cache: Map<string, { data: any; expires: number }>;
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

  constructor() {
    this.router = Router();
    this.cache = new Map();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // GET /api/user-analytics - Get user analytics with date filtering
    this.router.get('/', this.getUserAnalytics.bind(this));
  }

  private async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date as string || '';
      const endDate = req.query.end_date as string || '';

      const cacheKey = `user_analytics_${startDate}_${endDate}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() < cached.expires) {
        res.json({
          ...cached.data,
          from_cache: true,
        });
        return;
      }

      const analytics = await this.calculateUserAnalytics(startDate, endDate);

      this.cache.set(cacheKey, {
        data: analytics,
        expires: Date.now() + this.CACHE_DURATION,
      });

      res.json({
        ...analytics,
        from_cache: false,
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async calculateUserAnalytics(startDate: string, endDate: string): Promise<any> {
    // Fetch users from WordPress
    const usersResponse = await fetch(
      `${process.env.WORDPRESS_URL}/wp-json/wp/v2/users?per_page=100`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
        },
      }
    );

    const users = await usersResponse.json() as any[];
    const totalUsers = users.length;

    // Set default date range (last 30 days)
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Count users in date range
    const usersInRange = users.filter((user: any) => {
      const registeredDate = new Date(user.registered_date || user.date);
      return registeredDate >= start && registeredDate <= end;
    }).length;

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = users.filter((user: any) => {
      const registeredDate = new Date(user.registered_date || user.date);
      return registeredDate >= sevenDaysAgo;
    }).length;

    // Process user roles
    const roleMap = new Map<string, number>();
    users.forEach((user: any) => {
      const roles = user.roles || [];
      roles.forEach((role: string) => {
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
    });

    const userRoles: UserRole[] = Array.from(roleMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_users: totalUsers,
      users_in_range: usersInRange,
      recent_users: recentUsers,
      user_roles: userRoles,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      last_updated: new Date().toISOString(),
    };
  }

  public getRouter(): Router {
    return this.router;
  }
}
