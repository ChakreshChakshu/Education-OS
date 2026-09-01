const identitySchema = require('./identity.schema');
const academicsSchema = require('./academics.schema');

module.exports = {
  ...identitySchema,
  ...academicsSchema
};
