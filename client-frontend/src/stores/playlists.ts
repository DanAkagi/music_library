import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Playlist, Track } from '@/services/types';

const STORAGE_KEY = 'music_library_playlists';

const loadFromStorage = (): Playlist[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (playlists: Playlist[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
};

export const usePlaylistStore = defineStore('playlists', () => {
  const playlists = ref<Playlist[]>(loadFromStorage());

  const save = () => saveToStorage(playlists.value);

  const createPlaylist = (name: string, tracks: Track[], criteria?: Playlist['criteria']): Playlist => {
    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name,
      tracks,
      createdAt: new Date().toISOString(),
      criteria,
    };
    playlists.value.push(playlist);
    save();
    return playlist;
  };

  const renamePlaylist = (id: string, newName: string) => {
    const pl = playlists.value.find((p) => p.id === id);
    if (pl) { pl.name = newName; save(); }
  };

  const deletePlaylist = (id: string) => {
    playlists.value = playlists.value.filter((p) => p.id !== id);
    save();
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (pl && !pl.tracks.some((t) => t.filename === track.filename)) {
      pl.tracks.push(track);
      save();
    }
  };

  const removeTrackFromPlaylist = (playlistId: string, filename: string) => {
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter((t) => t.filename !== filename);
      save();
    }
  };

  const replaceTrackInPlaylist = (playlistId: string, oldFilename: string, newTrack: Track) => {
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (pl) {
      const idx = pl.tracks.findIndex((t) => t.filename === oldFilename);
      if (idx !== -1) pl.tracks[idx] = newTrack;
      save();
    }
  };

  const reorderTrack = (playlistId: string, fromIndex: number, toIndex: number) => {
    const pl = playlists.value.find((p) => p.id === playlistId);
    if (pl) {
      const [moved] = pl.tracks.splice(fromIndex, 1);
      pl.tracks.splice(toIndex, 0, moved);
      save();
    }
  };

  return {
    playlists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    replaceTrackInPlaylist,
    reorderTrack,
  };
});
