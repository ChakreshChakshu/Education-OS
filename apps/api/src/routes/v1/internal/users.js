async function usersRoutes(fastify, options) {
  const container = options.container;

  // Get current user profile details
  fastify.get('/profile', async (request, reply) => {
    const userId = request.user.userId || request.user.sub;
    const userRepo = container.resolve('UserRepository');
    const user = await userRepo.findById(userId);

    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : user.email.value,
        name: user.name,
        phone: user.phone || null,
        timezone: user.timezone || 'UTC',
        language: user.language || 'en',
        avatar: user.avatar || null,
        status: user.status
      }
    };
  });

  // Update current user profile
  fastify.route({
    method: ['PATCH', 'PUT'],
    url: '/profile',
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          phone: { type: 'string' },
          timezone: { type: 'string' },
          language: { type: 'string' },
          avatar: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      const userId = request.user.userId || request.user.sub;
      const useCase = container.resolve('UpdateUserProfileUseCase');
      const result = await useCase.execute({
        userId,
        name: request.body.name,
        phone: request.body.phone,
        timezone: request.body.timezone,
        language: request.body.language,
        avatar: request.body.avatar
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
  });

  // Change password
  fastify.post(
    '/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 8 }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.userId || request.user.sub;
      const useCase = container.resolve('ChangePasswordUseCase');
      const result = await useCase.execute({
        userId,
        currentPassword: request.body.currentPassword,
        newPassword: request.body.newPassword
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

module.exports = usersRoutes;
