let core;

try {
  core = require('@eos/core');
} catch (e) {
  core = require('../../core/src');
}

module.exports = core;
