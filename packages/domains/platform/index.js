/**
 * @eos/domain-platform
 * Platform Services Bounded Context
 * Governs Notifications, Billing, Organization Branding, Analytics, and Audit Logs.
 */

module.exports = {
  domain: require('./domain'),
  application: require('./application'),
  infrastructure: require('./infrastructure'),
  presentation: require('./presentation')
};
