// Minimal type stubs for @sentry/node so TS compiles without the full package types.
// Remove this file once `npm install` completes successfully in production.
declare module '@sentry/node' {
  export interface InitOptions {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
    integrations?: unknown[];
  }
  export function init(options: InitOptions): void;
  export function captureException(err: unknown, hint?: Record<string, unknown>): string;
  export function setupExpressErrorHandler(app: import('express').Application): void;
  export function httpIntegration(): unknown;
}
