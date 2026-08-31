/**
 * @eos/domain-identity
 * Identity & Tenancy Bounded Context
 * Governs Users, Tenants, Organizations, Memberships, Roles, and Permissions.
 */

module.exports = {
  domain: require('./domain'),
  application: require('./application'),
  infrastructure: require('./infrastructure'),
  presentation: require('./presentation')
};
