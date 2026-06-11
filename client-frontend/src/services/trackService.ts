import axios from 'axios';
import type { Track } from './types';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';

export async function loadTracks(): Promise<Track[]> {
  const { data } = await axios.get<{ tracks: Track[] }>(`${API_URL}/api/tracks`);
  return data.tracks;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
