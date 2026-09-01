try {
  module.exports = require('@eos/domain-identity').domain;
} catch (e) {
  module.exports = require('../../../domains/identity/domain');
}
