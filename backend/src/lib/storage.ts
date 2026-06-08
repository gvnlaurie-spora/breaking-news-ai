import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadVideo(localPath: string, key: string, publicBase?: string): Promise<string> {
  const fileStream = fs.createReadStream(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: fileStream,
    ContentType: 'video/mp4',
  }));
  const base = publicBase || `https://${process.env.R2_BUCKET}.r2.dev`;
  return `${base.replace(/\/$/, '')}/${key}`;
}

export async function listVideos(): Promise<string[]> {
  const result = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET! }));
  return result.Contents?.map(c => c.Key || '') || [];
}
