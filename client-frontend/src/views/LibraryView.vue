<template>
  <div class="library">
    <header class="page-header">
      <div>
        <h2 class="page-title">Bibliothèque</h2>
        <p class="page-subtitle">{{ musicStore.filteredTracks.length }} morceau{{ musicStore.filteredTracks.length !== 1 ? 'x' : '' }}</p>
      </div>
      <div class="header-actions">
        <input
          v-model="musicStore.searchQuery"
          class="input search"
          placeholder="Rechercher titre, artiste, album…"
        />
        <button class="btn btn-outline" @click="downloadSelected" :disabled="selected.size === 0">
          Télécharger ({{ selected.size }})
        </button>
      </div>
    </header>

    <div v-if="musicStore.isLoading" class="empty-state">Chargement de la bibliothèque…</div>
    <div v-else-if="musicStore.error" class="empty-state error">{{ musicStore.error }}</div>
    <div v-else-if="musicStore.filteredTracks.length === 0" class="empty-state">
      Aucune musique trouvée. Déposez des fichiers MP3 dans le dossier source du backend.
    </div>

    <div v-else class="card-list">
      <TrackItem
        v-for="track in musicStore.filteredTracks"
        :key="track.filename"
        :track="track"
        editable
        @play="playTrack(track)"
        @download="downloadOne(track)"
      >
        <template #actions>
          <input
            type="checkbox"
            class="track-check"
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
.search {
  width: min(280px, 100%);
}

.track-check {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}
</style>
