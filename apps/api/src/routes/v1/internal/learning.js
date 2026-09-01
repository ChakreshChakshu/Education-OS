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
}

module.exports = learningRoutes;
