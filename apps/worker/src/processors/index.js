const { JOBS } = require('../jobs');

const PROCESSORS = {
  [JOBS.VIDEO_TRANSCODE]: async (payload) => {
    console.log(`[Processor] Transcoding video for lesson ${payload.lessonId}`);
  },
  [JOBS.EMAIL_SEND]: async (payload) => {
    console.log(`[Processor] Dispatching email to ${payload.to}`);
  },
  [JOBS.BILLING_RECURRING]: async (payload) => {
    console.log(`[Processor] Processing recurring billing for tenant ${payload.tenantId}`);
  }
};

module.exports = { PROCESSORS };
