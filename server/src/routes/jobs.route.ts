import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import JobsController from '@controllers/jobs.controller';

class JobsRoute implements Routes {
  public router = Router();
  private controller = new JobsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/jobs', authMiddleware, this.controller.listJobs);
    this.router.get('/jobs/:jobId', authMiddleware, this.controller.getJob);
  }
}

export default JobsRoute;
