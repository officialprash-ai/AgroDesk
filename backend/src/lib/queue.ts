import Bull from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Single shared queue for all agent jobs
export const agentQueue = new Bull('agrodesk:agent-jobs', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 }, // 1m, 2m, 4m
    removeOnComplete: 100,  // keep last 100 completed
    removeOnFail: 200,      // keep last 200 failed for debugging
  },
});

export interface QueueJobData {
  db_job_id: string;   // AgentJob.id in Postgres — worker updates status here
  dealer_id: string;
  agent_type: string;
  payload: Record<string, unknown>;
}

/**
 * Push a job onto the queue. Called from /api/jobs after DB row is created.
 * delay: ms to wait before processing (0 = immediate)
 */
export async function enqueueJob(data: QueueJobData, delay = 0): Promise<void> {
  await agentQueue.add(data, {
    jobId: data.db_job_id, // dedupe by DB id
    delay,
  });
}
