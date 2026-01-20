import { Router, Request, Response } from 'express';

export class UpdaterRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/check', this.checkUpdate.bind(this));
  }

  private async checkUpdate(req: Request, res: Response): Promise<void> {
    res.json({ updateAvailable: false });
  }

  public getRouter(): Router {
    return this.router;
  }
}
