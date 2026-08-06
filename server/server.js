const path = require('path');
const express = require('express');
const pool = require('./db');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

app.post('/api/log', async (req, res) => {
  const { querystring } = req.body;

  if (typeof querystring !== 'string' || querystring.length === 0 || querystring.length > 512) {
    return res.status(400).json({ error: 'invalid querystring' });
  }

  try {
    await pool.query(
      'INSERT INTO search_log (querystring) VALUES (?)',
      [querystring]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('failed to log search:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/api/logs', async (req, res) => {
  if (req.query.key !== process.env.LOG_READ_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, querystring, logged_at FROM search_log ORDER BY logged_at DESC'
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('failed to fetch logs:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});