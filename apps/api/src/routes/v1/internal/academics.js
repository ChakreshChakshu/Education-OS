async function academicsRoutes(fastify, options) {
  const container = options.container;

  // List Courses Route
  fastify.get('/courses', async (request, reply) => {
    const courseRepo = container.resolve('CourseRepository');
    const tenantId = request.headers['x-tenant-id'] || request.query.tenantId;
    const courses = await courseRepo.findByTenantId(tenantId);
    return reply.send({
      success: true,
      data: courses.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        organizationId: c.organizationId,
        title: c.title,
        code: c.code.value,
        description: c.description,
        credits: c.credits,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  });

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

  // List Batches Route
  fastify.get('/batches', async (request, reply) => {
    const batchRepo = container.resolve('BatchRepository');
    const courseId = request.query.courseId;
    const batches = courseId ? await batchRepo.findByCourseId(courseId) : [];
    return reply.send({
      success: true,
      data: batches.map((b) => ({
        id: b.id,
        courseId: b.courseId,
        name: b.name,
        term: b.term ? b.term.value : null,
        capacity: b.capacity,
        status: b.status
      }))
    });
  });

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
