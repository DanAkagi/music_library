<template>
  <div class="generate-view">
    <!-- Critères en haut, pleine largeur -->
    <section class="criteria-panel card">
      <header class="criteria-head">
        <div>
          <h2 class="page-title">Générateur</h2>
          <p class="page-subtitle">Configurez vos filtres puis lancez la génération</p>
        </div>
        <button type="button" class="btn btn-primary generate-btn" @click="generate">
          Générer les playlists
        </button>
      </header>

      <div class="criteria-grid">
        <div class="criteria-group" v-for="(cat, key) in criteriaMap" :key="key">
          <h4 class="group-label">{{ cat.label }}</h4>
          <div class="criterion-row" v-for="(entry, i) in cat.entries" :key="i">
            <select v-model="entry.mode" class="select mode-select">
              <option value="include">Inclure</option>
              <option value="exclude">Exclure</option>
            </select>
            <select v-model="entry.value" class="select value-select">
              <option value="">Choisir…</option>
              <option v-for="opt in cat.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <button type="button" class="btn-icon" @click="cat.entries.splice(i, 1)" title="Supprimer">×</button>
          </div>
          <button type="button" class="btn-add" @click="cat.entries.push({ mode: 'include', value: '' })">
            + Ajouter {{ cat.label.toLowerCase() }}
          </button>
        </div>

        <div class="criteria-group criteria-group--compact">
          <h4 class="group-label">Période</h4>
          <div class="inline-fields">
            <div class="mini-field">
              <label>Année min</label>
              <input type="number" class="input" v-model.number="yearMin" placeholder="2000" />
            </div>
            <div class="mini-field">
              <label>Année max</label>
              <input type="number" class="input" v-model.number="yearMax" placeholder="2024" />
            </div>
          </div>
        </div>

        <div class="criteria-group criteria-group--compact">
          <h4 class="group-label">Durée (minutes)</h4>
          <div class="inline-fields">
            <div class="mini-field">
              <label>Minimum</label>
              <input type="number" class="input" v-model.number="minDuration" placeholder="20" />
            </div>
            <div class="mini-field">
              <label>Maximum</label>
              <input type="number" class="input" v-model.number="maxDuration" placeholder="60" />
            </div>
          </div>
        </div>

        <div class="criteria-group criteria-group--compact">
          <h4 class="group-label">Playlists</h4>
          <div class="mini-field">
            <label>Nombre à générer</label>
            <input type="number" class="input" v-model.number="combinationCount" min="1" max="10" />
          </div>
        </div>
      </div>
    </section>

    <!-- Résultats en dessous -->
    <section class="result-panel">
      <header class="result-head">
        <h3 class="result-title">Résultats</h3>
        <p class="result-sub" v-if="generated">
          {{ generated.length }} combinaison{{ generated.length > 1 ? 's' : '' }}
        </p>
        <p class="result-sub" v-else>En attente de génération</p>
      </header>

      <div v-if="!generated" class="placeholder card">
        <div class="placeholder-inner">
          <div class="placeholder-icon" aria-hidden="true">✦</div>
          <div class="placeholder-content">
            <h4>Prêt à créer vos playlists</h4>
            <p>Remplissez les critères ci-dessus, puis cliquez sur <strong>Générer les playlists</strong>.</p>
            <div class="placeholder-stats">
              <span class="stat-chip">{{ musicStore.tracks.length }} morceaux</span>
              <span class="stat-chip">{{ musicStore.allArtists.length }} artistes</span>
              <span class="stat-chip">{{ musicStore.allGenres.length }} genres</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="generated.length === 0" class="empty-state">
        Aucun résultat — élargissez vos critères et réessayez.
      </div>

      <div v-else class="results-grid">
        <article v-for="(playlist, idx) in generated" :key="idx" class="combo-block card">
          <div class="combo-header">
            <div>
              <div class="combo-title">Combinaison {{ idx + 1 }}</div>
              <div class="combo-sub">{{ playlist.length }} titre(s) · {{ totalDuration(playlist) }}</div>
            </div>
            <div class="combo-actions">
              <input v-model="playlistNames[idx]" class="input name-input" :placeholder="`Playlist ${idx + 1}`" />
              <button type="button" class="btn btn-primary btn-sm" @click="save(idx)" :disabled="!playlist.length || !playlistNames[idx]?.trim()">Sauver</button>
              <button type="button" class="btn btn-outline btn-sm" @click="playAll(playlist)" :disabled="!playlist.length">▶</button>
              <button type="button" class="btn btn-outline btn-sm" @click="download(playlist, idx)" :disabled="!playlist.length">↓</button>
            </div>
          </div>

          <div class="card-list combo-tracks">
            <TrackItem
              v-for="(track, tIdx) in playlist"
              :key="track.filename"
              :track="track"
              @play="musicStore.playTrack(track, playlist)"
              @download="downloadOne(track)"
            >
              <template #actions>
                <select
                  class="select replace-select"
                  @change="(e) => replaceTrack(idx, tIdx, (e.target as HTMLSelectElement).value)"
                  title="Remplacer"
                >
                  <option value="">↔</option>
                  <option
                    v-for="t in allTracks.filter(t => !playlist.some(p => p.filename === t.filename))"
                    :key="t.filename"
                    :value="t.filename"
                  >{{ t.title }}</option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm" title="Retirer" @click.stop="removeTrack(idx, tIdx)">×</button>
              </template>
            </TrackItem>

            <div class="add-track-row">
              <select v-model="addFilename[idx]" class="select add-select">
                <option value="">Ajouter une musique…</option>
                <option
                  v-for="t in allTracks.filter(t => !playlist.some(p => p.filename === t.filename))"
                  :key="t.filename"
                  :value="t.filename"
                >{{ t.title }} — {{ t.artist || '?' }}</option>
              </select>
              <button type="button" class="btn btn-outline btn-sm" :disabled="!addFilename[idx]" @click="addTrack(idx)">Ajouter</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useMusicStore } from '@/stores/music';
