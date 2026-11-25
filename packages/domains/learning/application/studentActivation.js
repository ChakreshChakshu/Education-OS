const { createHash } = require('node:crypto');

const STUDENT_ACTIVATION_TYPE = 'student_activation_v2';

function activationPasswordHash(nonce) {
  return 'pending_student_activation:' + createHash('sha256').update(nonce).digest('hex');
}

module.exports = { STUDENT_ACTIVATION_TYPE, activationPasswordHash };
