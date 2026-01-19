import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AnalyticsRouter } from '../rest/Analytics';
import { UserRolesRouter } from '../rest/UserRoles';
import { UserCapabilitiesRouter } from '../rest/UserCapabilities';
import { MediaRouter } from '../rest/Media';
import { MediaBulk } from '../rest/MediaBulk';
import { MediaAnalyticsRouter } from '../rest/MediaAnalytics';
import { MediaReplaceRouter } from '../rest/MediaReplace';
import { MediaTagsRouter } from '../rest/MediaTags';
import { ActivityLogRouter } from '../rest/ActivityLog';
import { ServerHealthRouter } from '../rest/ServerHealth';
import { PluginManagerRouter } from '../rest/PluginManager';
import { PluginMetricsCollectorRouter } from '../rest/PluginMetricsCollector';
import { RoleEditorRouter } from '../rest/RoleEditor';
import { DatabaseExplorerRouter } from '../rest/DatabaseExplorer';
import { UserAnalyticsRouter } from '../rest/UserAnalytics';
import { RestLogoutRouter } from '../rest/RestLogout';
import { AdminNoticesRouter } from '../rest/AdminNotices';
import { SearchMetaRouter } from '../rest/SearchMeta';
import { PostsTablesRouter } from '../rest/PostsTables';
import { UpdaterRouter } from '../update/Updater';
import { ActivityHooks } from '../activity/ActivityHooks';
import { ActivityCron } from '../activity/ActivityCron';
import { AnalyticsCron } from '../analytics/AnalyticsCron';
import { TurnStyle } from '../security/TurnStyle';

dotenv.config();

export class UiXpressApp {
  private app: Express;
  private port: number;
  private static instance: UiXpressApp;
  private options: Map<string, any>;
  private activityCron: ActivityCron | null = null;
  private analyticsCron: AnalyticsCron | null = null;
  private turnstyle: TurnStyle | null = null;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.options = new Map();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeCronJobs();
  }

  public static getInstance(): UiXpressApp {
    if (!UiXpressApp.instance) {
      UiXpressApp.instance = new UiXpressApp();
    }
    return UiXpressApp.instance;
  }

  private initializeMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Activity logging middleware (optional)
    if (process.env.ACTIVITY_LOG_ENABLED === 'true') {
      const activityHooks = new ActivityHooks();
      this.app.use(activityHooks.getMiddleware());
    }

    // Turnstile CAPTCHA (optional)
    if (process.env.TURNSTILE_SECRET_KEY) {
      this.turnstyle = new TurnStyle(process.env.TURNSTILE_SECRET_KEY);
    }
    
    // Custom middleware for logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', version: '1.2.15' });
    });

    // API v1 routes
    const apiRouter = express.Router();
    
    // Register all REST API routes
    apiRouter.use('/analytics', new AnalyticsRouter().getRouter());
    apiRouter.use('/user-analytics', new UserAnalyticsRouter().getRouter());
    apiRouter.use('/media-analytics', new MediaAnalyticsRouter().getRouter());
    apiRouter.use('/users/roles', new UserRolesRouter().getRouter());
    apiRouter.use('/users/capabilities', new UserCapabilitiesRouter().getRouter());
    apiRouter.use('/media', new MediaRouter().getRouter());
    apiRouter.use('/media', new MediaBulk().getRouter());
    apiRouter.use('/media', new MediaReplaceRouter().getRouter());
    apiRouter.use('/media', new MediaTagsRouter().getRouter());
    apiRouter.use('/activity-log', new ActivityLogRouter().getRouter());
    apiRouter.use('/server-health', new ServerHealthRouter().getRouter());
    apiRouter.use('/plugins', new PluginManagerRouter().getRouter());
    apiRouter.use('/plugin-metrics', new PluginMetricsCollectorRouter().getRouter());
    apiRouter.use('/role-editor', new RoleEditorRouter().getRouter());
    apiRouter.use('/database', new DatabaseExplorerRouter().getRouter());
    apiRouter.use('/logout', new RestLogoutRouter().getRouter());
    apiRouter.use('/notices', new AdminNoticesRouter().getRouter());
    apiRouter.use('/search', SearchMetaRouter);
    apiRouter.use('/posts-tables', new PostsTablesRouter().getRouter());
    apiRouter.use('/updates', new UpdaterRouter().getRouter());

    this.app.use('/api/v1', apiRouter);
  }

  private initializeCronJobs(): void {
    // Start activity log cleanup (if enabled)
    if (process.env.ACTIVITY_LOG_ENABLED === 'true') {
      this.activityCron = new ActivityCron();
      this.activityCron.startCleanup(90); // Keep 90 days of logs
      console.log('Activity log cleanup cron job started');
    }

    // Start analytics snapshots (if enabled)
    if (process.env.ANALYTICS_ENABLED === 'true') {
      this.analyticsCron = new AnalyticsCron();
      this.analyticsCron.startSnapshot(); // Hourly snapshots
      this.analyticsCron.startCleanup(365); // Keep 1 year of snapshots
      console.log('Analytics cron jobs started');
    }
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    });
  }

  public getOption(key: string): any {
    return this.options.get(key);
  }

  public setOption(key: string, value: any): void {
    this.options.set(key, value);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`UiXpress server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`API base URL: http://localhost:${this.port}/api/v1`);
      console.log(`Activity logging: ${process.env.ACTIVITY_LOG_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
      console.log(`Analytics: ${process.env.ANALYTICS_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
      console.log(`Turnstile: ${this.turnstyle?.isEnabled() ? 'ENABLED' : 'DISABLED'}`);
    });
  }

  public stop(): void {
    // Stop cron jobs
    if (this.activityCron) {
      this.activityCron.stopCleanup();
    }
    if (this.analyticsCron) {
      this.analyticsCron.stopAll();
    }
    console.log('UiXpress server stopped');
  }

  public getApp(): Express {
    return this.app;
  }
}
