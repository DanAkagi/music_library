import Papa from 'papaparse';
import type { Track } from './types';

const CSV_PATH = import.meta.env.VITE_CSV_PATH || '/data/music_files_data.csv';

// Must match the column order written by sender-api.ts
const COLUMNS = ['filename','title','artist','album','genre','year','duration','trackNumber','language','bitrate','sampleRate'];

export async function loadTracksFromCSV(): Promise<Track[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_PATH, {
      download: true,
      header: false,        // we manage headers manually to avoid duplicate-header bugs
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data as unknown[][];

        // Detect whether the first row is a header (first cell is literally "filename")
        let dataRows = rows;
        if (rows.length > 0 && (rows[0] as unknown[])[0] === 'filename') {
          dataRows = rows.slice(1);
        }

        const tracks: Track[] = dataRows.map((row) => {
          const get = (col: string) => {
            const idx = COLUMNS.indexOf(col);
            return idx !== -1 ? (row as unknown[])[idx] : undefined;
          };
          return {
            filename: String(get('filename') ?? ''),
            title: String(get('title') ?? get('filename') ?? ''),
            artist: get('artist') ? String(get('artist')) : undefined,
            album: get('album') ? String(get('album')) : undefined,
            genre: get('genre') ? String(get('genre')) : undefined,
            year: get('year') ? Number(get('year')) : undefined,
            duration: get('duration') ? Number(get('duration')) : undefined,
            trackNumber: get('trackNumber') ? Number(get('trackNumber')) : undefined,
            language: get('language') ? String(get('language')) : undefined,
            bitrate: get('bitrate') ? Number(get('bitrate')) : undefined,
            sampleRate: get('sampleRate') ? Number(get('sampleRate')) : undefined,
          };
        });

        // Deduplicate by filename (keep last occurrence — most recent backend run)
        const seen = new Map<string, Track>();
        for (const t of tracks) seen.set(t.filename, t);

        resolve([...seen.values()]);
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