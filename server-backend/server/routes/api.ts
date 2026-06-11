import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getAllTracks } from '../services/track-repository';

const router = Router();

const FRONTEND_MUSIC_PATH = path.resolve(
  process.env.FRONTEND_MUSIC_OUTPUT_PATH || '../client-frontend/public/music'
);

// GET /api/music — list all available mp3 files
router.get('/music', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(FRONTEND_MUSIC_PATH)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(FRONTEND_MUSIC_PATH).filter((f) => f.endsWith('.mp3'));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/music/stream/:filename — stream a single mp3
router.get('/music/stream/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(FRONTEND_MUSIC_PATH, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// POST /api/music/download — download a zip of selected files
// Body: { filenames: string[] }
router.post('/music/download', (req: Request, res: Response) => {
  const { filenames }: { filenames: string[] } = req.body;

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: 'filenames array required' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="music.zip"');

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);

  for (const filename of filenames) {
    const filePath = path.join(FRONTEND_MUSIC_PATH, filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: filename });
    }
  }

  archive.finalize();
});

// GET /api/tracks — all track metadata from MySQL
router.get('/tracks', async (_req: Request, res: Response) => {
  try {
    const tracks = await getAllTracks();
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
