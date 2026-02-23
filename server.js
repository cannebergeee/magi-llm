import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVote } from './src/magi-llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Static
app.use(express.static(__dirname, {
  etag: true,
  maxAge: '1h'
}));

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.post('/api/vote', async (req, res) => {
  try {
    const { caseText, file, volume, exMode, priority } = req.body || {};
    const result = await createVote({
      caseText: String(caseText || '').trim(),
      file: String(file || 'MAGI_SYS').trim() || 'MAGI_SYS',
      volume: Number.isFinite(+volume) ? +volume : 66,
      exMode: Boolean(exMode),
      priority: String(priority || 'AAA')
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err?.message || 'Internal Server Error' });
  }
});

const port = Number(process.env.PORT || 5173);
app.listen(port, () => {
  console.log(`[magi-llm] http://localhost:${port}`);
});
