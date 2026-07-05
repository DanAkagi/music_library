<template>
  <div class="playlists-view">
    <header class="page-header">
      <div>
        <h2 class="page-title">Playlists</h2>
        <p class="page-subtitle">{{ playlistStore.playlists.length }} enregistrée{{ playlistStore.playlists.length !== 1 ? 's' : '' }}</p>
      </div>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="selectedIds.size < 2"
        @click="openMergeModal"
      >
        Fusionner ({{ selectedIds.size }})
      </button>
    </header>

    <div v-if="playlistStore.playlists.length === 0" class="empty-state">
      Aucune playlist pour l'instant. Créez-en une depuis l'onglet <strong>Générateur</strong>.
    </div>

    <div v-else class="playlists-grid">
      <article
        v-for="pl in playlistStore.playlists"
        :key="pl.id"
        class="playlist-card card"
        :class="{ expanded: expandedId === pl.id, selected: selectedIds.has(pl.id) }"
      >
        <div class="playlist-card-header" @click="toggleExpand(pl.id)">
          <label class="playlist-check" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.has(pl.id)"
              @change="toggleSelect(pl.id)"
            />
          </label>
          <div class="playlist-card-info">
            <div v-if="editingId === pl.id" class="rename-row" @click.stop>
              <input v-model="renameValue" class="input rename-input" @keyup.enter="confirmRename(pl.id)" />
              <button type="button" @click="confirmRename(pl.id)" class="btn btn-primary btn-sm">OK</button>
              <button type="button" @click="editingId = null" class="btn btn-outline btn-sm">Annuler</button>
            </div>
            <div v-else>
              <div class="playlist-name">{{ pl.name }}</div>
              <div class="playlist-sub">{{ pl.tracks.length }} titre(s) · {{ totalDuration(pl.tracks) }}</div>
            </div>
          </div>
          <div class="playlist-card-actions" @click.stop>
            <button type="button" class="btn btn-ghost btn-sm" @click="startEdit(pl)" title="Renommer">✎</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="playPlaylist(pl)" title="Lire">▶</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="downloadPlaylist(pl)" title="Télécharger">↓</button>
            <button type="button" class="btn btn-ghost btn-sm danger" @click="playlistStore.deletePlaylist(pl.id)" title="Supprimer">×</button>
          </div>
        </div>

        <div v-if="expandedId === pl.id" class="playlist-tracks">
          <div class="card-list">
            <TrackItem
              v-for="(track, idx) in pl.tracks"
              :key="track.filename"
              :track="track"
              @play="musicStore.playTrack(track, pl.tracks)"
              @download="downloadOne(track)"
            >
              <template #actions>
                <button type="button" class="btn btn-ghost btn-sm" @click="playlistStore.removeTrackFromPlaylist(pl.id, track.filename)" title="Retirer">×</button>
                <button type="button" v-if="idx > 0" class="btn btn-ghost btn-sm" @click="playlistStore.reorderTrack(pl.id, idx, idx - 1)" title="Monter">↑</button>
                <button type="button" v-if="idx < pl.tracks.length - 1" class="btn btn-ghost btn-sm" @click="playlistStore.reorderTrack(pl.id, idx, idx + 1)" title="Descendre">↓</button>
              </template>
            </TrackItem>
          </div>

          <div class="add-track-row">
            <select v-model="addTrackFilename[pl.id]" class="select add-select">
              <option value="">Ajouter une musique…</option>
              <option
                v-for="t in availableTracks(pl)"
                :key="t.filename"
                :value="t.filename"
              >{{ t.title }} — {{ t.artist || '?' }}</option>
            </select>
            <button
              type="button"
              class="btn btn-outline"
              :disabled="!addTrackFilename[pl.id]"
              @click="addTrack(pl.id)"
            >Ajouter</button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showMergeModal" class="modal-overlay" @click.self="closeMergeModal">
      <div class="modal card" role="dialog" aria-labelledby="merge-title">
        <h3 id="merge-title" class="modal-title">Fusionner les playlists</h3>
        <p class="modal-sub">
          {{ selectedIds.size }} playlist{{ selectedIds.size > 1 ? 's' : '' }} sélectionnée{{ selectedIds.size > 1 ? 's' : '' }}
          — les doublons seront supprimés, les originales conservées.
        </p>
        <div class="field">
          <label for="merge-name">Nom de la nouvelle playlist</label>
          <input
            id="merge-name"
            v-model="mergeName"
            class="input"
            placeholder="Ma playlist fusionnée"
            @keyup.enter="confirmMerge"
            @keyup.escape="closeMergeModal"
          />
        </div>
        <p v-if="mergeError" class="merge-error">{{ mergeError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" @click="closeMergeModal">Annuler</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!mergeName.trim() || isMerging"
            @click="confirmMerge"
          >
            {{ isMerging ? '…' : 'Fusionner' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePlaylistStore } from '@/stores/playlists';
import { useMusicStore } from '@/stores/music';
import TrackItem from '@/components/TrackItem.vue';
import { formatDuration } from '@/services/trackService';
import { downloadTracksAsZip } from '@/services/downloadService';
import type { Playlist, Track } from '@/services/types';

const playlistStore = usePlaylistStore();
const musicStore = useMusicStore();

const expandedId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const renameValue = ref('');
const addTrackFilename = ref<Record<string, string>>({});
const selectedIds = ref<Set<string>>(new Set());
const showMergeModal = ref(false);
const mergeName = ref('');
const mergeError = ref<string | null>(null);
const isMerging = ref(false);

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const openMergeModal = () => {
  if (selectedIds.value.size < 2) return;
  mergeName.value = '';
  mergeError.value = null;
  showMergeModal.value = true;
};

const closeMergeModal = () => {
  showMergeModal.value = false;
  mergeError.value = null;
};

const confirmMerge = async () => {
  const name = mergeName.value.trim();
  if (!name || selectedIds.value.size < 2) return;

  isMerging.value = true;
  mergeError.value = null;
  try {
    const playlist = await playlistStore.mergePlaylists(name, [...selectedIds.value]);
    selectedIds.value = new Set();
    closeMergeModal();
    expandedId.value = playlist.id;
  } catch {
    mergeError.value = 'Impossible de fusionner les playlists.';
  } finally {
    isMerging.value = false;
  }
};

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const startEdit = (pl: Playlist) => {
  editingId.value = pl.id;
  renameValue.value = pl.name;
};

const confirmRename = async (id: string) => {
  if (renameValue.value.trim()) await playlistStore.renamePlaylist(id, renameValue.value.trim());
  editingId.value = null;
};

const playPlaylist = (pl: Playlist) => {
  if (pl.tracks.length) musicStore.playTrack(pl.tracks[0], pl.tracks);
};

const downloadPlaylist = (pl: Playlist) => {
  downloadTracksAsZip(pl.tracks.map((t) => t.filename), `${pl.name}.zip`);
};

const downloadOne = (track: Track) => {
  downloadTracksAsZip([track.filename], `${track.title}.zip`);
};

const totalDuration = (tracks: Track[]) => {
  const total = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  return formatDuration(total);
};

const availableTracks = (pl: Playlist) => {
  const inPlaylist = new Set(pl.tracks.map((t) => t.filename));
  return musicStore.tracks.filter((t) => !inPlaylist.has(t.filename));
};

const addTrack = async (playlistId: string) => {
  const filename = addTrackFilename.value[playlistId];
  const track = musicStore.tracks.find((t) => t.filename === filename);
  if (track) {
    await playlistStore.addTrackToPlaylist(playlistId, track);
    addTrackFilename.value[playlistId] = '';
  }
};
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.playlists-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.playlist-card {
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.playlist-card.expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow);
}

.playlist-card.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.playlist-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.15rem;
  cursor: pointer;
  transition: background 0.15s;
}

.playlist-check {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.playlist-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}

.playlist-card-info {
  flex: 1;
  min-width: 0;
}

.playlist-card-header:hover { background: var(--surface-hover); }

.playlist-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.05rem;
}

.playlist-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.playlist-card-actions {
  display: flex;
  gap: 0.15rem;
}

.danger:hover { color: var(--accent-warm) !important; background: #fff5f5 !important; }

.playlist-tracks {
  border-top: 1px solid var(--border);
  padding: 0.75rem;
  background: var(--surface-hover);
}

.add-track-row {
  display: flex;
  gap: 0.6rem;
  padding: 0.75rem 0.25rem 0.25rem;
}

.add-select { flex: 1; }

.rename-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.rename-input { flex: 1; min-width: 140px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  width: min(100%, 400px);
  padding: 1.5rem;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
}

.modal-sub {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.modal .field {
  margin-top: 1.25rem;
}

.modal .field label {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.modal .field .input {
  width: 100%;
}

.merge-error {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #b91c1c;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
</style>
