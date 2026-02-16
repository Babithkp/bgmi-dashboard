import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

if (!BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.DATABASE_URL) {
  throw new Error('AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_REGION environment variables are required');
}

export async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  const region = process.env.AWS_REGION;
  if (region === 'us-east-1') {
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export function extractS3Key(url: string): string | null {
  if (!url) return null;

  if (url.startsWith('s3://')) {
    const parts = url.replace('s3://', '').split('/');
    if (parts.length > 1) {
      return parts.slice(1).join('/');
    }
    return null;
  }

  const match = url.match(/https?:\/\/[^\/]+\/(.+)/);
  if (match && match[1]) {
    return match[1].split('?')[0];
  }

  return url;
}