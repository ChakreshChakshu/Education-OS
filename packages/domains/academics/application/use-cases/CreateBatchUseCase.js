const { Result } = require('../../core');
const { Batch } = require('../../domain/entities/Batch');

class CreateBatchUseCase {
  constructor({ batchRepository, courseRepository }) {
    this.batchRepository = batchRepository;
    this.courseRepository = courseRepository;
  }

  async execute(dto) {
    const { courseId, name, term, capacity, instructorUserId } = dto;

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      return Result.fail('Target course not found.');
    }

    const batchResult = Batch.create({
      courseId: course.id,
      name,
      term,
      capacity,
      instructorUserId
    });

    if (batchResult.isFailure) {
      return Result.fail(batchResult.error);
    }

    const batch = batchResult.getValue();
    await this.batchRepository.save(batch);

    return Result.ok({
      id: batch.id,
      courseId: batch.courseId,
      name: batch.name,
      term: batch.term ? batch.term.value : null,
      capacity: batch.capacity,
      instructorUserId: batch.instructorUserId,
      status: batch.status
    });
  }
}

module.exports = { CreateBatchUseCase };