import { usePlaylistStore } from '@/stores/playlists';
import TrackItem from '@/components/TrackItem.vue';
import { generatePlaylists } from '@/services/playlistGenerator';
import { formatDuration } from '@/services/trackService';
import { downloadTracksAsZip } from '@/services/downloadService';
import type { Track, PlaylistCriteria } from '@/services/types';

const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();

const allTracks = computed(() => musicStore.tracks);

interface Entry { mode: 'include' | 'exclude'; value: string; }
const criteriaMap = reactive({
  artists:   { label: 'Artiste',  entries: [] as Entry[], options: computed(() => musicStore.allArtists) },
  genres:    { label: 'Genre',    entries: [] as Entry[], options: computed(() => musicStore.allGenres) },
  languages: { label: 'Langue',   entries: [] as Entry[], options: computed(() => musicStore.allLanguages) },
});
const yearMin = ref<number | undefined>(undefined);
const yearMax = ref<number | undefined>(undefined);
const minDuration = ref<number | undefined>(undefined);
const maxDuration = ref<number | undefined>(undefined);
const combinationCount = ref(3);

const buildCriteria = (): PlaylistCriteria => {
  const incl = (entries: Entry[]) => entries.filter(e => e.mode === 'include' && e.value).map(e => e.value);
  const excl = (entries: Entry[]) => entries.filter(e => e.mode === 'exclude' && e.value).map(e => e.value);
  return {
    artists:            incl(criteriaMap.artists.entries),
    excludeArtists:     excl(criteriaMap.artists.entries),
    genres:             incl(criteriaMap.genres.entries),
    excludeGenres:      excl(criteriaMap.genres.entries),
    languages:          incl(criteriaMap.languages.entries),
    yearMin:            yearMin.value || undefined,
    yearMax:            yearMax.value || undefined,
    minDurationMinutes: minDuration.value || undefined,
    maxDurationMinutes: maxDuration.value || undefined,
  };
};

const generated = ref<Track[][] | null>(null);
const playlistNames = ref<string[]>([]);
const addFilename = ref<Record<number, string>>({});

