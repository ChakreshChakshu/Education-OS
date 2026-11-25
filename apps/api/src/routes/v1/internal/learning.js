const { isDevAuthBypassEnabled, isUuid } = require('../../../middleware/tenantScope');
const { authorize } = require('../../../middleware/authorize');
const { requireActiveEnrollment } = require('../courseEnrollment');

const DEV_BYPASS_STUDENT_ID = '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

// Production uses the token identity only; dev bypass still honours client hints.
function resolveStudentUserId(request, ...devHints) {
  const tokenUserId =
    request.user?.userId || request.user?.id || request.user?.sub || null;

  if (!isDevAuthBypassEnabled()) {
    return tokenUserId;
  }

  for (const hint of devHints) {
    if (typeof hint === 'string' && hint.trim()) {
      return hint;
    }
  }

  return tokenUserId || request.headers['x-user-id'] || DEV_BYPASS_STUDENT_ID;
}

async function getCourseEnrollment(request, reply, container, studentUserId, courseId) {
  if (isDevAuthBypassEnabled()) {
    return requireActiveEnrollment(request, reply, container, studentUserId, courseId);
  }
  const course = isUuid(courseId) && await container.resolve('CourseRepository').findById(courseId);
  if (!request.tenantId || !course || course.tenantId !== request.tenantId) {
    reply.status(404).send({ success: false, error: 'Resource not found' });
    return null;
  }
  return requireActiveEnrollment(request, reply, container, studentUserId, courseId);
}

async function getLessonEnrollment(request, reply, container, studentUserId, lessonModuleId) {
  if (isDevAuthBypassEnabled()) {
    return requireActiveEnrollment(request, reply, container, studentUserId);
  }
  const lesson = isUuid(lessonModuleId) && await container.resolve('LessonModuleRepository').findById(lessonModuleId);
  if (!lesson) {
    reply.status(404).send({ success: false, error: 'Resource not found' });
    return null;
  }
  return getCourseEnrollment(request, reply, container, studentUserId, lesson.courseId);
}

