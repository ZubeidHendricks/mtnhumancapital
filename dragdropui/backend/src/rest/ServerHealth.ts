import { Router, Request, Response } from 'express';
import { RestResponse, ServerHealth } from '../types';
import os from 'os';

export class ServerHealthRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.getServerHealth.bind(this));
  }

  private async getServerHealth(req: Request, res: Response): Promise<void> {
    try {
      const health: ServerHealth = {
        phpVersion: 'N/A (Node.js)',
        memoryLimit: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
        maxExecutionTime: 0,
        diskSpace: {
          total: 0,
          free: 0,
          used: 0
        },
        database: {
          version: 'N/A',
          size: 0
        }
      };

      const nodeHealth = {
        nodeVersion: process.version,
        platform: os.platform(),
        uptime: os.uptime(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg()
      };

      res.json({
        success: true,
        data: {
          ...health,
          node: nodeHealth
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('Server health error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
