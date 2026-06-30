import type { Track } from './types';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';

export async function loadTracksFromCSV(): Promise<Track[]> {
  try {
    const response = await fetch(`${API_URL}/api/metadata`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    
    // Convert database rows to Track format
    const tracks: Track[] = metadata.map((row: any) => ({
      filename: row.filename,
      title: row.title || row.filename,
      artist: row.artist,
      album: row.album,
      genre: row.genre,
      year: row.year,
      duration: row.duration,
      trackNumber: row.track_number,
      language: row.language,
      bitrate: row.bitrate,
      sampleRate: row.sample_rate,
    }));
    
    return tracks;
  } catch (err) {
    console.error('Failed to load tracks from API:', err);
    return [];
  }
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}