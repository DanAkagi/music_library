import { randomUUID } from 'crypto';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { PlaylistCriteria } from '../config/types';

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

const playlistQuery = `
  SELECT p.id, p.name, p.criteria, p.created_at,
         pt.filename, pt.position,
         t.title, t.artist, t.album, t.genre, t.year, t.duration,
         t.track_number, t.language, t.bitrate, t.sample_rate
  FROM playlists p
  LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
  LEFT JOIN tracks t ON t.filename = pt.filename
  WHERE p.user_id = ?
  ORDER BY p.created_at DESC, pt.position ASC
`;

export const getPlaylistsByUser = async (userId: number): Promise<PlaylistRow[]> => {
  const [rows] = await getPool().execute<PlaylistJoinRow[]>(playlistQuery, [userId]);
  return groupPlaylistRows(rows);
};

const getPlaylistById = async (id: string, userId: number): Promise<PlaylistRow | null> => {
  const playlists = await getPlaylistsByUser(userId);
  return playlists.find((p) => p.id === id) ?? null;
};

const playlistBelongsToUser = async (playlistId: string, userId: number): Promise<boolean> => {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT 1 FROM playlists WHERE id = ? AND user_id = ? LIMIT 1',
    [playlistId, userId]
  );
  return rows.length > 0;
};

export const createPlaylist = async (
  userId: number,
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
      'INSERT INTO playlists (id, user_id, name, criteria) VALUES (?, ?, ?, ?)',
      [id, userId, name, criteria ? JSON.stringify(criteria) : null]
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

  const created = await getPlaylistById(id, userId);
  if (!created) throw new Error('Playlist creation failed');
  return created;
};

export const mergePlaylists = async (
  userId: number,
  name: string,
  playlistIds: string[]
): Promise<PlaylistRow | null> => {
  const uniqueIds = [...new Set(playlistIds)];
  if (uniqueIds.length < 2) return null;

  const allPlaylists = await getPlaylistsByUser(userId);
  const selected = uniqueIds
    .map((id) => allPlaylists.find((p) => p.id === id))
    .filter((p): p is PlaylistRow => p != null);

  if (selected.length < 2) return null;

  const seen = new Set<string>();
  const filenames: string[] = [];
  for (const pl of selected) {
    for (const track of pl.tracks) {
      if (!seen.has(track.filename)) {
        seen.add(track.filename);
        filenames.push(track.filename);
      }
    }
  }

  return createPlaylist(userId, name, filenames);
};

export const renamePlaylist = async (
  id: string,
  userId: number,
  name: string
): Promise<boolean> => {
  const [result] = await getPool().execute<ResultSetHeader>(
    'UPDATE playlists SET name = ? WHERE id = ? AND user_id = ?',
    [name, id, userId]
  );
  return result.affectedRows > 0;
};

export const deletePlaylist = async (id: string, userId: number): Promise<boolean> => {
  const [result] = await getPool().execute<ResultSetHeader>(
    'DELETE FROM playlists WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
};

export const addTrackToPlaylist = async (
  playlistId: string,
  userId: number,
  filename: string
): Promise<PlaylistRow | null> => {
  if (!(await playlistBelongsToUser(playlistId, userId))) return null;

  const pool = getPool();
  const [dup] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM playlist_tracks WHERE playlist_id = ? AND filename = ? LIMIT 1',
    [playlistId, filename]
  );
  if (dup.length > 0) return getPlaylistById(playlistId, userId);

  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT MAX(position) AS max_pos FROM playlist_tracks WHERE playlist_id = ?',
    [playlistId]
  );
  const position = ((existing[0]?.max_pos as number) ?? -1) + 1;

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO playlist_tracks (playlist_id, filename, position) VALUES (?, ?, ?)',
    [playlistId, filename, position]
  );
  if (result.affectedRows === 0) return null;
  return getPlaylistById(playlistId, userId);
};

export const removeTrackFromPlaylist = async (
  playlistId: string,
  userId: number,
  filename: string
): Promise<boolean> => {
  if (!(await playlistBelongsToUser(playlistId, userId))) return false;

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
  userId: number,
  fromIndex: number,
  toIndex: number
): Promise<boolean> => {
  if (!(await playlistBelongsToUser(playlistId, userId))) return false;

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
