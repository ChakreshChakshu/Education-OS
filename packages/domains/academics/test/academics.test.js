const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { CourseCode, AcademicTerm, Course, Batch } = require('../domain');
const { CreateCourseUseCase, CreateBatchUseCase } = require('../application');

// In-Memory Course Repository Mock
class MockCourseRepository {
  constructor() {
    this.courses = new Map();
  }

  async findById(id) {
    return this.courses.get(id) || null;
  }

  async findByCode(tenantId, codeStr) {
    for (const course of this.courses.values()) {
      if (course.tenantId === tenantId && course.code.value === codeStr.toUpperCase()) {
        return course;
      }
    }
    return null;
  }

  async save(course) {
    this.courses.set(course.id, course);
    return course;
  }
}

// In-Memory Batch Repository Mock
class MockBatchRepository {
  constructor() {
    this.batches = new Map();
  }

  async findById(id) {
    return this.batches.get(id) || null;
  }

  async findByCourseId(courseId) {
    const res = [];
    for (const batch of this.batches.values()) {
      if (batch.courseId === courseId) res.push(batch);
    }
    return res;
  }

  async save(batch) {
    this.batches.set(batch.id, batch);
    return batch;
  }
}

test('CourseCode ValueObject validates and normalizes format', () => {
  const valid = CourseCode.create('cs-101');
  assert.equal(valid.isSuccess, true);
  assert.equal(valid.getValue().value, 'CS-101');

  const invalid = CourseCode.create('a');
  assert.equal(invalid.isFailure, true);
});

test('AcademicTerm ValueObject validates term structure', () => {
  const valid = AcademicTerm.create('fall-2026');
  assert.equal(valid.isSuccess, true);
  assert.equal(valid.getValue().value, 'FALL-2026');

  const invalid = AcademicTerm.create('hi');
  assert.equal(invalid.isFailure, true);
});

test('CreateCourseUseCase provisions new course successfully', async () => {
  const courseRepository = new MockCourseRepository();
  const useCase = new CreateCourseUseCase({ courseRepository });

  const tenantId = crypto.randomUUID();
  const result = await useCase.execute({
    tenantId,
    title: 'Data Structures & Algorithms',
    code: 'CS-201',
    description: 'Core DSA curriculum',
    credits: 4
  });

  assert.equal(result.isSuccess, true);
  const data = result.getValue();
  assert.equal(data.title, 'Data Structures & Algorithms');
  assert.equal(data.code, 'CS-201');
  assert.equal(data.credits, 4);
  assert.equal(data.status, 'DRAFT');

  // Verify duplicate code check
  const duplicateResult = await useCase.execute({
    tenantId,
    title: 'Advanced Algorithms',
    code: 'CS-201'
  });
  assert.equal(duplicateResult.isFailure, true);
});

test('CreateBatchUseCase provisions cohort and assigns instructor', async () => {
  const courseRepository = new MockCourseRepository();
  const batchRepository = new MockBatchRepository();
  const tenantId = crypto.randomUUID();
  const instructorId = crypto.randomUUID();

  // Create course first
  const courseRes = Course.create({
    tenantId,
    title: 'Computer Architecture',
    code: 'CS-301'
  }).getValue();
  await courseRepository.save(courseRes);

  const useCase = new CreateBatchUseCase({ batchRepository, courseRepository });

  const result = await useCase.execute({
    courseId: courseRes.id,
    name: '2026-Fall-Batch-A',
    term: 'FALL-2026',
    capacity: 60,
    instructorUserId: instructorId
  });

  assert.equal(result.isSuccess, true);
  const data = result.getValue();
  assert.equal(data.name, '2026-Fall-Batch-A');
  assert.equal(data.term, 'FALL-2026');
  assert.equal(data.capacity, 60);
  assert.equal(data.instructorUserId, instructorId);
});
