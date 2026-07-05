import { http } from './http';
import type { Playlist, PlaylistCriteria, Track } from './types';

export async function loadPlaylists(): Promise<Playlist[]> {
  const { data } = await http.get<{ playlists: Playlist[] }>('/api/playlists');
  return data.playlists;
}

export async function createPlaylistApi(
  name: string,
  tracks: Track[],
  criteria?: PlaylistCriteria
): Promise<Playlist> {
  const { data } = await http.post<{ playlist: Playlist }>('/api/playlists', {
    name,
    tracks: tracks.map((t) => ({ filename: t.filename })),
    criteria,
  });
  return data.playlist;
}

export async function mergePlaylistsApi(name: string, playlistIds: string[]): Promise<Playlist> {
  const { data } = await http.post<{ playlist: Playlist }>('/api/playlists/merge', {
    name,
    playlistIds,
  });
  return data.playlist;
}

export async function renamePlaylistApi(id: string, name: string): Promise<void> {
  await http.patch(`/api/playlists/${id}`, { name });
}

export async function deletePlaylistApi(id: string): Promise<void> {
  await http.delete(`/api/playlists/${id}`);
}

export async function addTrackToPlaylistApi(id: string, track: Track): Promise<Playlist> {
  const { data } = await http.post<{ playlist: Playlist }>(
    `/api/playlists/${id}/tracks`,
    { filename: track.filename }
  );
  return data.playlist;
}

export async function removeTrackFromPlaylistApi(id: string, filename: string): Promise<void> {
  await http.delete(`/api/playlists/${id}/tracks/${encodeURIComponent(filename)}`);
}

export async function reorderPlaylistTrackApi(
  id: string,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  await http.patch(`/api/playlists/${id}/reorder`, { fromIndex, toIndex });
}

export const LEGACY_PLAYLIST_STORAGE_KEY = 'music_library_playlists';

export function clearLegacyPlaylistStorage(): void {
  localStorage.removeItem(LEGACY_PLAYLIST_STORAGE_KEY);
}
