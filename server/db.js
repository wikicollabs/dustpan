const fs = require('fs');
const os = require('os');
const path = require('path');
const mysql = require('mysql2/promise');

function readCredentials() {
  const cnfPath = path.join(os.homedir(), 'replica.my.cnf');

  try {
    const raw = fs.readFileSync(cnfPath, 'utf8');
    const user = raw.match(/user\s*=\s*(.+)/)[1].trim();
    const password = raw.match(/password\s*=\s*(.+)/)[1].trim();
    return { user, password };
  } catch (err) {
    console.warn('replica.my.cnf not found, DB features will not work locally.');
    return { user: null, password: null };
  }
}

const { user, password } = readCredentials();

const pool = mysql.createPool({
  host: 'tools.db.svc.wikimedia.cloud',
  user,
  password,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

module.exports = pool;