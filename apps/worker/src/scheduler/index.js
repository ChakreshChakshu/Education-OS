// Cron/interval-based task schedules
function startScheduler() {
  console.log('[Scheduler] Scheduling service initialized');
  
  // Mock daily billing run
  setInterval(() => {
    console.log('[Scheduler] Enqueuing billing.recurring job');
  }, 24 * 60 * 60 * 1000); // 24 hours
}

module.exports = { startScheduler };
