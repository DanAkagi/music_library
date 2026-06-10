<template>
  <div class="generate-view">
    <div class="view-header"><h2>Générer des Playlists</h2></div>

    <div class="layout">
      <!-- ── Criteria panel ── -->
      <div class="criteria-panel">
        <h3>Critères</h3>

        <div class="field" v-for="(cat, key) in criteriaMap" :key="key">
          <label>{{ cat.label }}</label>
          <div class="criterion-row" v-for="(entry, i) in cat.entries" :key="i">
            <select v-model="entry.mode" class="mode-select">
              <option value="include"><i class="bi bi-check-circle-fill"></i> inclure</option>
              <option value="exclude"><i class="bi bi-x-circle-fill"></i> exclure</option>
            </select>
            <select v-model="entry.value" class="value-select">
              <option value="">-- choisir --</option>
              <option v-for="opt in cat.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <button class="btn-remove" @click="cat.entries.splice(i, 1)"><i class="bi bi-x"></i></button>
          </div>
          <button class="btn-add" @click="cat.entries.push({ mode: 'include', value: '' })">+ {{ cat.label }}</button>
        </div>

        <div class="field row">
          <div><label>Année min</label><input type="number" v-model.number="yearMin" placeholder="ex: 2000" /></div>
          <div><label>Année max</label><input type="number" v-model.number="yearMax" placeholder="ex: 2024" /></div>
        </div>
        <div class="field row">
          <div><label>Durée min (min)</label><input type="number" v-model.number="minDuration" placeholder="ex: 20" /></div>
          <div><label>Durée max (min)</label><input type="number" v-model.number="maxDuration" placeholder="ex: 60" /></div>
        </div>
        <div class="field">
          <label>Nombre de combinaisons</label>
          <input type="number" v-model.number="combinationCount" min="1" max="10" />
        </div>

        <button class="btn-primary" @click="generate">Générer</button>
      </div>

      <!-- ── Results panel ── -->
      <div class="result-panel">
        <div v-if="!generated" class="empty-state">Configurez les critères et cliquez sur Générer.</div>
        <div v-else-if="generated.length === 0" class="empty-state">Aucun résultat. Élargissez les filtres.</div>

        <div v-for="(playlist, idx) in generated" :key="idx" class="combo-block">
          <div class="combo-header">
            <div class="combo-title">
              Combinaison {{ idx + 1 }}
              <span class="combo-sub">{{ playlist.length }} titre(s) · {{ totalDuration(playlist) }}</span>
            </div>
            <div class="combo-actions">
              <input v-model="playlistNames[idx]" class="name-input" :placeholder="`Playlist ${idx + 1}`" />
              <button class="btn-sm-accent" @click="save(idx)" :disabled="!playlist.length || !playlistNames[idx]?.trim()"><i class="bi bi-save-fill"></i></button>
              <button class="btn-sm-outline" @click="playAll(playlist)" :disabled="!playlist.length"><i class="bi bi-play-fill"></i></button>
              <button class="btn-sm-outline" @click="download(playlist, idx)" :disabled="!playlist.length"><i class="bi bi-download"></i></button>
            </div>
          </div>

          <div class="track-list">
            <div v-for="(track, tIdx) in playlist" :key="track.filename" class="gen-track-row">
              <TrackItem
                :track="track"
                @play="musicStore.playTrack(track, playlist)"
                @download="downloadOne(track)"
              >
                <template #actions>
                  <!-- Replace dropdown -->
                  <select
                    class="replace-select"
                    @change="(e) => replaceTrack(idx, tIdx, (e.target as HTMLSelectElement).value)"
                    title="Remplacer par..."
                  >
                    <option value=""><i class="bi bi-arrow-left-right"></i></option>
                    <option
                      v-for="t in allTracks.filter(t => !playlist.some(p => p.filename === t.filename))"
                      :key="t.filename"
                      :value="t.filename"
                    >{{ t.title }}</option>
                  </select>
                  <button title="Retirer" @click.stop="removeTrack(idx, tIdx)"><i class="bi bi-x"></i></button>
                </template>
              </TrackItem>
            </div>

            <!-- Add track row -->
            <div class="add-track-row">
              <select v-model="addFilename[idx]" class="add-select">
                <option value="">Ajouter une musique...</option>
                <option
                  v-for="t in allTracks.filter(t => !playlist.some(p => p.filename === t.filename))"
                  :key="t.filename"
                  :value="t.filename"
                >{{ t.title }} — {{ t.artist || '?' }}</option>
              </select>
              <button class="btn-sm-outline" :disabled="!addFilename[idx]" @click="addTrack(idx)">Ajouter</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useMusicStore } from '@/stores/music';
