let identityDomain, academicsDomain, learningDomain, infraDatabase;

try {
  identityDomain = require('@eos/domain-identity');
} catch (e) {
  identityDomain = require('../../../../packages/domains/identity');
}

try {
  academicsDomain = require('@eos/domain-academics');
} catch (e) {
  academicsDomain = require('../../../../packages/domains/academics');
}

try {
  learningDomain = require('@eos/domain-learning');
} catch (e) {
  learningDomain = require('../../../../packages/domains/learning');
}

try {
  infraDatabase = require('@eos/infra-database');
} catch (e) {
  infraDatabase = require('../../../../packages/infrastructure/database/src');
}

module.exports = {
  identityDomain,
  academicsDomain,
  learningDomain,
  infraDatabase
};
