/**
 * Global test setup — runs before every test file.
 * Sets the minimum env vars the app needs to boot without crashing.
 */
process.env.DATABASE_URL    = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET      = 'test-secret-at-least-32-chars-long!!';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.NODE_ENV        = 'test';
