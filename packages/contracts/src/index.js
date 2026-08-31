const api = require('./api');
const dto = require('./dto');
const events = require('./events');

module.exports = {
  ...api,
  ...dto,
  ...events
};
