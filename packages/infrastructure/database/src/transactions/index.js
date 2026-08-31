// Transaction runner helper enforcing "One Use Case = One Transaction"
async function executeTransaction(db, callback) {
  // Mock transaction wrapper
  console.log('[DatabaseTransaction] Beginning database transaction...');
  try {
    const result = await callback(db);
    console.log('[DatabaseTransaction] Committing transaction.');
    return result;
  } catch (error) {
    console.error('[DatabaseTransaction] Rolling back transaction due to error:', error);
    throw error;
  }
}

module.exports = { executeTransaction };
