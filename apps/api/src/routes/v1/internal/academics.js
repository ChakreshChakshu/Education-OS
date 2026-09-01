async function academicsRoutes(fastify, options) {
  const container = options.container;

  // Create Course Route
  fastify.post(
    '/courses',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tenantId', 'title', 'code'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            organizationId: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 1 },
            code: { type: 'string', minLength: 3 },
            description: { type: 'string' },
            credits: { type: 'integer', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreateCourseUseCase');
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

  // Create Batch Route
  fastify.post(
    '/batches',
    {
      schema: {
        body: {
          type: 'object',
          required: ['courseId', 'name'],
          properties: {
            courseId: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1 },
            term: { type: 'string' },
            capacity: { type: 'integer', minimum: 1 },
            instructorUserId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreateBatchUseCase');
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
}

module.exports = academicsRoutes;
