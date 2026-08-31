# Identity & Tenancy Bounded Context (`@eos/domain-identity`)

Governs system authentication, multi-tenant scoping, organization management, role-based access control (RBAC), and permission grants.

## Domain Entities & Aggregates
- **User:** Global identity platform account.
- **Tenant:** SaaS isolation boundary.
- **Organization:** Sub-unit entity inside a tenant.
- **UserTenantMembership:** Decoupled tenant gateway access model.
- **OrganizationMembership:** Organization-level role assignment.

## Layers
- `domain/`: Entities, Value Objects, Domain Events, Repository Interfaces.
- `application/`: Application Use Cases (e.g. `RegisterUser`, `CreateOrganization`).
- `infrastructure/`: Drizzle Repository Implementations.
- `presentation/`: Fastify Controller Endpoints & Validation Schemas.
