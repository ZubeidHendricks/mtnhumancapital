import { Router, Request, Response } from 'express';

interface PluginMetrics {
  name: string;
  version: string;
  active: boolean;
  execution_time?: number;
  memory_usage?: number;
  query_count?: number;
  hook_count?: number;
}

export class PluginMetricsCollectorRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // GET /api/plugin-metrics - Get plugin performance metrics
    this.router.get('/', this.getPluginMetrics.bind(this));
  }

  private async getPluginMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { plugin_slug } = req.query;

      // Fetch plugins from WordPress
      const response = await fetch(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/plugins`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        res.status(500).json({
          success: false,
          message: 'Failed to fetch plugins',
        });
        return;
      }

      const plugins = await response.json() as any[];

      // Filter by plugin_slug if provided
      const filteredPlugins = plugin_slug
        ? plugins.filter((p: any) => p.plugin.includes(plugin_slug))
        : plugins;

      const metrics: PluginMetrics[] = filteredPlugins.map((plugin: any) => ({
        name: plugin.name,
        version: plugin.version,
        active: plugin.status === 'active',
        // Note: Actual metrics collection requires WordPress-side implementation
        // These are placeholder values
        execution_time: 0,
        memory_usage: 0,
        query_count: 0,
        hook_count: 0,
      }));

      res.json({
        success: true,
        metrics,
        note: 'Detailed metrics require WordPress-side implementation',
      });
    } catch (error) {
      console.error('Plugin metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get plugin metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
