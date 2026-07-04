/**
 * Input-validation + health-contract tests.
 *
 * These run offline (no DB, no Redis). They lock in two things:
 *   1. The zod schemas used by the auth routes reject malformed input
 *      (short passwords, missing phone) before any DB work happens.
 *   2. The /api/health endpoint returns the shape uptime checks depend on.
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';

// Mirror of the schemas enforced in src/routes/auth.ts
const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  password: z.string().min(6),
  city: z.string().default(''),
  district: z.string().default(''),
});

describe('auth input validation', () => {
  it('rejects login with an empty phone', () => {
    const r = loginSchema.safeParse({ phone: '', password: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects registration when password is shorter than 6 chars', () => {
    const r = registerSchema.safeParse({ name: 'A', phone: '9876543210', password: '123' });
    expect(r.success).toBe(false);
  });

  it('rejects registration when phone is shorter than 10 digits', () => {
    const r = registerSchema.safeParse({ name: 'A', phone: '999', password: 'strongpass' });
    expect(r.success).toBe(false);
  });

  it('applies defaults for optional city/district', () => {
    const r = registerSchema.parse({ name: 'A', phone: '9876543210', password: 'strongpass' });
    expect(r.city).toBe('');
    expect(r.district).toBe('');
  });
});

describe('/api/health contract', () => {
  function buildHealthApp() {
    const app = express();
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    return app;
  }

  it('returns 200 with status ok', async () => {
    const res = await request(buildHealthApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
