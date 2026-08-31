const { Entity } = require('./Entity');

class AggregateRoot extends Entity {
  #domainEvents = [];

  get domainEvents() {
    return [...this.#domainEvents];
  }

  addDomainEvent(domainEvent) {
    this.#domainEvents.push(domainEvent);
    // Optional: Log domain event addition using standard logger interface
  }

  clearEvents() {
    this.#domainEvents = [];
  }
}

module.exports = { AggregateRoot };
