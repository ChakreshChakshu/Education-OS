# Academic Bounded Context (`@eos/domain-academics`)

Governs educational course structures, version control, curriculum organization, modules, and individual lessons.

## Domain Entities & Aggregates
- **Course:** Master catalog entry.
- **Category:** Classification taxonomy.
- **CourseVersion:** Immutable versioned draft/published course state.
- **Curriculum:** Structural modules and sections.
- **Lesson:** Individual learning node (video, document, quiz reference).

## Layers
- `domain/`: Entities, Value Objects, Domain Events, Repository Interfaces.
- `application/`: Application Use Cases (e.g. `CreateCourse`, `PublishCourseVersion`).
- `infrastructure/`: Drizzle Repository Implementations.
- `presentation/`: Fastify Controller Endpoints & Validation Schemas.
