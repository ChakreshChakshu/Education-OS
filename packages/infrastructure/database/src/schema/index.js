const identitySchema = require('./identity.schema');

module.exports = {
  schema: {
    ...identitySchema
  },
  ...identitySchema
};
