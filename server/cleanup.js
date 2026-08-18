const pool = require('./db');

async function deleteOldSelections() {
  try {
    const [result] = await pool.query(
      'DELETE FROM selection_log WHERE logged_at < NOW() - INTERVAL 90 DAY'
    );
    console.log(`deleted ${result.affectedRows} selection log row(s) older than 90 days`);
    process.exit(0);
  } catch (err) {
    console.error('failed to delete old selection log rows:', err);
    process.exit(1);
  }
}

deleteOldSelections();