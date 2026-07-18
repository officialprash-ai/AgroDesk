import Bull from 'bull';
import { isQuietHours, msUntilAllowedWindow, QUIET_HOURS_GATED_TYPES } from './quietHours.js';

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

// Prevent Redis errors from crashing the process
agentQueue.on('error', (err) => {
  console.error('[queue] Redis error (non-fatal):', err.message);
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
 *
 * Consumer-facing outbound (voice/WhatsApp/SMS/recovery) is automatically
 * deferred past TRAI quiet hours HERE, at enqueue time. That way the job sits
 * in Redis' delayed set costing nothing, instead of waking a worker that would
 * only sleep and fail. Bull's `attempts`/`backoff` (1m/2m/4m) could never span
 * a 12-hour quiet window, so retry-based waiting silently dropped every job
 * queued in the evening.
 */
export async function enqueueJob(data: QueueJobData, delay = 0): Promise<void> {
  let finalDelay = delay;

  if (QUIET_HOURS_GATED_TYPES.has(data.agent_type)) {
    const runAt = new Date(Date.now() + delay);
    if (isQuietHours(runAt)) {
      finalDelay = delay + msUntilAllowedWindow(runAt);
      console.log(
        `[queue] ${data.agent_type} job ${data.db_job_id} falls in TRAI quiet hours — ` +
        `deferring ${Math.round(finalDelay / 60_000)}m to the next allowed window`,
      );
    }
  }

  await agentQueue.add(data, {
    jobId: data.db_job_id, // dedupe by DB id
    delay: finalDelay,
  });
}

/**
 * Re-queue an already-running job to a later time (worker-side safety net).
 * Uses a fresh jobId because the original id is still held by the job that is
 * currently completing.
 */
export async function deferJob(data: QueueJobData, delayMs: number): Promise<void> {
  await agentQueue.add(data, {
    jobId: `${data.db_job_id}:defer-${Date.now()}`,
    delay: delayMs,
  });
}
