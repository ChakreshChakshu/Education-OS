const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/education_os'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || ''
  },
  featureFlags: {
    enableSqsQueue: false,
    enableCloudStorage: false,
    enableVideoTranscoding: true
  },
  constants: {
    DEFAULT_TENANT_ID: 'system',
    SUPPORT_EMAIL: 'support@educationos.com'
  }
};

module.exports = config;
