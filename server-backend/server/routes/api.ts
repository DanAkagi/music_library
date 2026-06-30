import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getAllMetadata, getMusicFiles, addToBlacklist, removeFromBlacklist, getBlacklist, updateMetadata, removeBlacklistedMetadata } from '../config/database';

const router = Router();

const VAULT_PATH = path.resolve(
  process.env.VAULT || './vault'
);

// GET /api/music — list all available mp3 files
router.get('/music', async (_req: Request, res: Response) => {
  try {
    const files = await getMusicFiles();
    const filenames = files.map(f => path.basename(f));
    res.json({ files: filenames });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/music/stream/:filename — stream a single mp3
router.get('/music/stream/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(VAULT_PATH, filename);

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
    const filePath = path.join(VAULT_PATH, filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: filename });
    }
  }

  archive.finalize();
});

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/metadata — get all metadata from database
router.get('/metadata', async (_req: Request, res: Response) => {
  try {
    const metadata = await getAllMetadata();
    res.json(metadata);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/metadata/:filename — update metadata fields (artist, genre, language)
router.put('/metadata/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const { artist, genre, language }: { artist?: string; genre?: string; language?: string } = req.body;

  try {
    await updateMetadata(filename, { artist, genre, language });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/blacklist — get all blacklist entries
router.get('/blacklist', async (_req: Request, res: Response) => {
  try {
    const blacklist = await getBlacklist();
    res.json(blacklist);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/blacklist — add entry to blacklist
// Body: { value: string, type_meta: string }
router.post('/blacklist', async (req: Request, res: Response) => {
  const { value, type_meta }: { value: string; type_meta: string } = req.body;

  if (!value || !type_meta) {
    return res.status(400).json({ error: 'value and type_meta are required' });
  }

  if (!['artist', 'genre', 'language'].includes(type_meta.toLowerCase())) {
    return res.status(400).json({ error: 'type_meta must be artist, genre, or language' });
  }

  try {
    const id = await addToBlacklist(value, type_meta.toLowerCase());
    res.json({ id, value, type_meta: type_meta.toLowerCase() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/blacklist/:id — remove entry from blacklist
router.delete('/blacklist/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await removeFromBlacklist(parseInt(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/cleanup-blacklist — remove blacklisted entries from metadata
router.post('/cleanup-blacklist', async (_req: Request, res: Response) => {
  try {
    const count = await removeBlacklistedMetadata();
    res.json({ success: true, removed: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