const generate = () => {
  const results = generatePlaylists(musicStore.tracks, buildCriteria(), combinationCount.value || 3);
  generated.value = results.map(pl => pl.map(t => ({ ...t })));
  playlistNames.value = results.map((_, i) => `Playlist ${i + 1}`);
  addFilename.value = {};
};

const removeTrack = (playlistIdx: number, trackIdx: number) => {
  generated.value?.[playlistIdx].splice(trackIdx, 1);
};

const replaceTrack = (playlistIdx: number, trackIdx: number, newFilename: string) => {
  if (!newFilename || !generated.value) return;
  const newTrack = allTracks.value.find(t => t.filename === newFilename);
  if (newTrack) generated.value[playlistIdx][trackIdx] = { ...newTrack };
  (document.activeElement as HTMLSelectElement)?.blur();
};

const addTrack = (playlistIdx: number) => {
  const filename = addFilename.value[playlistIdx];
  if (!filename || !generated.value) return;
  const track = allTracks.value.find(t => t.filename === filename);
  if (track) {
    generated.value[playlistIdx].push({ ...track });
    addFilename.value[playlistIdx] = '';
  }
};

const totalDuration = (tracks: Track[]) =>
  formatDuration(tracks.reduce((acc, t) => acc + (t.duration || 0), 0));

const save = (idx: number) => {
  const tracks = generated.value?.[idx];
  const name = playlistNames.value[idx]?.trim();
  if (!tracks || !name) return;
  playlistStore.createPlaylist(name, tracks, buildCriteria());
  playlistNames.value[idx] = '';
};

const playAll = (playlist: Track[]) => {
  if (playlist.length) musicStore.playTrack(playlist[0], playlist);
};

const download = (playlist: Track[], idx: number) => {
  downloadTracksAsZip(playlist.map(t => t.filename), `${playlistNames.value[idx] || 'playlist'}.zip`);
};

const downloadOne = (track: Track) => {
  downloadTracksAsZip([track.filename], `${track.title}.zip`);
};
</script>

<style scoped>
.generate-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Criteria (top, full width) ── */
.criteria-panel {
  overflow: visible;
}

.criteria-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--accent-soft) 0%, transparent 100%);
}

.criteria-head .page-title {
  font-size: 1.4rem;
  margin-bottom: 0.15rem;
}

.generate-btn {
  padding: 0.6rem 1.5rem;
  white-space: nowrap;
}

.criteria-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

@media (max-width: 900px) {
  .criteria-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 600px) {
  .criteria-grid { grid-template-columns: 1fr; }
}

.criteria-group {
  background: var(--surface-hover);
  border-radius: var(--radius-sm);
  padding: 1rem;
  min-width: 0;
}

.criteria-group--compact {
  min-height: auto;
}

.group-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.criterion-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
  align-items: center;
}

.mode-select {
  width: 90px;
  flex-shrink: 0;
  padding: 0.45rem 0.4rem;
  font-size: 0.8rem;
}

.value-select {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.5rem;
  font-size: 0.8rem;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--accent-warm);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.btn-icon:hover { background: #fff5f5; }

.btn-add {
  width: 100%;
  margin-top: 0.35rem;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.btn-add:hover {
  border-color: var(--accent);
  color: var(--accent-dark);
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.mini-field label {
  display: block;
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.mini-field .input {
  width: 100%;
}

/* ── Results ── */
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.result-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
}

.result-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.placeholder {
  padding: 0;
  overflow: hidden;
}

.placeholder-inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  background: linear-gradient(90deg, var(--accent-soft) 0%, transparent 60%);
}

.placeholder-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 1.4rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);
}

.placeholder-content h4 {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin-bottom: 0.35rem;
}

.placeholder-content p {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.placeholder-content strong { color: var(--accent-dark); }

.placeholder-stats {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
}

.stat-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.results-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.combo-block { overflow: hidden; }

.combo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1.15rem;
  gap: 1rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  background: var(--surface-hover);
}

.combo-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
}

.combo-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

.combo-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.name-input { width: 150px; }

.combo-tracks {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.add-track-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
}

.add-select { flex: 1; }

.replace-select {
  max-width: 80px;
  padding: 0.25rem 0.35rem;
  font-size: 0.75rem;
}
</style>
