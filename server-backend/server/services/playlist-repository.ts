import { randomUUID } from 'crypto';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { PlaylistCriteria } from '../config/playlist-types';

export interface PlaylistRow {
  id: string;
  name: string;
  tracks: PlaylistTrackRow[];
  createdAt: string;
  criteria?: PlaylistCriteria;
}

export interface PlaylistTrackRow {
  filename: string;
  title: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  duration?: number;
  trackNumber?: number;
  language?: string;
  bitrate?: number;
  sampleRate?: number;
}

interface PlaylistJoinRow extends RowDataPacket {
  id: string;
  name: string;
  criteria: string | null;
  created_at: Date;
  filename: string | null;
  position: number | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  year: number | null;
  duration: number | null;
  track_number: number | null;
  language: string | null;
  bitrate: number | null;
  sample_rate: number | null;
}

const mapTrackRow = (row: PlaylistJoinRow): PlaylistTrackRow => ({
  filename: row.filename!,
  title: row.title ?? row.filename!,
  artist: row.artist ?? undefined,
  album: row.album ?? undefined,
  genre: row.genre ?? undefined,
  year: row.year ?? undefined,
  duration: row.duration ?? undefined,
  trackNumber: row.track_number ?? undefined,
  language: row.language ?? undefined,
  bitrate: row.bitrate ?? undefined,
  sampleRate: row.sample_rate ?? undefined,
});

const groupPlaylistRows = (rows: PlaylistJoinRow[]): PlaylistRow[] => {
  const map = new Map<string, PlaylistRow>();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        createdAt: new Date(row.created_at).toISOString(),
        criteria: row.criteria ? JSON.parse(row.criteria) : undefined,
        tracks: [],
      });
    }
    if (row.filename) {
      map.get(row.id)!.tracks.push(mapTrackRow(row));
    }
  }

  return [...map.values()];
};

export const getAllPlaylists = async (): Promise<PlaylistRow[]> => {
  const [rows] = await getPool().execute<PlaylistJoinRow[]>(
    `SELECT p.id, p.name, p.criteria, p.created_at,
            pt.filename, pt.position,
            t.title, t.artist, t.album, t.genre, t.year, t.duration,
            t.track_number, t.language, t.bitrate, t.sample_rate
     FROM playlists p
     LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
     LEFT JOIN tracks t ON t.filename = pt.filename
     ORDER BY p.created_at DESC, pt.position ASC`
  );
  return groupPlaylistRows(rows);
};

export const createPlaylist = async (
  name: string,
  filenames: string[],
  criteria?: PlaylistCriteria
): Promise<PlaylistRow> => {
  const id = randomUUID();
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO playlists (id, name, criteria) VALUES (?, ?, ?)',
      [id, name, criteria ? JSON.stringify(criteria) : null]
    );

    for (let i = 0; i < filenames.length; i++) {
      await conn.execute(
        'INSERT INTO playlist_tracks (playlist_id, filename, position) VALUES (?, ?, ?)',
        [id, filenames[i], i]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const playlists = await getAllPlaylists();
  const created = playlists.find((p) => p.id === id);
  if (!created) throw new Error('Playlist creation failed');
  return created;
};

export const renamePlaylist = async (id: string, name: string): Promise<boolean> => {
  const [result] = await getPool().execute<ResultSetHeader>(
    'UPDATE playlists SET name = ? WHERE id = ?',
    [name, id]
  );
  return result.affectedRows > 0;
};

export const deletePlaylist = async (id: string): Promise<boolean> => {
  const [result] = await getPool().execute<ResultSetHeader>(
    'DELETE FROM playlists WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const addTrackToPlaylist = async (
  playlistId: string,
  filename: string
): Promise<boolean> => {
  const pool = getPool();
  const [dup] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM playlist_tracks WHERE playlist_id = ? AND filename = ? LIMIT 1',
    [playlistId, filename]
  );
  if (dup.length > 0) return true;

  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT MAX(position) AS max_pos FROM playlist_tracks WHERE playlist_id = ?',
    [playlistId]
  );
  const position = ((existing[0]?.max_pos as number) ?? -1) + 1;

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO playlist_tracks (playlist_id, filename, position) VALUES (?, ?, ?)',
    [playlistId, filename, position]
  );
  return result.affectedRows > 0;
};

export const removeTrackFromPlaylist = async (
  playlistId: string,
  filename: string
): Promise<boolean> => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [result] = await conn.execute<ResultSetHeader>(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND filename = ?',
      [playlistId, filename]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return false;
    }
    await reorderPositions(conn, playlistId);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const reorderPositions = async (conn: PoolConnection, playlistId: string) => {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id, filename FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    [playlistId]
  );
  for (let i = 0; i < rows.length; i++) {
    await conn.execute('UPDATE playlist_tracks SET position = ? WHERE id = ?', [i, rows[i].id]);
  }
};

export const reorderPlaylistTrack = async (
  playlistId: string,
  fromIndex: number,
  toIndex: number
): Promise<boolean> => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
      [playlistId]
    );
    if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= rows.length) {
      await conn.rollback();
      return false;
    }
    const ids = rows.map((r) => r.id as number);
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);
    for (let i = 0; i < ids.length; i++) {
      await conn.execute('UPDATE playlist_tracks SET position = ? WHERE id = ?', [i, ids[i]]);
    }
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
