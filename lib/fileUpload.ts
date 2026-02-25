import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.CLOUDFLARE_REGION,
  endpoint: process.env.CLOUDFLARE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_S3_BUCKET_NAME!;

if (!BUCKET_NAME || !process.env.CLOUDFLARE_ACCESS_KEY_ID || !process.env.CLOUDFLARE_SECRET_ACCESS_KEY || !process.env.CLOUDFLARE_REGION || !process.env.DATABASE_URL) {
  throw new Error('CLOUDFLARE_S3_BUCKET_NAME, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY and CLOUDFLARE_REGION environment variables are required');
}

export async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://storage.trikonatech.com/${key}`
}

export async function deleteFromS3(fileUrlOrKey: string): Promise<void> {
  try {
    let key = fileUrlOrKey;
    if (fileUrlOrKey.startsWith("http")) {
      const parsed = new URL(fileUrlOrKey);
      key = decodeURIComponent(parsed.pathname.slice(1));
    }
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
  }
}

// export function extractS3Key(url: string): string | null {
//   if (!url) return null;

//   if (url.startsWith('s3://')) {
//     const parts = url.replace('s3://', '').split('/');
//     if (parts.length > 1) {
//       return parts.slice(1).join('/');
//     }
//     return null;
//   }

//   const match = url.match(/https?:\/\/[^\/]+\/(.+)/);
//   if (match && match[1]) {
//     return match[1].split('?')[0];
//   }

//   return url;
// }