import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Playlist, Track } from '@/services/types';
import {
  loadPlaylists,
  createPlaylistApi,
  renamePlaylistApi,
  deletePlaylistApi,
  addTrackToPlaylistApi,
  removeTrackFromPlaylistApi,
  reorderPlaylistTrackApi,
  clearLegacyPlaylistStorage,
} from '@/services/playlistService';

export const usePlaylistStore = defineStore('playlists', () => {
  const playlists = ref<Playlist[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchPlaylists = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      playlists.value = await loadPlaylists();
      clearLegacyPlaylistStorage();
    } catch (e) {
      error.value = 'Impossible de charger les playlists.';
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  };

  const createPlaylist = async (
    name: string,
    tracks: Track[],
    criteria?: Playlist['criteria']
  ): Promise<Playlist> => {
    const playlist = await createPlaylistApi(name, tracks, criteria);
    playlists.value.unshift(playlist);
    return playlist;
  };

  const renamePlaylist = async (id: string, newName: string) => {
    await renamePlaylistApi(id, newName);
    const pl = playlists.value.find((p) => p.id === id);
    if (pl) pl.name = newName;
  };

  const deletePlaylist = async (id: string) => {
    await deletePlaylistApi(id);
    playlists.value = playlists.value.filter((p) => p.id !== id);
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    const updated = await addTrackToPlaylistApi(playlistId, track);
    const idx = playlists.value.findIndex((p) => p.id === playlistId);
    if (idx !== -1) playlists.value[idx] = updated;
  };

  const removeTrackFromPlaylist = async (playlistId: string, filename: string) => {
    await removeTrackFromPlaylistApi(playlistId, filename);
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (pl) pl.tracks = pl.tracks.filter((t) => t.filename !== filename);
  };

  const reorderTrack = async (playlistId: string, fromIndex: number, toIndex: number) => {
    await reorderPlaylistTrackApi(playlistId, fromIndex, toIndex);
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (pl) {
      const [moved] = pl.tracks.splice(fromIndex, 1);
      pl.tracks.splice(toIndex, 0, moved);
    }
  };

  return {
    playlists,
    isLoading,
    error,
    fetchPlaylists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderTrack,
  };
});
