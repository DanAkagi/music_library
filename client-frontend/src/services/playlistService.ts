import axios from 'axios';
import type { Playlist, PlaylistCriteria, Track } from './types';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';

export async function loadPlaylists(): Promise<Playlist[]> {
  const { data } = await axios.get<{ playlists: Playlist[] }>(`${API_URL}/api/playlists`);
  return data.playlists;
}

export async function createPlaylistApi(
  name: string,
  tracks: Track[],
  criteria?: PlaylistCriteria
): Promise<Playlist> {
  const { data } = await axios.post<{ playlist: Playlist }>(`${API_URL}/api/playlists`, {
    name,
    tracks: tracks.map((t) => ({ filename: t.filename })),
    criteria,
  });
  return data.playlist;
}

export async function renamePlaylistApi(id: string, name: string): Promise<void> {
  await axios.patch(`${API_URL}/api/playlists/${id}`, { name });
}

export async function deletePlaylistApi(id: string): Promise<void> {
  await axios.delete(`${API_URL}/api/playlists/${id}`);
}

export async function addTrackToPlaylistApi(id: string, track: Track): Promise<Playlist> {
  const { data } = await axios.post<{ playlist: Playlist }>(
    `${API_URL}/api/playlists/${id}/tracks`,
    { filename: track.filename }
  );
  return data.playlist;
}

export async function removeTrackFromPlaylistApi(id: string, filename: string): Promise<void> {
  await axios.delete(`${API_URL}/api/playlists/${id}/tracks/${encodeURIComponent(filename)}`);
}

export async function reorderPlaylistTrackApi(
  id: string,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  await axios.patch(`${API_URL}/api/playlists/${id}/reorder`, { fromIndex, toIndex });
}

/** Ancienne clé localStorage — à supprimer après migration */
export const LEGACY_PLAYLIST_STORAGE_KEY = 'music_library_playlists';

export function clearLegacyPlaylistStorage(): void {
  localStorage.removeItem(LEGACY_PLAYLIST_STORAGE_KEY);
}
