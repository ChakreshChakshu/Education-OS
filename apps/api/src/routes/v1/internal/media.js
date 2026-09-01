async function mediaRoutes(fastify, options) {
  const container = options.container;

  // Create Presigned Upload URL Route
  fastify.post(
    '/presign',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'filename', 'mimeType', 'sizeBytes'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            uploaderUserId: { type: 'string', format: 'uuid' },
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
  fastify.post(
    '/confirm',
    {
      schema: {
        body: {
          type: 'object',
          required: ['mediaAssetId'],
          properties: {
            mediaAssetId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request, reply) => {
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
    }
  );
}

module.exports = mediaRoutes;
