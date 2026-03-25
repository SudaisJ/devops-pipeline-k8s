const request = require('supertest');
const app = require('../src/index');

// Mock pg pool so tests don't need a real database
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

const { Pool } = require('pg');
const pool = new Pool();

describe('URL Shortener API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /health', () => {
    it('returns ok when DB is reachable', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns 500 when DB is unreachable', async () => {
      pool.query.mockRejectedValueOnce(new Error('connection refused'));
      const res = await request(app).get('/health');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /shorten', () => {
    it('creates a short URL', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // initDB
        .mockResolvedValueOnce({
          rows: [{ short_code: 'abc12345', original_url: 'https://example.com', created_at: new Date() }],
        });

      const res = await request(app)
        .post('/shorten')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('short_url');
      expect(res.body).toHaveProperty('short_code');
    });

    it('returns 400 for missing url', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/shorten').send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid URL', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/shorten').send({ url: 'not-a-url' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /:code', () => {
    it('redirects to original URL', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] })
        .mockResolvedValueOnce({ rows: [{ original_url: 'https://example.com' }] });

      const res = await request(app).get('/abc12345');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('https://example.com');
    });

    it('returns 404 for unknown code', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/unknown');
      expect(res.status).toBe(404);
    });
  });
});
