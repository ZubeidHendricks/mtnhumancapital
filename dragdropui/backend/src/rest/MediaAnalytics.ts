import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface FileTypeBreakdown {
  file_type: string;
  count: number;
}

interface MediaAnalyticsData {
  total_files: number;
  total_size: number;
  total_size_formatted: string;
  average_file_size: number;
  average_file_size_formatted: string;
  file_types: FileTypeBreakdown[];
  recent_uploads: number;
  unused_media: number;
  large_files_estimate: number;
  upload_path: string;
  last_updated: string;
  from_cache?: boolean;
  cache_expires?: number;
}

export class MediaAnalyticsRouter {
  private router: Router;
  private cache: Map<string, { data: MediaAnalyticsData; expires: number }>;
  private readonly CACHE_DURATION = 86400000; // 24 hours in milliseconds

  constructor() {
    this.router = Router();
    this.cache = new Map();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // GET /api/media-analytics - Get analytics with caching
    this.router.get('/', this.getMediaAnalytics.bind(this));

    // POST /api/media-analytics/refresh - Refresh cache
    this.router.post('/refresh', this.refreshAnalytics.bind(this));
  }

  private async getMediaAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = 'media_analytics';
      const cached = this.cache.get(cacheKey);

      // Return cached data if valid
      if (cached && Date.now() < cached.expires) {
        res.json({
          ...cached.data,
          from_cache: true,
          cache_expires: cached.expires,
        });
        return;
      }

      // Calculate fresh analytics
      const analytics = await this.calculateMediaAnalytics();

      // Cache the result
      this.cache.set(cacheKey, {
        data: analytics,
        expires: Date.now() + this.CACHE_DURATION,
      });

      res.json({
        ...analytics,
        from_cache: false,
      });
    } catch (error) {
      console.error('Media analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get media analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async refreshAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Clear cache
      this.cache.clear();

      // Recalculate
      const analytics = await this.calculateMediaAnalytics();

      // Cache the result
      this.cache.set('media_analytics', {
        data: analytics,
        expires: Date.now() + this.CACHE_DURATION,
      });

      res.json({
        ...analytics,
        from_cache: false,
      });
    } catch (error) {
      console.error('Refresh analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async calculateMediaAnalytics(): Promise<MediaAnalyticsData> {
    // Fetch media from WordPress
    const mediaResponse = await fetch(
      `${process.env.WORDPRESS_URL}/wp-json/wp/v2/media?per_page=100`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
        },
      }
    );

    const media = await mediaResponse.json() as any[];
    const totalFiles = media.length;

    // Calculate file type breakdown
    const fileTypeMap = new Map<string, number>();
    let totalSize = 0;

    for (const item of media) {
      const mimeType = item.mime_type || '';
      const fileType = mimeType.split('/')[0] || 'unknown';
      fileTypeMap.set(fileType, (fileTypeMap.get(fileType) || 0) + 1);

      // Add file size if available
      if (item.media_details && item.media_details.filesize) {
        totalSize += item.media_details.filesize;
      }
    }

    const fileTypes: FileTypeBreakdown[] = Array.from(fileTypeMap.entries())
      .map(([file_type, count]) => ({ file_type, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate recent uploads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUploads = media.filter((item: any) => {
      const itemDate = new Date(item.date);
      return itemDate >= thirtyDaysAgo;
    }).length;

    // Calculate unused media (not attached to any post)
    const unusedMedia = media.filter((item: any) => item.post === null || item.post === 0).length;

    // Estimate large files (>5MB)
    const avgSize = totalFiles > 0 ? totalSize / totalFiles : 0;
    const largeFilesEstimate = avgSize > 1048576 ? Math.floor(totalFiles * 0.1) : 0;

    return {
      total_files: totalFiles,
      total_size: totalSize,
      total_size_formatted: this.formatBytes(totalSize),
      average_file_size: totalFiles > 0 ? Math.floor(totalSize / totalFiles) : 0,
      average_file_size_formatted: totalFiles > 0 ? this.formatBytes(totalSize / totalFiles) : '0 B',
      file_types: fileTypes,
      recent_uploads: recentUploads,
      unused_media: unusedMedia,
      large_files_estimate: largeFilesEstimate,
      upload_path: '/wp-content/uploads',
      last_updated: new Date().toISOString(),
    };
  }

  private formatBytes(bytes: number, precision: number = 2): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;

    while (bytes > 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }

    return `${bytes.toFixed(precision)} ${units[i]}`;
  }

  public getRouter(): Router {
    return this.router;
  }
}
