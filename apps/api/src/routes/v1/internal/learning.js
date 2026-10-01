async function learningRoutes(fastify, options) {
  const container = options.container;

  // Mark Lesson Complete Route
  fastify.post(
    '/lessons/complete',
    async (request, reply) => {
      const candidateId =
        request.body?.studentUserId ||
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

      const lessonModuleId = request.body?.lessonModuleId;
      if (!lessonModuleId) {
        return reply.status(400).send({ success: false, error: 'lessonModuleId is required' });
      }

      const useCase = container.resolve('MarkLessonCompleteUseCase');
      const result = await useCase.execute({
        studentUserId,
        batchId: request.body?.batchId,
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

  // Submit Quiz Assessment Route
  fastify.post(
    '/quizzes/submit',
    async (request, reply) => {
      const candidateId =
        request.body?.studentUserId ||
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

      const { lessonModuleId, score, passingScore } = request.body || {};
      if (!lessonModuleId || score === undefined) {
        return reply.status(400).send({ success: false, error: 'lessonModuleId and score are required' });
      }

      const useCase = container.resolve('SubmitQuizUseCase');
      const result = await useCase.execute({
        studentUserId,
        lessonModuleId,
        score,
        passingScore: passingScore || 70
      });

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error
        });
      }

      const submissionData = result.getValue();
      if (submissionData.passed) {
        try {
          const markCompleteUseCase = container.resolve('MarkLessonCompleteUseCase');
          await markCompleteUseCase.execute({
            studentUserId,
            lessonModuleId,
            batchId: request.body?.batchId
          });
        } catch (e) {
          // non-fatal
        }
      }

      return reply.status(201).send({
        success: true,
        data: submissionData
      });
    }
  );

  // Get Student Progress for Course Route
  fastify.get(
    '/courses/:courseId/progress',
    async (request, reply) => {
      const candidateId =
        request.query?.studentUserId ||
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

      const progressRepo = container.resolve('StudentProgressRepository');
      const moduleRepo = container.resolve('LessonModuleRepository');

      const [courseModules, studentProgress] = await Promise.all([
        moduleRepo.findByCourseId(request.params.courseId),
        progressRepo.findByStudent(studentUserId)
      ]);

      const courseModuleIds = new Set(courseModules.map((m) => m.id));
      const completedModules = studentProgress.filter((p) => courseModuleIds.has(p.lessonModuleId) && p.status === 'COMPLETED');
      const completedLessonIds = completedModules.map((p) => p.lessonModuleId);
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

  // Get Student Notes for Lesson Route
  fastify.get(
    '/lessons/:lessonId/notes',
    {
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
      const candidateId =
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'] ||
        request.query?.studentUserId;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

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

  // Save/Update Student Notes for Lesson Route
  fastify.put(
    '/lessons/:lessonId/notes',
    {
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
      const candidateId =
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'] ||
        request.body?.studentUserId;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

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

  // Get Lesson Bookmarks Route
  fastify.get(
    '/lessons/:lessonId/bookmarks',
    {
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
      const candidateId =
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'] ||
        request.query?.studentUserId;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

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

  // Create Lesson Bookmark Route
  fastify.post(
    '/lessons/:lessonId/bookmarks',
    {
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
      const candidateId =
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'] ||
        request.body?.studentUserId;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

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

  // Delete Lesson Bookmark Route
  fastify.delete(
    '/lessons/:lessonId/bookmarks/:bookmarkId',
    {
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
      const candidateId =
        request.user?.userId ||
        request.user?.id ||
        request.user?.sub ||
        request.headers['x-user-id'];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
      const studentUserId = isUuid ? candidateId : '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';

      const useCase = container.resolve('DeleteLessonBookmarkUseCase');
      const result = await useCase.execute({
        bookmarkId: request.params.bookmarkId,
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
