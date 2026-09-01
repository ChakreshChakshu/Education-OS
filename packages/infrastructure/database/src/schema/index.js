const identitySchema = require('./identity.schema');
const academicsSchema = require('./academics.schema');
const learningSchema = require('./learning.schema');

module.exports = {
  ...identitySchema,
  ...academicsSchema,
  ...learningSchema
};
