/**
 * AWS S3 upload helper for AI Accountant document storage.
 *
 * Optional — if AWS_ACCESS_KEY / AWS_SECRET_KEY / AWS_BUCKET aren't set, callers
 * should fall back to storing the file inline (see documents.ts). The AWS SDK is
 * imported lazily so the app boots fine even when S3 is never configured.
 */

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const AWS_BUCKET      = process.env.AWS_BUCKET;
const AWS_REGION      = process.env.AWS_REGION ?? 'ap-south-1';

export function isS3Configured(): boolean {
  return Boolean(AWS_ACCESS_KEY && AWS_SECRET_KEY && AWS_BUCKET);
}

/**
 * Upload a buffer to S3 and return its public URL.
 * Throws if S3 isn't configured — check isS3Configured() first.
 */
export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  if (!isS3Configured()) throw new Error('S3 not configured (AWS_ACCESS_KEY / AWS_SECRET_KEY / AWS_BUCKET)');

  // Lazy import so @aws-sdk/client-s3 is only required when S3 is actually used.
  // `any`-typed to sidestep environment-specific module-resolution quirks with this
  // package's type declarations under different TS configs — the runtime shape is stable.
  const s3mod: any = await import('@aws-sdk/client-s3');
  const { S3Client, PutObjectCommand } = s3mod;

  const client = new S3Client({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY!, secretAccessKey: AWS_SECRET_KEY! },
  });

  await client.send(new PutObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}
