<template>
  <div class="playlists-view">
    <header class="page-header">
      <div>
        <h2 class="page-title">Playlists</h2>
        <p class="page-subtitle">{{ playlistStore.playlists.length }} enregistrée{{ playlistStore.playlists.length !== 1 ? 's' : '' }}</p>
      </div>
    </header>

    <div v-if="playlistStore.playlists.length === 0" class="empty-state">
      Aucune playlist pour l'instant. Créez-en une depuis l'onglet <strong>Générateur</strong>.
    </div>

    <div v-else class="playlists-grid">
      <article
        v-for="pl in playlistStore.playlists"
        :key="pl.id"
        class="playlist-card card"
        :class="{ expanded: expandedId === pl.id }"
      >
        <div class="playlist-card-header" @click="toggleExpand(pl.id)">
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

.playlist-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.15rem;
  cursor: pointer;
  transition: background 0.15s;
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
</style>
