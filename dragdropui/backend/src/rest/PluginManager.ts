import { Router, Request, Response } from 'express';
import { RestResponse, PluginInfo } from '../types';

export class PluginManagerRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.getPlugins.bind(this));
    this.router.get('/:pluginName', this.getPlugin.bind(this));
    this.router.post('/:pluginName/activate', this.activatePlugin.bind(this));
    this.router.post('/:pluginName/deactivate', this.deactivatePlugin.bind(this));
    this.router.delete('/:pluginName', this.deletePlugin.bind(this));
  }

  private async getPlugins(req: Request, res: Response): Promise<void> {
    try {
      const plugins: PluginInfo[] = [];
      res.json({ success: true, data: plugins });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginName } = req.params;
      const plugin: PluginInfo | null = null;
      res.json({ success: true, data: plugin });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async activatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginName } = req.params;
      res.json({ success: true, message: `Plugin ${pluginName} activated successfully` });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async deactivatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginName } = req.params;
      res.json({ success: true, message: `Plugin ${pluginName} deactivated successfully` });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async deletePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginName } = req.params;
      res.json({ success: true, message: `Plugin ${pluginName} deleted successfully` });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('Plugin manager error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
