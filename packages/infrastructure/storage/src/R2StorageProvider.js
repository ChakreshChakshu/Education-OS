const { StorageProvider } = require('./StorageProvider');

let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, getSignedUrl;

try {
  const s3 = require('@aws-sdk/client-s3');
  const presigner = require('@aws-sdk/s3-request-presigner');
  S3Client = s3.S3Client;
  PutObjectCommand = s3.PutObjectCommand;
  GetObjectCommand = s3.GetObjectCommand;
  DeleteObjectCommand = s3.DeleteObjectCommand;
  getSignedUrl = presigner.getSignedUrl;
} catch (e) {
  // S3 client fallback mode when AWS SDK is not installed in local workspace
}

class R2StorageProvider extends StorageProvider {
  constructor(config = {}) {
    super();
    this.config = {
      accountId: config.accountId || process.env.R2_ACCOUNT_ID || '',
      accessKeyId: config.accessKeyId || process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: config.bucketName || process.env.R2_BUCKET_NAME || 'education-os-media',
      publicDomain: config.publicDomain || process.env.R2_PUBLIC_DOMAIN || ''
    };

    if (S3Client && this.config.accessKeyId && this.config.secretAccessKey && this.config.accountId) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey
        }
      });
    }
  }

  getPublicUrl(key) {
    if (this.config.publicDomain) {
      const domain = this.config.publicDomain.replace(/\/$/, '');
      return `${domain}/${key}`;
    }
    return `https://${this.config.bucketName}.r2.cloudflarestorage.com/${key}`;
  }

  async upload(key, fileBuffer, mimeType) {
    if (this.client && PutObjectCommand) {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType
      });
      await this.client.send(command);
      return { key, url: this.getPublicUrl(key) };
    }

    console.log(`[R2StorageProvider] Mock uploading ${key} (${mimeType}) to bucket ${this.config.bucketName}`);
    return { key, url: this.getPublicUrl(key) };
  }

  async download(key) {
    if (this.client && GetObjectCommand) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key
      });
      const response = await this.client.send(command);
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    console.log(`[R2StorageProvider] Mock downloading ${key}`);
    return Buffer.from('');
  }

  async delete(key) {
    if (this.client && DeleteObjectCommand) {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key
      });
      await this.client.send(command);
      return true;
    }

    console.log(`[R2StorageProvider] Mock deleting ${key} from R2 bucket ${this.config.bucketName}`);
    return true;
  }

  async getSignedUrl(key, expiresInSeconds = 3600) {
    if (this.client && PutObjectCommand && getSignedUrl) {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    }

    const publicUrl = this.getPublicUrl(key);
    return `${publicUrl}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresInSeconds}`;
  }
}

module.exports = { R2StorageProvider };
