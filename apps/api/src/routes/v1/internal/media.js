const fs = require('fs');
const path = require('path');

async function mediaRoutes(fastify, options) {
  const container = options.container;

  // Direct File Upload Route (Saves to local ./uploads/)
  fastify.post('/upload', async (request, reply) => {
    const { filename, fileData, mimeType } = request.body || {};

    if (!filename || !fileData) {
      return reply.status(400).send({ success: false, error: 'Missing filename or fileData payload' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFilename);

    // Extract base64 buffer
    const base64Data = fileData.replace(/^data:.*;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `http://localhost:3001/uploads/${safeFilename}`;

    return reply.status(201).send({
      success: true,
      data: {
        filename: safeFilename,
        path: filePath,
        url: fileUrl,
        mimeType: mimeType || 'application/octet-stream'
      }
    });
  });

  // Create Presigned Upload URL Route
  fastify.post(
    '/presign',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'filename', 'mimeType', 'sizeBytes'],
          properties: {
            tenantId: { type: 'string' },
            uploaderUserId: { type: 'string' },
            filename: { type: 'string', minLength: 1 },
            mimeType: { type: 'string', minLength: 3 },
            sizeBytes: { type: 'number', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreatePresignedUploadUrlUseCase');
      const result = await useCase.execute(request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.getValue()
      });
    }
  );

  // Confirm File Upload Route
  fastify.post('/confirm', async (request, reply) => {
    const useCase = container.resolve('ConfirmMediaUploadUseCase');
    const result = await useCase.execute(request.body);

    if (result.isFailure) {
      return reply.status(400).send({
        success: false,
        error: result.error
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.getValue()
    });
  });
}

module.exports = mediaRoutes;
