import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Playlist, Track } from '@/services/types';
import { useUserStore } from '@/stores/user';

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
  const userStore = useUserStore();

  // Toutes les playlists, tous utilisateurs confondus (persistées en storage).
  const allPlaylists = ref<Playlist[]>(loadFromStorage());

  const save = () => saveToStorage(allPlaylists.value);

  // Playlists visibles : uniquement celles de l'utilisateur actuellement sélectionné.
  // FEATURE : chaque playliste enregistrée correspond à un utilisateur (userId), et
  // seules les playlistes de l'utilisateur courant sont exposées ici.
  const playlists = computed(() =>
    allPlaylists.value.filter((p) => p.userId === userStore.currentUserId)
  );

  const createPlaylist = (
    name: string,
    tracks: Track[],
    criteria?: Playlist['criteria']
  ): Playlist => {
    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name,
      tracks,
      createdAt: new Date().toISOString(),
      criteria,
      userId: userStore.currentUserId as string,
    };
    allPlaylists.value.push(playlist);
    save();
    return playlist;
  };

  /**
   * FEATURE : fusion de playlistes. Crée une nouvelle playliste (appartenant à
   * l'utilisateur courant) à partir de 2 playlistes (ou plus) existantes, sans
   * doublons (dédoublonnage par filename, en conservant la première occurrence).
   * Seules les playlistes de l'utilisateur courant peuvent être fusionnées.
   */
  const mergePlaylists = (
    playlistIds: string[],
    newName: string
  ): Playlist | null => {
    const trimmedName = newName.trim();
    if (!trimmedName) return null;

    const selected = playlistIds
      .map((id) => allPlaylists.value.find((p) => p.id === id))
      .filter((p): p is Playlist => !!p && p.userId === userStore.currentUserId);

    if (selected.length < 2) return null;

    const seenFilenames = new Set<string>();
    const mergedTracks: Track[] = [];
    for (const pl of selected) {
      for (const track of pl.tracks) {
        if (!seenFilenames.has(track.filename)) {
          seenFilenames.add(track.filename);
          mergedTracks.push(track);
        }
      }
    }

    return createPlaylist(trimmedName, mergedTracks);
  };

  const renamePlaylist = (id: string, newName: string) => {
    const pl = allPlaylists.value.find((p) => p.id === id);
    if (pl) { pl.name = newName; save(); }
  };

  const deletePlaylist = (id: string) => {
    allPlaylists.value = allPlaylists.value.filter((p) => p.id !== id);
    save();
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    const pl = allPlaylists.value.find((p) => p.id === playlistId);
    if (pl && !pl.tracks.some((t) => t.filename === track.filename)) {
      pl.tracks.push(track);
      save();
    }
  };

  const removeTrackFromPlaylist = (playlistId: string, filename: string) => {
    const pl = allPlaylists.value.find((p) => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter((t) => t.filename !== filename);
      save();
    }
  };

  const replaceTrackInPlaylist = (playlistId: string, oldFilename: string, newTrack: Track) => {
    const pl = allPlaylists.value.find((p) => p.id === playlistId);
    if (pl) {
      const idx = pl.tracks.findIndex((t) => t.filename === oldFilename);
      if (idx !== -1) pl.tracks[idx] = newTrack;
      save();
    }
  };

  const reorderTrack = (playlistId: string, fromIndex: number, toIndex: number) => {
    const pl = allPlaylists.value.find((p) => p.id === playlistId);
    if (pl) {
      const [moved] = pl.tracks.splice(fromIndex, 1);
      pl.tracks.splice(toIndex, 0, moved);
      save();
    }
  };

  return {
    playlists,
    createPlaylist,
    mergePlaylists,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    replaceTrackInPlaylist,
    reorderTrack,
  };
});
