import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from '../config/database';
import { MusicFileMetadata } from '../config/types';

export interface TrackRow {
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

const mapRow = (row: RowDataPacket): TrackRow => ({
  filename: row.filename,
  title: row.title ?? row.filename,
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

export const getExistingFilenames = async (): Promise<Set<string>> => {
  const [rows] = await getPool().execute<RowDataPacket[]>('SELECT filename FROM tracks');
  return new Set(rows.map((r) => r.filename as string));
};

export const insertTrack = async (meta: MusicFileMetadata): Promise<boolean> => {
  const [result] = await getPool().execute<ResultSetHeader>(
    `INSERT INTO tracks
      (filename, title, artist, album, genre, year, duration, track_number, language, bitrate, sample_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      artist = VALUES(artist),
      album = VALUES(album),
      genre = VALUES(genre),
      year = VALUES(year),
      duration = VALUES(duration),
      track_number = VALUES(track_number),
      language = VALUES(language),
      bitrate = VALUES(bitrate),
      sample_rate = VALUES(sample_rate)`,
    [
      meta.filename,
      meta.title ?? meta.filename,
      meta.artist ?? null,
      meta.album ?? null,
      meta.genre ?? null,
      meta.year ?? null,
      meta.duration ?? null,
      meta.trackNumber ?? null,
      meta.language ?? null,
      meta.bitrate ?? null,
      meta.sampleRate ?? null,
    ]
  );
  return result.affectedRows > 0;
};

export const getAllTracks = async (): Promise<TrackRow[]> => {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT * FROM tracks ORDER BY created_at DESC'
  );
  return rows.map(mapRow);
};