import { usePlaylistStore } from '@/stores/playlists';
import TrackItem from '@/components/TrackItem.vue';
import { generatePlaylists } from '@/services/playlistGenerator';
import { formatDuration } from '@/services/csvService';
import { downloadTracksAsZip } from '@/services/downloadService';
import type { Track, PlaylistCriteria } from '@/services/types';

const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();

const allTracks = computed(() => musicStore.tracks);

// ── Criteria ──
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

// ── Results ──
const generated = ref<Track[][] | null>(null);
const playlistNames = ref<string[]>([]);
const addFilename = ref<Record<number, string>>({});

const generate = () => {
  const results = generatePlaylists(musicStore.tracks, buildCriteria(), combinationCount.value || 3);
  // Deep-copy so mutations don't affect each other
  generated.value = results.map(pl => pl.map(t => ({ ...t })));
  playlistNames.value = results.map((_, i) => `Playlist ${i + 1}`);
  addFilename.value = {};
};

// ── Track editing inside generated combos ──
const removeTrack = (playlistIdx: number, trackIdx: number) => {
  generated.value?.[playlistIdx].splice(trackIdx, 1);
};

const replaceTrack = (playlistIdx: number, trackIdx: number, newFilename: string) => {
  if (!newFilename || !generated.value) return;
  const newTrack = allTracks.value.find(t => t.filename === newFilename);
  if (newTrack) generated.value[playlistIdx][trackIdx] = { ...newTrack };
  // Reset the select back to placeholder
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

// ── Utilities ──
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
.view-header { margin-bottom: 1.25rem; }
.view-header h2 { font-size: 1.2rem; font-weight: 700; }

.layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }

.criteria-panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.25rem;
  position: sticky; top: 70px;
}
.criteria-panel h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; color: var(--accent); }

.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.35rem; }
.field.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.field input[type="number"] {
  width: 100%; background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); border-radius: 6px; padding: 0.35rem 0.6rem; font-size: 0.85rem; outline: none;
}
.field input[type="number"]:focus { border-color: var(--accent); }

.criterion-row { display: flex; gap: 0.35rem; margin-bottom: 0.35rem; align-items: center; }
.mode-select, .value-select {
  background: var(--surface2); border: 1px solid var(--border); color: var(--text);
  border-radius: 6px; padding: 0.3rem 0.4rem; font-size: 0.82rem; outline: none; cursor: pointer;
}
.mode-select { flex-shrink: 0; }
.value-select { flex: 1; }
.mode-select:focus, .value-select:focus { border-color: var(--accent); }

.btn-remove { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; padding: 0 0.3rem; flex-shrink: 0; transition: color 0.15s; }
.btn-remove:hover { color: #f87171; }

.btn-add { background: none; border: 1px dashed var(--border); color: var(--text-muted); border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.78rem; cursor: pointer; width: 100%; margin-top: 0.15rem; transition: border-color 0.15s, color 0.15s; }
.btn-add:hover { border-color: var(--accent); color: var(--accent); }

.btn-primary { width: 100%; background: var(--accent); border: none; color: #fff; padding: 0.55rem; border-radius: var(--radius); cursor: pointer; font-size: 0.9rem; font-weight: 600; margin-top: 0.5rem; transition: background 0.15s; }
.btn-primary:hover { background: var(--accent-soft); }

.result-panel { min-height: 200px; }
.empty-state { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }

.combo-block { margin-bottom: 1.75rem; }
.combo-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; gap: 0.75rem; flex-wrap: wrap; }
.combo-title { font-weight: 700; font-size: 0.95rem; }
.combo-sub { font-weight: 400; font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem; }
.combo-actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }

.name-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: var(--radius); padding: 0.35rem 0.7rem; font-size: 0.82rem; outline: none; width: 150px; }
.name-input:focus { border-color: var(--accent); }

.btn-sm-accent { background: var(--accent); border: none; color: #fff; padding: 0.35rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: background 0.15s; }
.btn-sm-accent:hover:not(:disabled) { background: var(--accent-soft); }
.btn-sm-accent:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-sm-outline { background: none; border: 1px solid var(--border); color: var(--text); padding: 0.32rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; transition: border-color 0.15s, color 0.15s; }
.btn-sm-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-sm-outline:disabled { opacity: 0.4; cursor: not-allowed; }

.track-list { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }

.replace-select {
  background: var(--surface2); border: 1px solid var(--border); color: var(--text);
  border-radius: 5px; padding: 0.15rem 0.3rem; font-size: 0.75rem; cursor: pointer; outline: none;
  max-width: 80px;
}
.replace-select:focus { border-color: var(--accent); }

.add-track-row { display: flex; gap: 0.5rem; padding: 0.6rem 1rem; border-top: 1px solid var(--border); }
.add-select { flex: 1; background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.35rem 0.6rem; font-size: 0.82rem; outline: none; cursor: pointer; }
.add-select:focus { border-color: var(--accent); }
</style>