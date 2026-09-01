const crypto = require('crypto');
const { User, Tenant, Organization, UserTenantMembership, OrganizationMembership } = require('../domain-identity-bridge');
const { Course, Batch } = require('../domain-academics-bridge');
const { LessonModule, StudentProgress, QuizSubmission } = require('../domain-learning-bridge');

async function seedDatabase(repos = {}) {
  const {
    userRepository,
    tenantRepository,
    organizationRepository,
    courseRepository,
    batchRepository,
    lessonModuleRepository,
    studentProgressRepository,
    quizSubmissionRepository
  } = repos;

  const results = {
    users: [],
    tenants: [],
    organizations: [],
    courses: [],
    batches: [],
    modules: [],
    progresses: [],
    submissions: []
  };

  // 1. Seed Users
  const adminId = crypto.randomUUID();
  const adminUser = User.create(
    {
      email: 'admin@skillyards.com',
      passwordHash: 'hashed_admin_password_123',
      name: 'System Admin',
      status: 'ACTIVE'
    },
    adminId
  ).getValue();

  const facultyId = crypto.randomUUID();
  const facultyUser = User.create(
    {
      email: 'prof.smith@metropolitan.edu',
      passwordHash: 'hashed_faculty_password_123',
      name: 'Dr. Alan Smith',
      status: 'ACTIVE'
    },
    facultyId
  ).getValue();

  const studentId = crypto.randomUUID();
  const studentUser = User.create(
    {
      email: 'student.alex@metropolitan.edu',
      passwordHash: 'hashed_student_password_123',
      name: 'Alex Johnson',
      status: 'ACTIVE'
    },
    studentId
  ).getValue();

  if (userRepository) {
    await userRepository.save(adminUser);
    await userRepository.save(facultyUser);
    await userRepository.save(studentUser);
  }
  results.users.push(adminUser, facultyUser, studentUser);

  // 2. Seed Tenant Institution
  const tenantId = crypto.randomUUID();
  const tenant = Tenant.create(
    {
      name: 'Metropolitan University',
      slug: 'metropolitan-univ',
      status: 'ACTIVE'
    },
    tenantId
  ).getValue();

  if (tenantRepository) {
    await tenantRepository.save(tenant);
  }
  results.tenants.push(tenant);

  // 3. Seed Branch Organization
  const orgId = crypto.randomUUID();
  const org = Organization.create(
    {
      tenantId: tenant.id,
      name: 'Faculty of Computer Science',
      code: 'CS-DEPT'
    },
    orgId
  ).getValue();

  if (organizationRepository) {
    await organizationRepository.save(org);
  }
  results.organizations.push(org);

  // 4. Seed User Tenant Memberships & Org Memberships
  const adminMembership = UserTenantMembership.create({
    userId: adminUser.id,
    tenantId: tenant.id,
    status: 'ACTIVE'
  }).getValue();

  const facultyOrgMem = OrganizationMembership.create({
    organizationId: org.id,
    userId: facultyUser.id,
    role: 'INSTRUCTOR'
  }).getValue();

  if (tenantRepository && tenantRepository.saveMembership) {
    await tenantRepository.saveMembership(adminMembership);
  }
  if (organizationRepository && organizationRepository.saveMembership) {
    await organizationRepository.saveMembership(facultyOrgMem);
  }

  // 5. Seed Academic Course
  const courseId = crypto.randomUUID();
  const course = Course.create(
    {
      tenantId: tenant.id,
      organizationId: org.id,
      title: 'Introduction to Computer Science',
      code: 'CS-101',
      description: 'Foundations of Computer Science & Algorithmic Thinking',
      credits: 4,
      status: 'PUBLISHED'
    },
    courseId
  ).getValue();

  if (courseRepository) {
    await courseRepository.save(course);
  }
  results.courses.push(course);

  // 6. Seed Batch Cohort
  const batchId = crypto.randomUUID();
  const batch = Batch.create(
    {
      courseId: course.id,
      name: '2026-Fall-Batch-A',
      term: 'FALL-2026',
      capacity: 60,
      instructorUserId: facultyUser.id
    },
    batchId
  ).getValue();

  if (batchRepository) {
    await batchRepository.save(batch);
  }
  results.batches.push(batch);

  // 7. Seed Learning Lesson Modules
  const mod1Id = crypto.randomUUID();
  const mod1 = LessonModule.create(
    {
      courseId: course.id,
      title: 'Module 1: Foundations of Programming',
      contentType: 'VIDEO',
      contentUrl: 'https://cdn.skillyards.com/lessons/cs101-mod1.mp4',
      order: 1
    },
    mod1Id
  ).getValue();

  const mod2Id = crypto.randomUUID();
  const mod2 = LessonModule.create(
    {
      courseId: course.id,
      title: 'Module 2: Object-Oriented Design & Clean Code',
      contentType: 'DOC',
      contentUrl: 'https://cdn.skillyards.com/docs/cs101-mod2.pdf',
      order: 2
    },
    mod2Id
  ).getValue();

  if (lessonModuleRepository) {
    await lessonModuleRepository.save(mod1);
    await lessonModuleRepository.save(mod2);
  }
  results.modules.push(mod1, mod2);

  // 8. Seed Student Progress
  const progressId = crypto.randomUUID();
  const progress = StudentProgress.create(
    {
      studentUserId: studentUser.id,
      batchId: batch.id,
      lessonModuleId: mod1.id,
      status: 'COMPLETED'
    },
    progressId
  ).getValue();

  if (studentProgressRepository) {
    await studentProgressRepository.save(progress);
  }
  results.progresses.push(progress);

  // 9. Seed Quiz Submission
  const submissionId = crypto.randomUUID();
  const submission = QuizSubmission.create(
    {
      studentUserId: studentUser.id,
      lessonModuleId: mod1.id,
      score: 92,
      passingScore: 75
    },
    submissionId
  ).getValue();

  if (quizSubmissionRepository) {
    await quizSubmissionRepository.save(submission);
  }
  results.submissions.push(submission);

  return results;
}

module.exports = { seedDatabase };
