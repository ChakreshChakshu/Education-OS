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
        slug: c.slug,
        shortDescription: c.shortDescription,
        description: c.description,
        thumbnailFileId: c.thumbnailFileId,
        thumbnailUrl: c.thumbnailUrl,
        level: c.level,
        language: c.language,
        visibility: c.visibility,
        credits: c.credits,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  });

  const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Get Single Course Detail Route
  fastify.get('/courses/:id', async (request, reply) => {
    if (!isUuid(request.params.id)) {
      return reply.status(404).send({ success: false, error: 'Course not found' });
    }
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
        slug: course.slug,
        shortDescription: course.shortDescription,
        description: course.description,
        thumbnailFileId: course.thumbnailFileId,
        thumbnailUrl: course.thumbnailUrl,
        level: course.level,
        language: course.language,
        visibility: course.visibility,
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
          required: ['title', 'code'],
          properties: {
            tenantId: { type: ['string', 'null'] },
            organizationId: { type: ['string', 'null'] },
            title: { type: 'string', minLength: 1 },
            code: { type: 'string', minLength: 1 },
            slug: { type: ['string', 'null'] },
            shortDescription: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            thumbnailFileId: { type: ['string', 'null'] },
            level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] },
            language: { type: 'string' },
            visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'UNLISTED'] },
            credits: { type: 'integer', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      let tenantId = request.body.tenantId;
      if (!isUuid(tenantId)) {
        tenantId = request.headers['x-tenant-id'];
      }
      if (!isUuid(tenantId)) {
        const roleAssignmentRepository = container.resolve('RoleAssignmentRepository');
        const userTenants = await roleAssignmentRepository.findTenantsWithRolesForUser(
          request.user?.userId || request.user?.sub
        );
        if (userTenants && userTenants.length > 0) {
          tenantId = userTenants[0].tenantId;
        }
      }

      if (!isUuid(tenantId)) {
        return reply.status(400).send({
          success: false,
          error: 'Valid tenantId is required to create a course.'
        });
      }

      const payload = {
        ...request.body,
        tenantId,
        organizationId: isUuid(request.body.organizationId) ? request.body.organizationId : null,
        thumbnailFileId: isUuid(request.body.thumbnailFileId) ? request.body.thumbnailFileId : null,
        slug: request.body.slug || null,
        shortDescription: request.body.shortDescription || null,
        description: request.body.description || null
      };

      const useCase = container.resolve('CreateCourseUseCase');
      const result = await useCase.execute(payload);

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
    if (!isUuid(request.params.id)) {
      return reply.send({ success: true, data: [] });
    }
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

  // Update Module for Course Route
  fastify.put('/courses/:id/modules/:moduleId', async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const { moduleId, id: courseId } = request.params;
    const { title, contentType, contentUrl, hlsUrl, order, quiz, status } = request.body || {};

    const existing = await moduleRepo.findById(moduleId);
    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Lesson module not found' });
    }

    const updatedModule = {
      id: moduleId,
      courseId,
      title: title !== undefined ? title : existing.title,
      contentType: contentType !== undefined ? contentType : existing.contentType,
      contentUrl: contentUrl !== undefined ? contentUrl : existing.contentUrl,
      order: order !== undefined ? order : existing.order,
      status: status !== undefined ? status : existing.status,
      quiz: quiz !== undefined ? quiz : existing.quiz,
      props: {
        ...(existing.props || {}),
        updatedAt: new Date(),
        hlsUrl: hlsUrl !== undefined ? hlsUrl : (existing.props?.hlsUrl || null)
      }
    };

    await moduleRepo.save(updatedModule);

    return reply.send({
      success: true,
      data: updatedModule
    });
  });

  // Delete Module for Course Route
  fastify.delete('/courses/:id/modules/:moduleId', async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const { moduleId } = request.params;

    const existing = await moduleRepo.findById(moduleId);
    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Lesson module not found' });
    }

    await moduleRepo.delete(moduleId);

    return reply.send({
      success: true,
      data: { id: moduleId, message: 'Lesson module deleted successfully' }
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
    const { courseId, batchId, status, search, studentUserId } = request.query;

    const useCase = container.resolve('GetTenantEnrollmentsUseCase');
    const result = await useCase.execute({
      tenantId,
      courseId,
      batchId,
      status,
      search,
      studentUserId
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

      const studentUserId =
        request.body.studentUserId ||
        request.user?.userId ||
        request.user?.id;

      const useCase = container.resolve('EnrollStudentUseCase');
      const result = await useCase.execute({
        tenantId,
        studentUserId,
        studentEmail: request.body.studentEmail || request.user?.email,
        studentName: request.body.studentName || request.user?.name,
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
