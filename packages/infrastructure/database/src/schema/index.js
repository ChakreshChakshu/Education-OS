const identitySchema = require('./identity.schema');
const academicsSchema = require('./academics.schema');
const learningSchema = require('./learning.schema');
const mediaSchema = require('./media.schema');

module.exports = {
  ...identitySchema,
  ...academicsSchema,
  ...learningSchema,
  ...mediaSchema
};
