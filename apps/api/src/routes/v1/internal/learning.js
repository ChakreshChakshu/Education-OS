async function learningRoutes(fastify, options) {
  const container = options.container;

  // Mark Lesson Complete Route
  fastify.post(
    '/lessons/complete',
    {
      schema: {
        body: {
          type: 'object',
          required: ['studentUserId', 'lessonModuleId'],
          properties: {
            studentUserId: { type: 'string', format: 'uuid' },
            batchId: { type: 'string', format: 'uuid' },
            lessonModuleId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('MarkLessonCompleteUseCase');
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

  // Submit Quiz Assessment Route
  fastify.post(
    '/quizzes/submit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['studentUserId', 'lessonModuleId', 'score'],
          properties: {
            studentUserId: { type: 'string', format: 'uuid' },
            lessonModuleId: { type: 'string', format: 'uuid' },
            score: { type: 'number', minimum: 0, maximum: 100 },
            passingScore: { type: 'number', minimum: 0, maximum: 100 }
          }
        }
      }
    },
    async (request, reply) => {
      const useCase = container.resolve('SubmitQuizUseCase');
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
}

module.exports = learningRoutes;
