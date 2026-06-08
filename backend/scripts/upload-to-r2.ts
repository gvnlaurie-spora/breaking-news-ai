import { uploadVideo } from '../src/lib/storage';

const [, , localPath, key] = process.argv;
if (!localPath || !key) {
  console.error('Usage: tsx upload-to-r2.ts <local-path> <key>');
  process.exit(1);
}

(async () => {
  try {
    const publicBase = process.env.R2_PUBLIC_BASE || `https://${process.env.R2_BUCKET}.r2.dev`;
    const url = await uploadVideo(localPath, key, publicBase);
    console.log(`✅ Uploaded: ${url}`);
  } catch (err) {
    console.error('❌ Upload failed:', err);
    process.exit(1);
  }
})();
