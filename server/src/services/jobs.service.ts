import { randomUUID } from 'crypto';
import SyncJobModel, { SyncJobAttributes, SyncJobCreationAttributes, SyncJobStatus, SyncJobType } from '@models/syncJob.model';
import { HttpException } from '@exceptions/HttpException';

class JobsService {
  public async createJob(type: SyncJobType, entityId: number, userId: number): Promise<SyncJobAttributes> {
    const job = await SyncJobModel.create({
      id: randomUUID(),
      type,
      entityId,
      userId,
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
    } as SyncJobCreationAttributes);

    return job.get({ plain: true });
  }

  public async getJob(jobId: string, userId: number): Promise<SyncJobAttributes> {
    const job = await SyncJobModel.findOne({ where: { id: jobId, userId } });
    if (!job) throw new HttpException(404, 'Job not found');
    return job.get({ plain: true });
  }

  public async listJobs(userId: number, filters?: { type?: SyncJobType; entityId?: number; status?: SyncJobStatus }): Promise<SyncJobAttributes[]> {
    const where: Record<string, unknown> = { userId };
    if (filters?.type) where.type = filters.type;
    if (filters?.entityId != null) where.entityId = filters.entityId;
    if (filters?.status) where.status = filters.status;

    const jobs = await SyncJobModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    return jobs.map(j => j.get({ plain: true }));
  }

  /** Called internally by workers — no userId check needed. */
  public async updateJob(
    jobId: string,
    patch: Partial<Pick<SyncJobAttributes, 'status' | 'progress' | 'result' | 'error'>>,
  ): Promise<void> {
    await SyncJobModel.update(patch, { where: { id: jobId } });
  }

  /** Check if there is already a pending/running job for this entity+type to avoid duplicates. */
  public async hasActiveJob(type: SyncJobType, entityId: number): Promise<boolean> {
    const count = await SyncJobModel.count({
      where: { type, entityId, status: ['pending', 'running'] },
    });
    return count > 0;
  }
}

export default JobsService;
