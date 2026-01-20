import { Router, Request, Response } from 'express';

export class PostsTablesRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // GET /api/posts-tables - Get posts table data
    this.router.get('/', this.getPostsTableData.bind(this));
  }

  private async getPostsTableData(req: Request, res: Response): Promise<void> {
    try {
      const {
        post_type = 'post',
        per_page = 20,
        page = 1,
        orderby = 'date',
        order = 'desc',
        search = '',
        post_status = 'any',
        author,
        categories,
      } = req.query;

      let url = `${process.env.WORDPRESS_URL}/wp-json/wp/v2/${post_type}?per_page=${per_page}&page=${page}&orderby=${orderby}&order=${order}`;

      if (search) {
        url += `&search=${encodeURIComponent(search as string)}`;
      }

      if (post_status && post_status !== 'any') {
        url += `&status=${post_status}`;
      }

      if (author) {
        url += `&author=${author}`;
      }

      if (categories) {
        url += `&categories=${categories}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_PASSWORD}`).toString('base64')}`,
        },
      });

      const posts = await response.json() as any;
      const totalHeader = response.headers.get('X-WP-Total');
      const totalPagesHeader = response.headers.get('X-WP-TotalPages');

      // Process posts data
      const items = posts.map((post: any) => ({
        id: post.id,
        title: post.title?.rendered || '(No title)',
        type: post.type,
        status: post.status,
        date: post.date,
        modified: post.modified,
        author: post.author,
        edit_url: `${process.env.WORDPRESS_URL}/wp-admin/post.php?post=${post.id}&action=edit`,
        view_url: post.link,
      }));

      res.json({
        items,
        total: totalHeader ? parseInt(totalHeader) : items.length,
        pages: totalPagesHeader ? parseInt(totalPagesHeader) : 1,
      });
    } catch (error) {
      console.error('Posts tables error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get posts table data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
