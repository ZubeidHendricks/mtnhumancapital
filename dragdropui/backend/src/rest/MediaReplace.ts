import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({ dest: '/tmp/uploads/' });

export class MediaReplaceRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // POST /api/media/replace - Replace media file
    this.router.post('/replace', upload.single('file'), this.replaceMedia.bind(this));
  }

  private async replaceMedia(req: Request, res: Response): Promise<void> {
    try {
      const { media_id } = req.body;
      const file = req.file;

      if (!media_id || !file) {
        res.status(400).json({
          success: false,
          message: 'Media ID and file are required',
        });
        return;
      }

      // Verify media exists
      const mediaResponse = await fetch(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/media/${media_id}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
          },
        }
      );

      if (!mediaResponse.ok) {
        res.status(404).json({
          success: false,
          message: 'Media item not found',
        });
        return;
      }

      // Upload replacement file to WordPress
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(file.path);
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, file.originalname);

      const uploadResponse = await fetch(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/media/${media_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
          },
          body: formData,
        }
      );

      // Clean up temp file
      fs.unlinkSync(file.path);

      if (!uploadResponse.ok) {
        res.status(500).json({
          success: false,
          message: 'Failed to replace media file',
        });
        return;
      }

      const updatedMedia = await uploadResponse.json() as any;

      res.json({
        success: true,
        data: updatedMedia,
        message: 'File replaced successfully',
      });
    } catch (error) {
      console.error('Media replace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to replace media',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
