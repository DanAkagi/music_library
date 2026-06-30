import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loadTracks, patchTrackGenre } from '@/services/trackService';
import type { Track } from '@/services/types';

export const useMusicStore = defineStore('music', () => {
  const tracks = ref<Track[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Player state
  const currentTrack = ref<Track | null>(null);
  const isPlaying = ref(false);
  const currentQueue = ref<Track[]>([]);
  const currentIndex = ref(-1);

  // Search/filter
  const searchQuery = ref('');

  const filteredTracks = computed(() => {
    if (!searchQuery.value.trim()) return tracks.value;
    const q = searchQuery.value.toLowerCase();
    return tracks.value.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q) ||
        t.genre?.toLowerCase().includes(q)
    );
  });

  const allArtists = computed(() =>
    [...new Set(tracks.value.map((t) => t.artist).filter(Boolean) as string[])].sort()
  );
  const allGenres = computed(() =>
    [...new Set(tracks.value.map((t) => t.genre).filter(Boolean) as string[])].sort()
  );
  const allLanguages = computed(() =>
    [...new Set(tracks.value.map((t) => t.language).filter(Boolean) as string[])].sort()
  );

  const fetchTracks = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      tracks.value = await loadTracks();
    } catch (e) {
      error.value = 'Impossible de charger la bibliothèque musicale.';
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  };

  const playTrack = (track: Track, queue?: Track[]) => {
    currentTrack.value = track;
    isPlaying.value = true;
    if (queue) {
      currentQueue.value = queue;
      currentIndex.value = queue.findIndex((t) => t.filename === track.filename);
    }
  };

  const playNext = () => {
    if (currentIndex.value < currentQueue.value.length - 1) {
      currentIndex.value++;
      currentTrack.value = currentQueue.value[currentIndex.value];
      isPlaying.value = true;
    }
  };

  const playPrev = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
      currentTrack.value = currentQueue.value[currentIndex.value];
      isPlaying.value = true;
    }
  };

  const togglePlay = () => {
    isPlaying.value = !isPlaying.value;
  };

  const saveTrackGenre = async (filename: string, genre: string): Promise<Track> => {
    const updated = await patchTrackGenre(filename, genre.trim());
    const idx = tracks.value.findIndex((t) => t.filename === filename);
    if (idx !== -1) {
      tracks.value[idx] = { ...tracks.value[idx], genre: updated.genre };
    }
    if (currentTrack.value?.filename === filename) {
      currentTrack.value = { ...currentTrack.value, genre: updated.genre };
    }
    return updated;
  };

  return {
    tracks,
    isLoading,
    error,
    currentTrack,
    isPlaying,
    currentQueue,
    currentIndex,
    searchQuery,
    filteredTracks,
    allArtists,
    allGenres,
    allLanguages,
    fetchTracks,
    saveTrackGenre,
    playTrack,
    playNext,
    playPrev,
    togglePlay,
  };
});
