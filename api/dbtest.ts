import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { pool } = await import('../server/db');
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as ok');
    client.release();
    res.json({ db: 'connected', row: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ db: 'failed', error: err.message, stack: err.stack?.slice(0, 300) });
  }
}
