import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface MediaUsage {
  id: number;
  title: string;
  type: string;
  status: string;
  edit_url: string;
}

export class MediaBulk {
  private router: Router;
  private readonly MAX_BULK_ITEMS = 100;
  private readonly ZIP_CLEANUP_DELAY = 3600000; // 1 hour in milliseconds

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // POST /api/media/bulk-download - Create ZIP of multiple media files
    this.router.post('/bulk-download', this.bulkDownload.bind(this));

    // GET /api/media/:id/usage - Get media usage information
    this.router.get('/:id/usage', this.getMediaUsage.bind(this));
  }

  /**
   * Create ZIP file for bulk media download
   */
  private async bulkDownload(req: Request, res: Response): Promise<void> {
    try {
      const { media_ids } = req.body;

      // Validation
      if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid media IDs provided',
        });
        return;
      }

      if (media_ids.length > this.MAX_BULK_ITEMS) {
        res.status(400).json({
          success: false,
          message: `Maximum ${this.MAX_BULK_ITEMS} items can be downloaded at once`,
        });
        return;
      }

      // Create ZIP file
      const zipFilename = `media-bulk-${Date.now()}-${uuidv4().substring(0, 8)}.zip`;
      const zipPath = path.join('/tmp', zipFilename);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      // Handle errors
      archive.on('error', (err) => {
        throw err;
      });

      // Pipe archive to file
      archive.pipe(output);

      let addedCount = 0;

      // Fetch media files from WordPress and add to ZIP
      for (const mediaId of media_ids) {
        try {
          const mediaResponse = await fetch(
            `${process.env.WORDPRESS_URL}/wp-json/wp/v2/media/${mediaId}`,
            {
              headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
              },
            }
          );

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json() as any;
            const mediaUrl = mediaData.source_url;
            const filename = path.basename(mediaUrl);

            // Download file
            const fileResponse = await fetch(mediaUrl);
            if (fileResponse.ok) {
              const buffer = await fileResponse.arrayBuffer();
              archive.append(Buffer.from(buffer), { name: filename });
              addedCount++;
            }
          }
        } catch (error) {
          console.error(`Failed to add media ${mediaId} to ZIP:`, error);
          // Continue with next file
        }
      }

      // Finalize the archive
      await archive.finalize();

      // Wait for the output stream to finish
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', reject);
      });

      if (addedCount === 0) {
        // Clean up empty ZIP
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
        res.status(404).json({
          success: false,
          message: 'No valid files found to download',
        });
        return;
      }

      // Schedule cleanup of ZIP file after 1 hour
      setTimeout(() => {
        this.cleanupZipFile(zipPath);
      }, this.ZIP_CLEANUP_DELAY);

      const downloadUrl = `${process.env.SERVER_URL || 'http://localhost:3000'}/downloads/${zipFilename}`;

      res.json({
        success: true,
        download_url: downloadUrl,
        filename: zipFilename,
        file_count: addedCount,
      });
    } catch (error) {
      console.error('Bulk download error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ZIP file',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clean up ZIP file
   */
  private cleanupZipFile(zipPath: string): void {
    try {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
        console.log(`Cleaned up ZIP file: ${zipPath}`);
      }
    } catch (error) {
      console.error('Failed to cleanup ZIP file:', error);
    }
  }

  /**
   * Get media usage information - where media is being used
   */
  private async getMediaUsage(req: Request, res: Response): Promise<void> {
    try {
      const mediaId = parseInt(req.params.id);

      if (!mediaId || mediaId <= 0) {
        res.json({
          success: true,
          data: [],
          count: 0,
        });
        return;
      }

      const usage: MediaUsage[] = [];
      const seenPostIds: number[] = [];

      // Verify media exists
      const attachmentResponse = await fetch(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/media/${mediaId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
          },
        }
      );

      if (!attachmentResponse.ok) {
        res.json({
          success: true,
          data: [],
          count: 0,
        });
        return;
      }

      const attachment = await attachmentResponse.json() as any;
      const mediaUrl = attachment.source_url;

      if (!mediaUrl) {
        res.json({
          success: true,
          data: [],
          count: 0,
        });
        return;
      }

      // 1. Check if used as featured image
      const featuredQuery = await this.searchPostsWithFeaturedImage(mediaId);
      for (const post of featuredQuery) {
        if (!seenPostIds.includes(post.id)) {
          seenPostIds.push(post.id);
          usage.push({
            id: post.id,
            title: post.title.rendered || '(Untitled)',
            type: post.type,
            status: post.status,
            edit_url: `${process.env.WORDPRESS_URL}/wp-admin/post.php?post=${post.id}&action=edit`,
          });
        }
      }

      // 2. Check if used in post content
      const contentPosts = await this.searchPostsWithMediaInContent(mediaId, mediaUrl);
      for (const post of contentPosts) {
        if (!seenPostIds.includes(post.id)) {
          seenPostIds.push(post.id);
          usage.push({
            id: post.id,
            title: post.title.rendered || '(Untitled)',
            type: post.type,
            status: post.status,
            edit_url: `${process.env.WORDPRESS_URL}/wp-admin/post.php?post=${post.id}&action=edit`,
          });
        }
      }

      res.json({
        success: true,
        data: usage,
        count: usage.length,
      });
    } catch (error) {
      console.error('Get media usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get media usage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search for posts that have this media as featured image
   */
  private async searchPostsWithFeaturedImage(mediaId: number): Promise<any[]> {
    try {
      const response = await fetch(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/posts?featured_media=${mediaId}&per_page=100`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
          },
        }
      );

      if (response.ok) {
        return await response.json() as any[];
      }
    } catch (error) {
      console.error('Error searching featured images:', error);
    }
    return [];
  }

  /**
   * Search for posts that contain this media in content
   */
  private async searchPostsWithMediaInContent(mediaId: number, mediaUrl: string): Promise<any[]> {
    const posts: any[] = [];
    const searchPatterns = [
      `wp-image-${mediaId}`,
      `"id":${mediaId}`,
      `"mediaId":${mediaId}`,
      mediaUrl,
    ];

    try {
      // Search posts
      for (const pattern of searchPatterns) {
        const response = await fetch(
          `${process.env.WORDPRESS_URL}/wp-json/wp/v2/posts?search=${encodeURIComponent(pattern)}&per_page=100`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
            },
          }
        );

        if (response.ok) {
          const results = await response.json() as any[];
          for (const post of results) {
            if (!posts.find(p => p.id === post.id)) {
              // Verify the media is actually in the content
              const content = post.content.rendered;
              if (
                content.includes(`wp-image-${mediaId}`) ||
                content.includes(`"id":${mediaId}`) ||
                content.includes(`"mediaId":${mediaId}`) ||
                content.includes(mediaUrl)
              ) {
                posts.push(post);
              }
            }
          }
        }
      }

      // Also search pages
      for (const pattern of searchPatterns) {
        const response = await fetch(
          `${process.env.WORDPRESS_URL}/wp-json/wp/v2/pages?search=${encodeURIComponent(pattern)}&per_page=100`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
            },
          }
        );

        if (response.ok) {
          const results = await response.json() as any[];
          for (const page of results) {
            if (!posts.find(p => p.id === page.id)) {
              const content = page.content.rendered;
              if (
                content.includes(`wp-image-${mediaId}`) ||
                content.includes(`"id":${mediaId}`) ||
                content.includes(`"mediaId":${mediaId}`) ||
                content.includes(mediaUrl)
              ) {
                posts.push(page);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching posts with media:', error);
    }

    return posts;
  }

  public getRouter(): Router {
    return this.router;
  }
}
