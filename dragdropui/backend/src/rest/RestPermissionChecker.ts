import { Request, Response, NextFunction } from 'express';

export class RestPermissionChecker {
  /**
   * Check if request has valid authentication
   */
  public static async checkPermissions(
    req: Request,
    res: Response,
    next: NextFunction,
    requiredCapability: string = 'manage_options'
  ): Promise<boolean> {
    // In a standalone TypeScript server, we'll verify against WordPress REST API
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    try {
      // Verify credentials against WordPress
      const response = await fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        return false;
      }

      const user = await response.json();
      
      // Check if user has required capability (simplified - WordPress has complex capability system)
      // In a real implementation, you'd check user.capabilities
      return user && user.id > 0;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Middleware to check if user is logged in
   */
  public static async checkLoginOnly(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<boolean> {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return false;
    }

    try {
      const response = await fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': authHeader,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Public endpoints - always allow
   */
  public static checkPublic(): boolean {
    return true;
  }
}
