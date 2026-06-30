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
        <button class="btn-outline" @click="showMetadataModal = true" :disabled="selected.size === 0">
          <i class="bi bi-pencil"></i> Changer métadonnées
        </button>
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

    <!-- Metadata Modal -->
    <div v-if="showMetadataModal" class="modal-overlay" @click="showMetadataModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Changer métadonnées ({{ selected.size }} chanson(s))</h3>
          <button class="btn-close" @click="showMetadataModal = false">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Artiste</label>
            <input v-model="metadataForm.artist" type="text" placeholder="Laisser vide pour ne pas changer" />
          </div>
          <div class="field">
            <label>Genre</label>
            <input v-model="metadataForm.genre" type="text" placeholder="Laisser vide pour ne pas changer" />
          </div>
          <div class="field">
            <label>Langue</label>
            <input v-model="metadataForm.language" type="text" placeholder="Laisser vide pour ne pas changer" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showMetadataModal = false">Annuler</button>
          <button class="btn-primary" @click="saveMetadata">Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useMusicStore } from '@/stores/music';
import TrackItem from '@/components/TrackItem.vue';
import { downloadTracksAsZip } from '@/services/downloadService';
import type { Track } from '@/services/types';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';

const musicStore = useMusicStore();
const selected = ref<Set<string>>(new Set());
const showMetadataModal = ref(false);
const metadataForm = ref({ artist: '', genre: '', language: '' });

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

const saveMetadata = async () => {
  try {
    const filenames = [...selected.value];
    for (const filename of filenames) {
      await fetch(`${API_URL}/api/metadata/${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: metadataForm.value.artist || undefined,
          genre: metadataForm.value.genre || undefined,
          language: metadataForm.value.language || undefined,
        }),
      });
    }
    await musicStore.fetchTracks();
    showMetadataModal.value = false;
    metadataForm.value = { artist: '', genre: '', language: '' };
    selected.value.clear();
  } catch (err) {
    console.error('Failed to update metadata:', err);
  }
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

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 90%;
  max-width: 400px;
  padding: 1.5rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.modal-header h3 { font-size: 1rem; font-weight: 700; }

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
}
.btn-close:hover { color: var(--text); }

.modal-body { margin-bottom: 1rem; }

.field { margin-bottom: 1rem; }
.field label {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}
.field input {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
}
.field input:focus { border-color: var(--accent); }

.modal-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-primary {
  background: var(--accent);
  border: none;
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.btn-primary:hover { background: var(--accent-soft); }

.btn-secondary {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
</style>
