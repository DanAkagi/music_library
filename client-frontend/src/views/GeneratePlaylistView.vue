<template>
  <div class="generate-view">
    <div class="view-header">
      <h2>Générer une Playlist</h2>
    </div>

    <div class="layout">
      <!-- Criteria panel -->
      <div class="criteria-panel">
        <h3>Critères</h3>

        <div class="field">
          <label>Artistes (inclus)</label>
          <MultiSelect :options="musicStore.allArtists" v-model="criteria.artists" placeholder="Tous les artistes" />
        </div>
        <div class="field">
          <label>Artistes (exclus)</label>
          <MultiSelect :options="musicStore.allArtists" v-model="criteria.excludeArtists" placeholder="Aucun exclusion" />
        </div>
        <div class="field">
          <label>Genres (inclus)</label>
          <MultiSelect :options="musicStore.allGenres" v-model="criteria.genres" placeholder="Tous les genres" />
        </div>
        <div class="field">
          <label>Genres (exclus)</label>
          <MultiSelect :options="musicStore.allGenres" v-model="criteria.excludeGenres" placeholder="Aucune exclusion" />
        </div>
        <div class="field">
          <label>Langues</label>
          <MultiSelect :options="musicStore.allLanguages" v-model="criteria.languages" placeholder="Toutes les langues" />
        </div>
        <div class="field row">
          <div>
            <label>Année min</label>
            <input type="number" v-model.number="criteria.yearMin" placeholder="Ex: 2000" />
          </div>
          <div>
            <label>Année max</label>
            <input type="number" v-model.number="criteria.yearMax" placeholder="Ex: 2024" />
          </div>
        </div>
        <div class="field row">
          <div>
            <label>Durée min (min)</label>
            <input type="number" v-model.number="criteria.minDurationMinutes" placeholder="Ex: 30" />
          </div>
          <div>
            <label>Durée max (min)</label>
            <input type="number" v-model.number="criteria.maxDurationMinutes" placeholder="Ex: 60" />
          </div>
        </div>

        <button class="btn-primary" @click="generate">Générer</button>
      </div>

      <!-- Result panel -->
      <div class="result-panel">
        <div v-if="!generated" class="empty-state">
          Configurez les critères et cliquez sur Générer.
        </div>
        <template v-else>
          <div class="result-header">
            <div>
              <div class="result-count">{{ generated.length }} titre(s) · {{ totalDuration }}</div>
            </div>
            <div class="result-actions">
              <input v-model="playlistName" class="name-input" placeholder="Nom de la playlist" />
              <button class="btn-primary" @click="save" :disabled="!generated.length || !playlistName.trim()">
                💾 Enregistrer
              </button>
              <button class="btn-outline" @click="download" :disabled="!generated.length">
                ⬇ ZIP
              </button>
              <button class="btn-outline" @click="playAll" :disabled="!generated.length">
                ▶ Lire tout
              </button>
            </div>
          </div>

          <div v-if="generated.length === 0" class="empty-state">
            Aucun résultat pour ces critères. Essayez d'élargir les filtres.
          </div>

          <div v-else class="track-list">
            <TrackItem
              v-for="track in generated"
              :key="track.filename"
              :track="track"
              @play="musicStore.playTrack(track, generated)"
              @download="downloadOne(track)"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMusicStore } from '@/stores/music';
import { usePlaylistStore } from '@/stores/playlists';
import TrackItem from '@/components/TrackItem.vue';
import MultiSelect from '@/components/MultiSelect.vue';
import { generatePlaylist } from '@/services/playlistGenerator';
import { formatDuration } from '@/services/csvService';
import { downloadTracksAsZip } from '@/services/downloadService';
import type { PlaylistCriteria, Track } from '@/services/types';

const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();

const criteria = ref<PlaylistCriteria>({
  artists: [],
  excludeArtists: [],
  genres: [],
  excludeGenres: [],
  languages: [],
});
const generated = ref<Track[] | null>(null);
const playlistName = ref('');

const totalDuration = computed(() => {
  if (!generated.value) return '';
  return formatDuration(generated.value.reduce((acc, t) => acc + (t.duration || 0), 0));
});

const generate = () => {
  generated.value = generatePlaylist(musicStore.tracks, criteria.value);
};

const save = () => {
  if (!generated.value || !playlistName.value.trim()) return;
  playlistStore.createPlaylist(playlistName.value.trim(), generated.value, criteria.value);
  playlistName.value = '';
};

const download = () => {
  if (!generated.value) return;
  downloadTracksAsZip(generated.value.map((t) => t.filename));
};

const playAll = () => {
  if (generated.value?.length) musicStore.playTrack(generated.value[0], generated.value);
};

const downloadOne = (track: Track) => {
  downloadTracksAsZip([track.filename], `${track.title}.zip`);
};
</script>

<style scoped>
.view-header { margin-bottom: 1.25rem; }
.view-header h2 { font-size: 1.2rem; font-weight: 700; }

.layout { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }

.criteria-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  position: sticky;
  top: 70px;
}
.criteria-panel h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; color: var(--accent); }

.field { margin-bottom: 0.85rem; }
.field label { display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.3rem; }
.field.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.field input[type="number"] {
  width: 100%; background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); border-radius: 6px; padding: 0.35rem 0.6rem;
  font-size: 0.85rem; outline: none;
}
.field input[type="number"]:focus { border-color: var(--accent); }

.btn-primary {
  width: 100%; background: var(--accent); border: none; color: #fff;
  padding: 0.55rem; border-radius: var(--radius);
  cursor: pointer; font-size: 0.9rem; font-weight: 600;
  margin-top: 0.5rem;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-soft); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.result-panel { min-height: 200px; }
.empty-state { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }

.result-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;
}
.result-count { font-size: 0.85rem; color: var(--text-muted); }
.result-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

.name-input {
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); border-radius: var(--radius);
  padding: 0.38rem 0.8rem; font-size: 0.85rem; outline: none;
  width: 180px;
}
.name-input:focus { border-color: var(--accent); }

.btn-outline {
  background: none; border: 1px solid var(--border); color: var(--text);
  padding: 0.35rem 0.75rem; border-radius: var(--radius);
  cursor: pointer; font-size: 0.82rem;
  transition: border-color 0.15s, color 0.15s;
}
.btn-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

.track-list {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
</style>
