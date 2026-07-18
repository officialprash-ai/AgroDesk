/**
 * Support Intake — staff notification enqueue.
 *
 * Runs AFTER the ticket is persisted. Pushes a `support_notify` job onto the
 * existing Bull queue (agent_jobs), which the worker turns into a WhatsApp
 * message to the routed staff member. Idempotent per request via the
 * already-unique AgentJob.idempotency_key.
 *
 * Never call this for demo dealers — outbound sends are simulated for them.
 */

import { prisma as _prisma } from '../../lib/prisma.js';
const prisma = _prisma as any;
import { enqueueJob } from '../../lib/queue.js';

export async function enqueueSupportNotify(dealerId: string, requestId: string): Promise<void> {
  const idempotency_key = `support_notify-${requestId}`;

  const existing = await prisma.agentJob.findUnique({ where: { idempotency_key } }).catch(() => null);
  if (existing) return; // already queued for this ticket

  const payload = { request_id: requestId };
  const job = await prisma.agentJob
    .create({ data: { dealer_id: dealerId, agent_type: 'support_notify', payload, idempotency_key } })
    .catch((err: Error) => {
      console.error('[support] failed to create notify job row:', err.message);
      return null;
    });
  if (!job) return;

  await enqueueJob({ db_job_id: job.id, dealer_id: dealerId, agent_type: 'support_notify', payload }).catch((err) =>
    // Non-fatal: the row exists and will be retried; the ticket is already saved.
    console.error('[support] failed to enqueue notify job:', err),
  );
}
