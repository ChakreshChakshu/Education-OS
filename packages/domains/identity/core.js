try {
  module.exports = require('@eos/core');
} catch (e) {
  module.exports = require('../../core/src');
}
