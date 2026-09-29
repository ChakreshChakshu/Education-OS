const { randomUUID } = require('crypto');
const { authorize } = require('../../../middleware/authorize');

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
      preHandler: authorize('course.create'),
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
        hlsUrl: m.props?.hlsUrl || (m.contentUrl && m.contentUrl.includes('.m3u8') ? m.contentUrl : null),
        order: m.order,
        status: m.status,
        quiz: m.quiz || null
      }))
    });
  });

  // Create Module for Course Route
  fastify.post('/courses/:id/modules', async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const courseRepo = container.resolve('CourseRepository');
    const { title, contentType, contentUrl, hlsUrl, order, quiz } = request.body || {};

    const course = await courseRepo.findById(request.params.id);
    if (!course) {
      return reply.status(404).send({ success: false, error: 'Cannot create module for non-existent course' });
    }

    const moduleId = randomUUID();

    const newModule = {
      id: moduleId,
      courseId: request.params.id,
      title: title || 'Untitled Lesson Module',
      contentType: contentType || 'VIDEO',
      contentUrl: contentUrl || '',
      order: order || 1,
      status: 'PUBLISHED',
      quiz: quiz || null,
      props: { createdAt: new Date(), hlsUrl: hlsUrl || null }
    };

    await moduleRepo.save(newModule);

    return reply.status(201).send({
      success: true,
      data: {
        ...newModule,
        hlsUrl: hlsUrl || null
      }
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
        term: b.term ? (typeof b.term === 'object' ? b.term.value : b.term) : null,
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
            courseId: { type: 'string' },
            name: { type: 'string', minLength: 1 },
            term: { type: 'string' },
            capacity: { type: 'integer', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('CreateBatchUseCase');
      const result = await useCase.execute(request.body);
      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }
      return reply.status(201).send({ success: true, data: result.getValue() });
    }
  );

  // List Enrollments for Tenant / Filtered
  fastify.get('/enrollments', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] || request.query.tenantId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
    const { courseId, batchId, status, search } = request.query;

    const useCase = container.resolve('GetTenantEnrollmentsUseCase');
    const result = await useCase.execute({
      tenantId,
      courseId,
      batchId,
      status,
      search
    });

    if (result.isFailure) {
      return reply.status(400).send({ success: false, error: result.error });
    }

    const enrollments = result.getValue();
    return reply.send({
      success: true,
      data: enrollments.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        studentUserId: e.studentUserId,
        studentName: e.studentName || 'Student',
        studentEmail: e.studentEmail || '',
        courseId: e.courseId,
        courseTitle: e.courseTitle || 'Course',
        courseCode: e.courseCode || '',
        batchId: e.batchId,
        batchName: e.batchName || 'General Cohort',
        status: e.status,
        progressPercentage: e.progressPercentage,
        enrolledAt: e.enrolledAt,
        updatedAt: e.updatedAt
      }))
    });
  });

  // Enroll Student in Course / Batch
  fastify.post(
    '/enrollments',
    {
      schema: {
        body: {
          type: 'object',
          required: ['courseId'],
          properties: {
            tenantId: { type: 'string' },
            studentUserId: { type: 'string' },
            studentEmail: { type: 'string' },
            studentName: { type: 'string' },
            courseId: { type: 'string' },
            batchId: { type: 'string' },
            temporaryPassword: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const tenantId =
        request.body.tenantId ||
        request.headers['x-tenant-id'] ||
        request.user?.tenantId ||
        '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

      const useCase = container.resolve('EnrollStudentUseCase');
      const result = await useCase.execute({
        tenantId,
        studentUserId: request.body.studentUserId,
        studentEmail: request.body.studentEmail,
        studentName: request.body.studentName,
        courseId: request.body.courseId,
        batchId: request.body.batchId,
        temporaryPassword: request.body.temporaryPassword
      });

      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      return reply.status(201).send({
        success: true,
        data: result.getValue()
      });
    }
  );

  // Update Enrollment Status or Cohort Batch
  fastify.patch(
    '/enrollments/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } }
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED'] },
            batchId: { type: 'string' },
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('UpdateEnrollmentStatusUseCase');
      const result = await useCase.execute({
        enrollmentId: request.params.id,
        status: request.body.status,
        batchId: request.body.batchId,
        progressPercentage: request.body.progressPercentage
      });

      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      return reply.send({
        success: true,
        data: result.getValue()
      });
    }
  );
}

module.exports = academicsRoutes;
