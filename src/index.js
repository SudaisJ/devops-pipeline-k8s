const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static('src/public'));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'urlshortener',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS urls (
      id SERIAL PRIMARY KEY,
      original_url TEXT NOT NULL,
      short_code VARCHAR(10) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      clicks INTEGER DEFAULT 0
    )
  `);
}

// Health check — Kubernetes liveness/readiness probe hits this
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Shorten a URL
app.post('/shorten', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'invalid URL format' });
  }

  const shortCode = crypto.randomBytes(4).toString('hex');

  try {
    const result = await pool.query(
      'INSERT INTO urls (original_url, short_code) VALUES ($1, $2) RETURNING *',
      [url, shortCode]
    );
    const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.status(201).json({
      short_url: `${base}/${shortCode}`,
      short_code: shortCode,
      original_url: url,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats — MUST be before /:code wildcard
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM urls WHERE short_code = $1',
      [code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Redirect — wildcard ALWAYS last
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1 RETURNING original_url',
      [code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'URL not found' });
    res.redirect(301, result.rows[0].original_url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guard: only start server when run directly, not when imported by tests
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = app;