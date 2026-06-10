<template>
  <div class="library">
    <div class="library-header">
      <h2>Bibliothèque <span class="count">({{ musicStore.filteredTracks.length }})</span></h2>
      <div class="header-actions">
        <input
          v-model="musicStore.searchQuery"
          class="search"
          placeholder="Rechercher titre, artiste, album..."
        />
        <button class="btn-outline" @click="downloadSelected" :disabled="selected.size === 0">
          <i class="bi bi-download"></i> Télécharger ({{ selected.size }})
        </button>
      </div>
    </div>

    <div v-if="musicStore.isLoading" class="empty-state">Chargement...</div>
    <div v-else-if="musicStore.error" class="empty-state error">{{ musicStore.error }}</div>
    <div v-else-if="musicStore.filteredTracks.length === 0" class="empty-state">
      Aucune musique trouvée. Déposez des fichiers MP3 dans le dossier source.
    </div>

    <div v-else class="track-list">
      <TrackItem
        v-for="track in musicStore.filteredTracks"
        :key="track.filename"
        :track="track"
        @play="playTrack(track)"
        @download="downloadOne(track)"
      >
        <template #actions>
          <input
            type="checkbox"
            :checked="selected.has(track.filename)"
            @change="toggleSelect(track.filename)"
            title="Sélectionner"
          />
        </template>
      </TrackItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useMusicStore } from '@/stores/music';
import TrackItem from '@/components/TrackItem.vue';
import { downloadTracksAsZip } from '@/services/downloadService';
import type { Track } from '@/services/types';

const musicStore = useMusicStore();
const selected = ref<Set<string>>(new Set());

const playTrack = (track: Track) => {
  musicStore.playTrack(track, musicStore.filteredTracks);
};

const toggleSelect = (filename: string) => {
  if (selected.value.has(filename)) {
    selected.value.delete(filename);
  } else {
    selected.value.add(filename);
  }
  selected.value = new Set(selected.value);
};

const downloadSelected = () => {
  downloadTracksAsZip([...selected.value]);
};

const downloadOne = (track: Track) => {
  downloadTracksAsZip([track.filename], `${track.title}.zip`);
};
</script>

<style scoped>
.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.library-header h2 { font-size: 1.2rem; font-weight: 700; }
.count { color: var(--text-muted); font-weight: 400; font-size: 0.9rem; }

.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.search {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius);
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  width: 260px;
  outline: none;
  transition: border-color 0.15s;
}
.search:focus { border-color: var(--accent); }

.btn-outline {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  transition: border-color 0.15s, color 0.15s;
}
.btn-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

.track-list {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.error { color: #f87171; }
</style>
