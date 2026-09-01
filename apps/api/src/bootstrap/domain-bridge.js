let identityDomain, academicsDomain, learningDomain, mediaDomain, infraDatabase, infraStorage;

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
  mediaDomain = require('@eos/domain-media');
} catch (e) {
  mediaDomain = require('../../../../packages/domains/media');
}

try {
  infraDatabase = require('@eos/infra-database');
} catch (e) {
  infraDatabase = require('../../../../packages/infrastructure/database/src');
}

try {
  infraStorage = require('@eos/infra-storage');
} catch (e) {
  infraStorage = require('../../../../packages/infrastructure/storage/src');
}

module.exports = {
  identityDomain,
  academicsDomain,
  learningDomain,
  mediaDomain,
  infraDatabase,
  infraStorage
};
