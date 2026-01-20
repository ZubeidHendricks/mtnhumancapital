import { Request } from 'express';
import { ActivityDatabase } from './ActivityDatabase';

export class ActivityLogger {
  private db: ActivityDatabase;
  private static instance: ActivityLogger;

  private constructor() {
    this.db = new ActivityDatabase();
  }

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  async log(
    userId: number,
    action: string,
    objectType?: string,
    objectId?: number,
    request?: Request,
    meta?: Record<string, any>
  ): Promise<number> {
    const ipAddress = request?.ip || request?.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = request?.headers['user-agent'] || 'unknown';

    return await this.db.logActivity({
      user_id: userId,
      action,
      object_type: objectType || '',
      object_id: objectId || 0,
      ip_address: ipAddress,
      user_agent: userAgent,
      meta,
    });
  }

  async logPostCreated(userId: number, postId: number, request?: Request): Promise<number> {
    return this.log(userId, 'post_created', 'post', postId, request);
  }

  async logPostUpdated(userId: number, postId: number, request?: Request): Promise<number> {
    return this.log(userId, 'post_updated', 'post', postId, request);
  }

  async logPostDeleted(userId: number, postId: number, request?: Request): Promise<number> {
    return this.log(userId, 'post_deleted', 'post', postId, request);
  }

  async logMediaUploaded(userId: number, mediaId: number, request?: Request): Promise<number> {
    return this.log(userId, 'media_uploaded', 'media', mediaId, request);
  }

  async logMediaDeleted(userId: number, mediaId: number, request?: Request): Promise<number> {
    return this.log(userId, 'media_deleted', 'media', mediaId, request);
  }

  async logUserLogin(userId: number, request?: Request): Promise<number> {
    return this.log(userId, 'user_login', 'user', userId, request);
  }

  async logUserLogout(userId: number, request?: Request): Promise<number> {
    return this.log(userId, 'user_logout', 'user', userId, request);
  }

  async logPluginActivated(userId: number, pluginSlug: string, request?: Request): Promise<number> {
    return this.log(userId, 'plugin_activated', 'plugin', 0, request, { plugin_slug: pluginSlug });
  }

  async logPluginDeactivated(userId: number, pluginSlug: string, request?: Request): Promise<number> {
    return this.log(userId, 'plugin_deactivated', 'plugin', 0, request, { plugin_slug: pluginSlug });
  }

  async logSettingsUpdated(userId: number, settingKey: string, request?: Request): Promise<number> {
    return this.log(userId, 'settings_updated', 'setting', 0, request, { setting_key: settingKey });
  }

  async getActivities(options: {
    userId?: number;
    action?: string;
    objectType?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    return await this.db.getActivities(options);
  }
}
