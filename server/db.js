const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'tools.db.svc.wikimedia.cloud',
  user: process.env.TOOL_TOOLSDB_USER,
  password: process.env.TOOL_TOOLSDB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

module.exports = pool;