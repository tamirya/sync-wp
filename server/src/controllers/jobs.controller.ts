import { NextFunction, Response } from 'express';
import { RequestWithUser } from '@interfaces/auth.interface';
import JobsService from '@services/jobs.service';
import { SyncJobStatus, SyncJobType } from '@models/syncJob.model';

class JobsController {
  private jobsService = new JobsService();

  public getJob = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await this.jobsService.getJob(req.params.jobId, req.user.id);
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  };

  public listJobs = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const type = req.query.type as SyncJobType | undefined;
      const entityId = req.query.entityId != null ? Number(req.query.entityId) : undefined;
      const status = req.query.status as SyncJobStatus | undefined;

      const jobs = await this.jobsService.listJobs(req.user.id, { type, entityId, status });
      res.json({ data: jobs });
    } catch (error) {
      next(error);
    }
  };
}

export default JobsController;
