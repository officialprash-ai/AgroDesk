import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Actions a demo account is NOT allowed to perform.
 *
 * Philosophy: a client demo should feel fully interactive — the prospect can
 * browse, create, and edit records (all of which are wiped back to a clean
 * state on the next demo login) and watch the AI features run live. What they
 * must NOT do is (a) trigger anything that reaches a real phone / inbox or
 * costs real outbound credits, or (b) delete seeded data mid-demo.
 *
 * Blocked requests short-circuit with a friendly *simulated success* (HTTP 200)
 * rather than an error, so the UI flows naturally — buttons still "work", the
 * prospect just never actually dials a farmer or messages a debtor.
 */
interface BlockRule {
  method: string;
  pattern: RegExp;
  message: string;
}

const BLOCKED: BlockRule[] = [
  // Real outbound — would dial / message real numbers or burn credits
  { method: 'POST', pattern: /^\/api\/jobs\/?$/, message: 'Demo mode: agent jobs are simulated — no real calls or messages were sent.' },
  { method: 'POST', pattern: /^\/api\/recovery\/bulk\/?$/, message: 'Demo mode: bulk recovery outreach is simulated — no debtors were contacted.' },
  { method: 'POST', pattern: /^\/api\/recovery\/[^/]+\/contact\/?$/, message: 'Demo mode: this outreach is simulated — no call or message was actually sent.' },
  { method: 'POST', pattern: /^\/api\/documents\/send-to-accountant\/?$/, message: 'Demo mode: sending to the accountant is simulated — nothing was actually sent.' },
  // Destructive — keep the demo dataset intact for the duration of the session
  { method: 'DELETE', pattern: /^\/api\/.+/, message: 'Demo mode: deleting is disabled. Data resets automatically on the next demo login.' },
];

export function demoGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.is_demo) return next();

  // req.originalUrl includes the query string — strip it for matching.
  const path = req.originalUrl.split('?')[0];
  const rule = BLOCKED.find(r => r.method === req.method && r.pattern.test(path));

  if (rule) {
    return res.json({ success: true, demo: true, simulated: true, message: rule.message });
  }
  return next();
}
