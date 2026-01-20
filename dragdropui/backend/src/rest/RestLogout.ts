import { Router, Request, Response } from 'express';

export class RestLogoutRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // POST /api/logout - Logout endpoint
    this.router.post('/', this.logout.bind(this));
  }

  private async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a standalone TypeScript server, logout is handled client-side
      // by clearing auth tokens. This endpoint confirms the action.
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
