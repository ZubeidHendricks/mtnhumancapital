import { Router, Request, Response } from 'express';

export class MediaTagsRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.getTags.bind(this));
  }

  private async getTags(req: Request, res: Response): Promise<void> {
    res.json({ tags: [] });
  }

  public getRouter(): Router {
    return this.router;
  }
}
