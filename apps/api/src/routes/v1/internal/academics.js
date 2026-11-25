const { learningDomain } = require('../../../bootstrap/domain-bridge');
const { studentQuiz } = learningDomain.application;
const { requireActiveEnrollment } = require('../courseEnrollment');
const { queueEnrollmentInvitation, serializeEnrollment } = require('../enrollmentInvitation');
const { randomUUID } = require('crypto');
const { authorize } = require('../../../middleware/authorize');
const {
  requireTenant,
  checkPermission,
  assertPermission,
  getUserId,
  isDevAuthBypassEnabled
} = require('../../../middleware/tenantScope');

async function academicsRoutes(fastify, options) {
  const container = options.container;

  const assertSameTenant = (request, reply, resourceTenantId) => {
    if (isDevAuthBypassEnabled() || !request.tenantId) {
      return true;
    }
    if (resourceTenantId && resourceTenantId !== request.tenantId) {
      reply.status(404).send({ success: false, error: 'Resource not found' });
      return false;
    }
    return true;
  };

  fastify.get('/courses', { preHandler: authorize('course.read') }, async (request, reply) => {
    const courseRepo = container.resolve('CourseRepository');
    const tenantId = request.tenantId;
    if (!tenantId && !isDevAuthBypassEnabled()) {
      return reply.status(400).send({
        success: false,
        error: 'No active tenant workspace found for this account.'
      });
    }
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

  fastify.get('/courses/:id', { preHandler: authorize('course.read') }, async (request, reply) => {
    if (!isUuid(request.params.id)) {
      return reply.status(404).send({ success: false, error: 'Course not found' });
    }
    const courseRepo = container.resolve('CourseRepository');
    const course = await courseRepo.findById(request.params.id);
    if (!course) {
      return reply.status(404).send({ success: false, error: 'Course not found' });
    }
    if (!assertSameTenant(request, reply, course.tenantId)) {
      return;
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
      if (!requireTenant(request, reply)) {
        return;
      }

      const tenantId = request.tenantId;
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

  fastify.get('/courses/:id/modules', { preHandler: authorize('lesson.read') }, async (request, reply) => {
    if (!isUuid(request.params.id)) {
      return reply.send({ success: true, data: [] });
    }
    const courseRepo = container.resolve('CourseRepository');
    const course = await courseRepo.findById(request.params.id);
    if (!course) {
      return reply.status(404).send({ success: false, error: 'Course not found' });
    }
    if (!assertSameTenant(request, reply, course.tenantId)) {
      return;
    }
    const userId = getUserId(request);
    const canPublish = isDevAuthBypassEnabled() || await container.resolve('RoleAssignmentRepository').hasPermission({
      userId,
      tenantId: course.tenantId,
      organizationId: course.organizationId,
      permissionKey: 'lesson.publish'
    });
    if (!canPublish && !(await requireActiveEnrollment(request, reply, container, userId, course.id))) {
      return;
    }
    const moduleRepo = container.resolve('LessonModuleRepository');
    const modules = await moduleRepo.findByCourseId(request.params.id);
    return reply.send({
      success: true,
      data: modules.map((m) => {
        let hlsUrl = m.props?.hlsUrl || (m.contentUrl && m.contentUrl.includes('.m3u8') ? m.contentUrl : null);
        if (hlsUrl && hlsUrl.includes('.r2.cloudflarestorage.com/hls/') && !process.env.MEDIA_CDN_URL) {
          const match = hlsUrl.match(/\/hls\/([a-zA-Z0-9_-]+)\/master\.m3u8/);
          if (match && match[1]) {
            hlsUrl = `http://localhost:3001/uploads/hls/${match[1]}/master.m3u8`;
          }
        }
        return {
          id: m.id,
          courseId: m.courseId,
          title: m.title,
          contentType: m.contentType,
          contentUrl: m.contentUrl,
          hlsUrl,
          order: m.order,
          status: m.status,
          quiz: m.contentType === 'QUIZ' && !canPublish ? studentQuiz(m.quiz) : m.quiz || null
        };
      })
    });
  });

  fastify.post('/courses/:id/modules', { preHandler: authorize('lesson.publish') }, async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const courseRepo = container.resolve('CourseRepository');
    const { title, contentType, contentUrl, hlsUrl, order, quiz } = request.body || {};

    const course = await courseRepo.findById(request.params.id);
    if (!course) {
      return reply.status(404).send({ success: false, error: 'Cannot create module for non-existent course' });
    }
    if (!assertSameTenant(request, reply, course.tenantId)) {
      return;
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

  fastify.put('/courses/:id/modules/:moduleId', { preHandler: authorize('lesson.publish') }, async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const courseRepo = container.resolve('CourseRepository');
    const { moduleId, id: courseId } = request.params;
    const { title, contentType, contentUrl, hlsUrl, order, quiz, status } = request.body || {};

    const existing = await moduleRepo.findById(moduleId);
    if (!existing || existing.courseId !== courseId) {
      return reply.status(404).send({ success: false, error: 'Lesson module not found' });
    }

    const course = await courseRepo.findById(courseId);
    if (!course || !assertSameTenant(request, reply, course.tenantId)) {
      return;
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

  fastify.delete('/courses/:id/modules/:moduleId', { preHandler: authorize('lesson.publish') }, async (request, reply) => {
    const moduleRepo = container.resolve('LessonModuleRepository');
    const courseRepo = container.resolve('CourseRepository');
    const { moduleId, id: courseId } = request.params;

    const existing = await moduleRepo.findById(moduleId);
    if (!existing || existing.courseId !== courseId) {
      return reply.status(404).send({ success: false, error: 'Lesson module not found' });
    }

    const course = await courseRepo.findById(courseId);
    if (!course || !assertSameTenant(request, reply, course.tenantId)) {
      return;
    }

    await moduleRepo.delete(moduleId);

    return reply.send({
      success: true,
      data: { id: moduleId, message: 'Lesson module deleted successfully' }
    });
  });

  fastify.get('/batches', { preHandler: authorize('course.read') }, async (request, reply) => {
    const batchRepo = container.resolve('BatchRepository');
    const courseRepo = container.resolve('CourseRepository');
    const courseId = request.query.courseId;
    if (courseId) {
      const course = await courseRepo.findById(courseId);
      if (!course) {
        return reply.status(404).send({ success: false, error: 'Course not found' });
      }
      if (!assertSameTenant(request, reply, course.tenantId)) {
        return;
      }
    }
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

  fastify.post(
    '/batches',
    {
      preHandler: authorize('lesson.publish'),
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
      if (!requireTenant(request, reply)) {
        return;
      }
      const courseRepo = container.resolve('CourseRepository');
      const course = await courseRepo.findById(request.body.courseId);
      if (!course) {
        return reply.status(404).send({ success: false, error: 'Course not found' });
      }
      if (!assertSameTenant(request, reply, course.tenantId)) {
        return;
      }

      const useCase = container.resolve('CreateBatchUseCase');
      const result = await useCase.execute(request.body);
      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }
      return reply.status(201).send({ success: true, data: result.getValue() });
    }
  );

  fastify.get('/enrollments', { preHandler: authorize('course.read') }, async (request, reply) => {
    if (!requireTenant(request, reply)) {
      return;
    }

    const tenantId = request.tenantId;
    const { courseId, batchId, status, search } = request.query;
    let { studentUserId } = request.query;

    const canManageEnrollments = await checkPermission(request, 'course.update');
    if (!canManageEnrollments) {
      studentUserId = getUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
    }

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
            batchId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      if (!requireTenant(request, reply)) {
        return;
      }

      const tenantId = request.tenantId;

      const isSelfEnrollment = !request.body.studentUserId && !request.body.studentEmail;

      if (!isSelfEnrollment) {
        if (!(await assertPermission(request, reply, 'course.update'))) {
          return;
        }
      }

      const callerUserId = getUserId(request);
      const studentUserId = isSelfEnrollment ? callerUserId : request.body.studentUserId;
      const studentEmail = request.body.studentEmail || (isSelfEnrollment ? request.user?.email : null);
      const studentName = request.body.studentName || (isSelfEnrollment ? request.user?.name : null);

      if (isSelfEnrollment && !studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const courseRepo = container.resolve('CourseRepository');
      const course = await courseRepo.findById(request.body.courseId);
      if (!course) {
        return reply.status(404).send({ success: false, error: 'Course not found' });
      }
      if (!assertSameTenant(request, reply, course.tenantId)) {
        return;
      }

      if (isSelfEnrollment && (course.visibility !== 'PUBLIC' || !['PUBLISHED', 'ACTIVE'].includes(course.status))) {
        return reply.status(404).send({ success: false, error: 'Course not found' });
      }

      const useCase = container.resolve('EnrollStudentUseCase');
      const result = await useCase.execute({
        tenantId,
        studentUserId,
        studentEmail,
        studentName,
        courseId: request.body.courseId,
        batchId: request.body.batchId
      });

      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      const enrollment = result.getValue();
      const invitationQueued = await queueEnrollmentInvitation({ container, request, enrollment, course });

      return reply.status(201).send({
        success: true,
        data: serializeEnrollment(enrollment),
        invitationQueued
      });
    }
  );

  fastify.patch(
    '/enrollments/:id',
    {
      preHandler: authorize('course.update'),
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
      if (!requireTenant(request, reply)) {
        return;
      }
      const enrollmentRepo = container.resolve('EnrollmentRepository');
      const existing = await enrollmentRepo.findById(request.params.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Enrollment not found' });
      }
      if (!assertSameTenant(request, reply, existing.tenantId)) {
        return;
      }

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

  fastify.delete(
    '/enrollments/:id',
    {
      preHandler: authorize('course.update'),
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } }
        }
      }
    },
    async (request, reply) => {
      if (!requireTenant(request, reply)) {
        return;
      }
      const repo = container.resolve('EnrollmentRepository');
      const existing = await repo.findById(request.params.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Enrollment not found' });
      }
      if (!assertSameTenant(request, reply, existing.tenantId)) {
        return;
      }
      await repo.delete(request.params.id);
      return reply.send({ success: true, message: 'Enrollment deleted successfully' });
    }
  );
}

module.exports = academicsRoutes;
