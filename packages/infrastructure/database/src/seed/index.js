const { seedDatabase } = require('./seed');
const { seedRbacDefaults, PERMISSIONS, ROLES } = require('./rbac-defaults');

module.exports = { seedDatabase, seedRbacDefaults, PERMISSIONS, ROLES };
