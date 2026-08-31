class DomainEvents {
  static #handlersMap = {};
  static #markedAggregates = [];

  static markAggregateForPublish(aggregate) {
    const aggregateFound = this.findMarkedAggregateByID(aggregate.id);

    if (!aggregateFound) {
      this.#markedAggregates.push(aggregate);
    }
  }

  static dispatchEventsForAggregate(id) {
    const aggregate = this.findMarkedAggregateByID(id);

    if (aggregate) {
      this.dispatchAggregateEvents(aggregate);
      aggregate.clearEvents();
      this.removeMarkedAggregate(aggregate);
    }
  }

  static register(callback, eventClassName) {
    if (!Object.prototype.hasOwnProperty.call(this.#handlersMap, eventClassName)) {
      this.#handlersMap[eventClassName] = [];
    }
    this.#handlersMap[eventClassName].push(callback);
  }

  static clearHandlers() {
    this.#handlersMap = {};
  }

  static clearMarkedAggregates() {
    this.#markedAggregates = [];
  }

  static dispatchAggregateEvents(aggregate) {
    aggregate.domainEvents.forEach((event) => this.dispatch(event));
  }

  static removeMarkedAggregate(aggregate) {
    const index = this.#markedAggregates.findIndex((a) => a.equals(aggregate));
    if (index !== -1) {
      this.#markedAggregates.splice(index, 1);
    }
  }

  static findMarkedAggregateByID(id) {
    return this.#markedAggregates.find((a) => a.id === id) || null;
  }

  static dispatch(event) {
    const eventClassName = event.constructor.name;

    if (Object.prototype.hasOwnProperty.call(this.#handlersMap, eventClassName)) {
      const handlers = this.#handlersMap[eventClassName];
      for (const handler of handlers) {
        handler(event);
      }
    }
  }
}

module.exports = { DomainEvents };
