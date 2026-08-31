class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  register(name, definition, { singleton = true } = {}) {
    this.services.set(name, { definition, singleton });
  }

  resolve(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in container`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        const instance = typeof service.definition === 'function' ? service.definition(this) : service.definition;
        this.singletons.set(name, instance);
      }
      return this.singletons.get(name);
    }

    return typeof service.definition === 'function' ? service.definition(this) : service.definition;
  }
}

const container = new Container();

module.exports = { Container, container };
