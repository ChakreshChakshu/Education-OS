# Platform Services Bounded Context (`@eos/domain-platform`)

Governs system notifications, user preferences, billing subscriptions, tenant branding, analytics aggregation, and immutable compliance audit logs.

## Domain Entities & Aggregates
- **Notification & NotificationDelivery:** Unified multi-channel message events and delivery tracking.
- **UserNotificationPreference:** User category/channel settings matrix.
- **OrganizationBranding:** Custom domain and UI branding.
- **AuditLog:** Security audit event log (`audit_logs`).

## Layers
- `domain/`: Entities, Value Objects, Domain Events, Repository Interfaces.
- `application/`: Application Use Cases (e.g. `DispatchNotification`, `LogAuditEvent`).
- `infrastructure/`: MailProvider & Analytics Adapters.
- `presentation/`: Fastify Controller Endpoints & Validation Schemas.
