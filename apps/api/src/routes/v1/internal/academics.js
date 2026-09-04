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

  // Get Single Course Detail Route
  fastify.get('/courses/:id', async (request, reply) => {
    const courseRepo = container.resolve('CourseRepository');
    const course = await courseRepo.findById(request.params.id);
    if (!course) {
      return reply.status(404).send({ success: false, error: 'Course not found' });
    }
    return reply.send({
      success: true,
      data: {
        id: course.id,
        tenantId: course.tenantId,
        organizationId: course.organizationId,
        title: course.title,
        code: course.code.value,
        description: course.description,
        credits: course.credits,
        status: course.status,
        createdAt: course.createdAt
      }
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
            tenantId: { type: 'string' },
            organizationId: { type: 'string' },
            title: { type: 'string', minLength: 1 },
            code: { type: 'string', minLength: 1 },
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

  // List Modules for Course Route
  fastify.get('/courses/:id/modules', async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const modules = await moduleRepo.findByCourseId(request.params.id);
    return reply.send({
      success: true,
      data: modules.map((m) => ({
        id: m.id,
        courseId: m.courseId,
        title: m.title,
        contentType: m.contentType,
        contentUrl: m.contentUrl,
        order: m.order,
        status: m.status,
        quiz: m.quiz || null
      }))
    });
  });

  // Create Module for Course Route
  fastify.post('/courses/:id/modules', async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const { title, contentType, contentUrl, order, quiz } = request.body || {};

    const newModule = {
      id: 'module_' + Date.now(),
      courseId: request.params.id,
      title: title || 'Untitled Lesson Module',
      contentType: contentType || 'VIDEO',
      contentUrl: contentUrl || '',
      order: order || 1,
      status: 'PUBLISHED',
      quiz: quiz || null,
      props: { createdAt: new Date() }
    };

    await moduleRepo.save(newModule);

    return reply.status(201).send({
      success: true,
      data: newModule
    });
  });

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
}

module.exports = academicsRoutes;
