/**
 * Frontend test setup — runs before every test file.
 * Adds jest-dom matchers (toBeInTheDocument, etc.) and cleans up the
 * React tree after each test.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
