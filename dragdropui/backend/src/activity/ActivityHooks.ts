import { Request, Response, NextFunction } from 'express';
import { ActivityLogger } from './ActivityLogger';

/**
 * Middleware to automatically log activity for API requests
 */
export class ActivityHooks {
  private logger: ActivityLogger;

  constructor() {
    this.logger = ActivityLogger.getInstance();
  }

  /**
   * Middleware to log all API requests
   */
  logRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      // Log successful requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        this.logActivityFromRequest(req, res, body).catch(console.error);
      }
      return originalJson(body);
    };

    next();
  };

  /**
   * Extract activity information from request and log it
   */
  private async logActivityFromRequest(req: Request, res: Response, responseBody: any): Promise<void> {
    try {
      // Extract user ID from request (implement your own auth logic)
      const userId = await this.getUserIdFromRequest(req);
      if (!userId) return;

      const method = req.method;
      const path = req.path;

      // Determine action based on method and path
      let action = '';
      let objectType = '';
      let objectId = 0;

      // Parse common patterns
      if (path.includes('/posts-tables')) {
        if (method === 'POST') action = 'post_created';
        if (method === 'PUT') action = 'post_updated';
        if (method === 'DELETE') action = 'post_deleted';
        objectType = 'post';
        objectId = this.extractIdFromPath(path);
      } else if (path.includes('/media')) {
        if (method === 'POST') action = 'media_uploaded';
        if (method === 'DELETE') action = 'media_deleted';
        objectType = 'media';
        objectId = this.extractIdFromPath(path);
      } else if (path.includes('/plugins')) {
        if (path.includes('/activate')) action = 'plugin_activated';
        if (path.includes('/deactivate')) action = 'plugin_deactivated';
        objectType = 'plugin';
      } else if (path.includes('/logout')) {
        action = 'user_logout';
        objectType = 'user';
        objectId = userId;
      }

      if (action) {
        await this.logger.log(userId, action, objectType, objectId, req);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Extract user ID from request (implement based on your auth system)
   */
  private async getUserIdFromRequest(req: Request): Promise<number | null> {
    // This is a placeholder - implement your actual auth logic
    // You might get this from JWT token, session, or WordPress API
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    try {
      // Example: fetch user from WordPress
      const response = await fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: authHeader },
      });
      
      if (response.ok) {
        const user = await response.json();
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get user ID:', error);
    }

    return null;
  }

  /**
   * Extract ID from URL path
   */
  private extractIdFromPath(path: string): number {
    const matches = path.match(/\/(\d+)/);
    return matches ? parseInt(matches[1]) : 0;
  }

  /**
   * Get the middleware function
   */
  getMiddleware() {
    return this.logRequest;
  }
}
