import { Router, Request, Response } from 'express';

export class AdminNoticesRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.getNotices.bind(this));
  }

  private async getNotices(req: Request, res: Response): Promise<void> {
    res.json({ notices: [] });
  }

  public getRouter(): Router {
    return this.router;
  }
}
