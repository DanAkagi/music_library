import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getAllTracks, updateTrackGenre } from '../services/track-repository';
import {
  getAllPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTrack,
} from '../services/playlist-repository';

const router = Router();

const FRONTEND_MUSIC_PATH = path.resolve(
  process.env.FRONTEND_MUSIC_OUTPUT_PATH || '../client-frontend/public/music'
);

// GET /api/music/stream/:filename — stream a single mp3 (Range / seeking)
router.get('/music/stream/:filename', (req: Request, res: Response) => {
  const raw = req.params.filename;
  let filename: string;
  try {
    filename = decodeURIComponent(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

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
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
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

const parseTrackFilename = (raw: string): string | null => {
  let filename: string;
  try {
    filename = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  return filename;
};

// PATCH /api/tracks/:filename — body: { genre }
router.patch('/tracks/:filename', async (req: Request, res: Response) => {
  const filename = parseTrackFilename(req.params.filename);
  if (!filename) return res.status(400).json({ error: 'Invalid filename' });

  const { genre } = req.body as { genre?: unknown };
  if (typeof genre !== 'string') {
    return res.status(400).json({ error: 'genre string required' });
  }

  const normalized = genre.trim() || null;

  try {
    const track = await updateTrackGenre(filename, normalized);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ track });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/playlists
router.get('/playlists', async (_req: Request, res: Response) => {
  try {
    const playlists = await getAllPlaylists();
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists — body: { name, tracks: [{ filename }], criteria? }
router.post('/playlists', async (req: Request, res: Response) => {
  const { name, tracks, criteria } = req.body as {
    name?: string;
    tracks?: { filename: string }[];
    criteria?: unknown;
  };

  if (!name?.trim() || !Array.isArray(tracks)) {
    return res.status(400).json({ error: 'name and tracks array required' });
  }

  try {
    const filenames = tracks.map((t) => t.filename).filter(Boolean);
    const playlist = await createPlaylist(name.trim(), filenames, criteria as never);
    res.status(201).json({ playlist });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/playlists/:id — body: { name }
router.patch('/playlists/:id', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  try {
    const ok = await renamePlaylist(req.params.id, name.trim());
    if (!ok) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id
router.delete('/playlists/:id', async (req: Request, res: Response) => {
  try {
    const ok = await deletePlaylist(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists/:id/tracks — body: { filename }
router.post('/playlists/:id/tracks', async (req: Request, res: Response) => {
  const { filename } = req.body as { filename?: string };
  if (!filename) return res.status(400).json({ error: 'filename required' });

  try {
    const ok = await addTrackToPlaylist(req.params.id, filename);
    if (!ok) return res.status(404).json({ error: 'Could not add track' });
    const playlists = await getAllPlaylists();
    const playlist = playlists.find((p) => p.id === req.params.id);
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id/tracks/:filename
router.delete('/playlists/:id/tracks/:filename', async (req: Request, res: Response) => {
  try {
    const ok = await removeTrackFromPlaylist(req.params.id, decodeURIComponent(req.params.filename));
    if (!ok) return res.status(404).json({ error: 'Track not found in playlist' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/playlists/:id/reorder — body: { fromIndex, toIndex }
router.patch('/playlists/:id/reorder', async (req: Request, res: Response) => {
  const { fromIndex, toIndex } = req.body as { fromIndex?: number; toIndex?: number };
  if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') {
    return res.status(400).json({ error: 'fromIndex and toIndex required' });
  }

  try {
    const ok = await reorderPlaylistTrack(req.params.id, fromIndex, toIndex);
    if (!ok) return res.status(400).json({ error: 'Invalid reorder' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
