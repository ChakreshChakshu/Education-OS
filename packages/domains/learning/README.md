# Learning & Assessment Bounded Context (`@eos/domain-learning`)

Governs student course offerings, enrollments, lesson progress tracking, assessment executions (quizzes/exams), and certificate issuance.

## Domain Entities & Aggregates
- **CourseOffering:** Scheduled or self-paced course execution instance.
- **Enrollment:** Student registration history.
- **LessonProgress:** Atomic lesson completion state.
- **Assessment & Question:** Versioned exam questions and polymorphic attachment targets.
- **AssessmentAttempt & AttemptAnswer:** Immutable student exam submissions.
- **Certificate:** Issued academic credential.

## Layers
- `domain/`: Entities, Value Objects, Domain Events, Repository Interfaces.
- `application/`: Application Use Cases (e.g. `EnrollStudent`, `SubmitAssessmentAttempt`).
- `infrastructure/`: Drizzle Repository Implementations.
- `presentation/`: Fastify Controller Endpoints & Validation Schemas.
