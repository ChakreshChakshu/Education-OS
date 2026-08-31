function registerServices(container) {
  // Register application use cases and repositories here
  container.register('HealthService', () => ({
    getHealth: () => ({ status: 'ok', timestamp: new Date() })
  }));
}

module.exports = { registerServices };