async function learningRoutes(fastify, options) {
  const container = options.container;

  fastify.post(
    '/lessons/complete',
    { preHandler: authorize('lesson.read') },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request, request.body?.studentUserId);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const lessonModuleId = request.body?.lessonModuleId;
      if (!lessonModuleId) {
        return reply.status(400).send({ success: false, error: 'lessonModuleId is required' });
      }

      const enrollment = await getLessonEnrollment(request, reply, container, studentUserId, lessonModuleId);
      if (!enrollment) return;

      const useCase = container.resolve('MarkLessonCompleteUseCase');
      const result = await useCase.execute({
        studentUserId,
        batchId: enrollment.batchId,
        lessonModuleId
      });

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

  fastify.post(
    '/quizzes/submit',
    {
      preHandler: authorize('assessment.submit'),
      schema: {
        body: {
          type: 'object',
          required: ['lessonModuleId', 'answers'],
          additionalProperties: false,
          properties: {
            lessonModuleId: { type: 'string', format: 'uuid' },
            answers: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                uniqueItems: true
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const { lessonModuleId, answers } = request.body;
      const enrollment = await getLessonEnrollment(request, reply, container, studentUserId, lessonModuleId);
      if (!enrollment) return;

      const result = await container.resolve('SubmitQuizUseCase').execute({
        studentUserId,
        lessonModuleId,
        answers,
        batchId: enrollment.batchId
      });
      if (result.isFailure) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      return reply.status(201).send({ success: true, data: result.getValue() });
    }
  );

  fastify.get(
    '/courses/:courseId/progress',
    { preHandler: authorize('lesson.read') },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request, request.query?.studentUserId);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!(await getCourseEnrollment(request, reply, container, studentUserId, request.params.courseId))) {
        return;
      }

      const progressRepo = container.resolve('StudentProgressRepository');
      const moduleRepo = container.resolve('LessonModuleRepository');

      const [courseModules, studentProgress] = await Promise.all([
        moduleRepo.findByCourseId(request.params.courseId),
        progressRepo.findByStudent(studentUserId)
      ]);

      const courseModuleIds = new Set(courseModules.map((m) => m.id));
      const completedModules = studentProgress.filter((p) => courseModuleIds.has(p.lessonModuleId) && p.status === 'COMPLETED');
      const completedLessonIds = [...new Set(completedModules.map((p) => p.lessonModuleId))];
      const totalModules = courseModules.length;
      const progressPercent = totalModules > 0 ? Math.round((completedLessonIds.length / totalModules) * 100) : 0;

      return reply.send({
        success: true,
        data: {
          studentUserId,
          courseId: request.params.courseId,
          completedLessonIds,
          totalModules,
          completedCount: completedLessonIds.length,
          progressPercent
        }
      });
    }
  );

  fastify.get(
    '/lessons/:lessonId/notes',
    {
      preHandler: authorize('lesson.read'),
      schema: {
        params: {
          type: 'object',
          required: ['lessonId'],
          properties: {
            lessonId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!(await getLessonEnrollment(request, reply, container, studentUserId, request.params.lessonId))) {
        return;
      }

      const useCase = container.resolve('GetLessonNoteUseCase');
      const result = await useCase.execute({
        studentUserId,
        lessonModuleId: request.params.lessonId
      });

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

  fastify.put(
    '/lessons/:lessonId/notes',
    {
      preHandler: authorize('lesson.read'),
      schema: {
        params: {
          type: 'object',
          required: ['lessonId'],
          properties: {
            lessonId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
            studentUserId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!(await getLessonEnrollment(request, reply, container, studentUserId, request.params.lessonId))) {
        return;
      }

      const useCase = container.resolve('SaveLessonNoteUseCase');
      const result = await useCase.execute({
        studentUserId,
        lessonModuleId: request.params.lessonId,
        content: request.body.content
      });

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

  fastify.get(
    '/lessons/:lessonId/bookmarks',
    {
      preHandler: authorize('lesson.read'),
      schema: {
        params: {
          type: 'object',
          required: ['lessonId'],
          properties: {
            lessonId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!(await getLessonEnrollment(request, reply, container, studentUserId, request.params.lessonId))) {
        return;
      }

      const useCase = container.resolve('GetLessonBookmarksUseCase');
      const result = await useCase.execute({
        studentUserId,
        lessonModuleId: request.params.lessonId
      });

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

  fastify.post(
    '/lessons/:lessonId/bookmarks',
    {
      preHandler: authorize('lesson.read'),
      schema: {
        params: {
          type: 'object',
          required: ['lessonId'],
          properties: {
            lessonId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['timestampSeconds'],
          properties: {
            timestampSeconds: { type: 'number', minimum: 0 },
            title: { type: 'string' },
            note: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!(await getLessonEnrollment(request, reply, container, studentUserId, request.params.lessonId))) {
        return;
      }

      const useCase = container.resolve('CreateLessonBookmarkUseCase');
      const result = await useCase.execute({
        studentUserId,
        lessonModuleId: request.params.lessonId,
        timestampSeconds: request.body.timestampSeconds,
        title: request.body.title,
        note: request.body.note
      });

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

  fastify.delete(
    '/lessons/:lessonId/bookmarks/:bookmarkId',
    {
      preHandler: authorize('lesson.read'),
      schema: {
        params: {
          type: 'object',
          required: ['lessonId', 'bookmarkId'],
          properties: {
            lessonId: { type: 'string' },
            bookmarkId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const studentUserId = resolveStudentUserId(request);
      if (!studentUserId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!(await getLessonEnrollment(request, reply, container, studentUserId, request.params.lessonId))) {
        return;
      }

      const useCase = container.resolve('DeleteLessonBookmarkUseCase');
      const result = await useCase.execute({
        bookmarkId: request.params.bookmarkId,
        lessonModuleId: request.params.lessonId,
        studentUserId
      });

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

module.exports = learningRoutes;
