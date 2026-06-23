import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from '../config/database';
import { MusicFileMetadata } from '../config/types';
import { normalizeMetadata } from './metadata-normalizer';

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

const mapRow = (row: RowDataPacket): TrackRow => {
  const normalized = normalizeMetadata({
    filename: row.filename as string,
    filepath: '',
    title: row.title as string,
    artist: row.artist as string | undefined,
    album: row.album as string | undefined,
    genre: row.genre as string | undefined,
    year: row.year as number | undefined,
    duration: row.duration as number | undefined,
    trackNumber: row.track_number as number | undefined,
    language: row.language as string | undefined,
    bitrate: row.bitrate as number | undefined,
    sampleRate: row.sample_rate as number | undefined,
  });

  return {
    filename: row.filename as string,
    title: normalized.title ?? row.filename,
    artist: normalized.artist,
    album: normalized.album,
    genre: row.genre ?? undefined,
    year: row.year ?? undefined,
    duration: row.duration ?? undefined,
    trackNumber: row.track_number ?? undefined,
    language: row.language ?? undefined,
    bitrate: row.bitrate ?? undefined,
    sampleRate: row.sample_rate ?? undefined,
  };
};

export const insertTrack = async (meta: MusicFileMetadata): Promise<boolean> => {
  const normalized = normalizeMetadata(meta);
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
      normalized.filename,
      normalized.title ?? normalized.filename,
      normalized.artist ?? null,
      normalized.album ?? null,
      normalized.genre ?? null,
      normalized.year ?? null,
      normalized.duration ?? null,
      normalized.trackNumber ?? null,
      normalized.language ?? null,
      normalized.bitrate ?? null,
      normalized.sampleRate ?? null,
    ]
  );
  return result.affectedRows > 0;
};

export const getExistingFilenames = async (): Promise<Set<string>> => {
  const [rows] = await getPool().execute<RowDataPacket[]>('SELECT filename FROM tracks');
  return new Set(rows.map((r) => r.filename as string));
};

export const getAllTracks = async (): Promise<TrackRow[]> => {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT * FROM tracks ORDER BY created_at DESC'
  );
  return rows.map(mapRow);
};
