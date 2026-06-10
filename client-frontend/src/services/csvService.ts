import Papa from 'papaparse';
import type { Track } from './types';

const CSV_PATH = import.meta.env.VITE_CSV_PATH || '/data/music_files_data.csv';

export async function loadTracksFromCSV(): Promise<Track[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_PATH, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const tracks: Track[] = (results.data as Record<string, unknown>[]).map((row) => ({
          filename: String(row['filename'] || ''),
          title: String(row['title'] || row['filename'] || ''),
          artist: row['artist'] ? String(row['artist']) : undefined,
          album: row['album'] ? String(row['album']) : undefined,
          genre: row['genre'] ? String(row['genre']) : undefined,
          year: row['year'] ? Number(row['year']) : undefined,
          duration: row['duration'] ? Number(row['duration']) : undefined,
          trackNumber: row['trackNumber'] ? Number(row['trackNumber']) : undefined,
          language: row['language'] ? String(row['language']) : undefined,
          bitrate: row['bitrate'] ? Number(row['bitrate']) : undefined,
          sampleRate: row['sampleRate'] ? Number(row['sampleRate']) : undefined,
        }));
        resolve(tracks);
      },
      error: (err) => reject(err),
    });
  });
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
