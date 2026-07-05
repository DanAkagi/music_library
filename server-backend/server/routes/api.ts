import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getAllTracks, updateTrackGenre } from '../services/track-repository';
import {
  getPlaylistsByUser,
  createPlaylist,
  mergePlaylists,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTrack,
} from '../services/playlist-repository';
import { createUser, findUserByUsername, findUserById, verifyPassword } from '../services/user-repository';
import { requireAuth, signToken } from '../middleware/auth';

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

// ── Auth (public) ──

router.post('/auth/register', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const existing = await findUserByUsername(username);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const user = await createUser(username, password);
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    const row = await findUserByUsername(username);
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = { id: row.id, username: row.username };
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/tracks — bibliothèque commune (public)
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

// GET /api/playlists — playlists de l'utilisateur connecté
router.get('/playlists', requireAuth, async (req: Request, res: Response) => {
  try {
    const playlists = await getPlaylistsByUser(req.user!.id);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists — body: { name, tracks: [{ filename }], criteria? }
router.post('/playlists', requireAuth, async (req: Request, res: Response) => {
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
    const playlist = await createPlaylist(req.user!.id, name.trim(), filenames, criteria as never);
    res.status(201).json({ playlist });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists/merge — body: { name, playlistIds: string[] }
router.post('/playlists/merge', requireAuth, async (req: Request, res: Response) => {
  const { name, playlistIds } = req.body as { name?: string; playlistIds?: string[] };

  if (!name?.trim() || !Array.isArray(playlistIds) || playlistIds.length < 2) {
    return res.status(400).json({ error: 'name and at least 2 playlistIds required' });
  }

  try {
    const playlist = await mergePlaylists(req.user!.id, name.trim(), playlistIds);
    if (!playlist) return res.status(400).json({ error: 'Could not merge playlists' });
    res.status(201).json({ playlist });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/playlists/:id — body: { name }
router.patch('/playlists/:id', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  try {
    const ok = await renamePlaylist(req.params.id, req.user!.id, name.trim());
    if (!ok) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id
router.delete('/playlists/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const ok = await deletePlaylist(req.params.id, req.user!.id);
    if (!ok) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/playlists/:id/tracks — body: { filename }
router.post('/playlists/:id/tracks', requireAuth, async (req: Request, res: Response) => {
  const { filename } = req.body as { filename?: string };
  if (!filename) return res.status(400).json({ error: 'filename required' });

  try {
    const playlist = await addTrackToPlaylist(req.params.id, req.user!.id, filename);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/playlists/:id/tracks/:filename
router.delete('/playlists/:id/tracks/:filename', requireAuth, async (req: Request, res: Response) => {
  try {
    const ok = await removeTrackFromPlaylist(
      req.params.id,
      req.user!.id,
      decodeURIComponent(req.params.filename)
    );
    if (!ok) return res.status(404).json({ error: 'Track not found in playlist' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/playlists/:id/reorder — body: { fromIndex, toIndex }
router.patch('/playlists/:id/reorder', requireAuth, async (req: Request, res: Response) => {
  const { fromIndex, toIndex } = req.body as { fromIndex?: number; toIndex?: number };
  if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') {
    return res.status(400).json({ error: 'fromIndex and toIndex required' });
  }

  try {
    const ok = await reorderPlaylistTrack(req.params.id, req.user!.id, fromIndex, toIndex);
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
