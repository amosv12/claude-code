import express from 'express';
import { listPapers } from './db';
import { ingestAll, PAPERS_DIR } from './ingest';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.post('/api/ingest', async (_req, res) => {
  try {
    const result = await ingestAll();
    res.json(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: reason });
  }
});

app.get('/api/papers', (_req, res) => {
  res.json(listPapers());
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] papers directory: ${PAPERS_DIR}`);
});
