// Placeholder integration and domain events
class UserCreatedEvent {
  constructor(userId, email, occurredAt = new Date()) {
    this.userId = userId;
    this.email = email;
    this.occurredAt = occurredAt;
  }
}

class TenantProvisionedEvent {
  constructor(tenantId, domain, occurredAt = new Date()) {
    this.tenantId = tenantId;
    this.domain = domain;
    this.occurredAt = occurredAt;
  }
}

module.exports = {
  UserCreatedEvent,
  TenantProvisionedEvent
};
