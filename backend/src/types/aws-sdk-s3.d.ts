// Ambient fallback so `await import('@aws-sdk/client-s3')` type-checks even in
// environments where this optional dependency's own type resolution is flaky
// (see backend/src/lib/s3.ts — S3 upload is optional, used only when configured).
declare module '@aws-sdk/client-s3';
