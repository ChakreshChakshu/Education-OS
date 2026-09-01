let identityDomain, infraDatabase;

try {
  identityDomain = require('@eos/domain-identity');
} catch (e) {
  identityDomain = require('../../../../packages/domains/identity');
}

try {
  infraDatabase = require('@eos/infra-database');
} catch (e) {
  infraDatabase = require('../../../../packages/infrastructure/database/src');
}

module.exports = {
  identityDomain,
  infraDatabase
};
