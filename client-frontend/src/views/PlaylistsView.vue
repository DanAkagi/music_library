<template>
  <div class="playlists-view">
    <div class="view-header">
      <h2>Playlists enregistrées <span class="count">({{ playlistStore.playlists.length }})</span></h2>
    </div>

    <div v-if="playlistStore.playlists.length === 0" class="empty-state">
      Aucune playlist. Générez-en une depuis l'onglet "Generate Playlist".
    </div>

    <div v-else class="playlists-grid">
      <div
        v-for="pl in playlistStore.playlists"
        :key="pl.id"
        class="playlist-card"
        :class="{ expanded: expandedId === pl.id }"
      >
        <div class="playlist-card-header" @click="toggleExpand(pl.id)">
          <div class="playlist-card-info">
            <div v-if="editingId === pl.id" class="rename-row" @click.stop>
              <input v-model="renameValue" class="rename-input" @keyup.enter="confirmRename(pl.id)" />
              <button @click="confirmRename(pl.id)" class="btn-sm">✓</button>
              <button @click="editingId = null" class="btn-sm">✕</button>
            </div>
            <div v-else class="playlist-name">{{ pl.name }}</div>
            <div class="playlist-sub">{{ pl.tracks.length }} titre(s) · {{ totalDuration(pl.tracks) }}</div>
          </div>
          <div class="playlist-card-actions" @click.stop>
            <button @click="startEdit(pl)" title="Renommer">✏️</button>
            <button @click="playPlaylist(pl)" title="Lire">▶</button>
            <button @click="downloadPlaylist(pl)" title="Télécharger">⬇</button>
            <button @click="playlistStore.deletePlaylist(pl.id)" title="Supprimer">🗑</button>
          </div>
        </div>

        <div v-if="expandedId === pl.id" class="playlist-tracks">
          <TrackItem
            v-for="(track, idx) in pl.tracks"
            :key="track.filename"
            :track="track"
            @play="musicStore.playTrack(track, pl.tracks)"
            @download="downloadOne(track)"
          >
            <template #actions>
              <button @click="playlistStore.removeTrackFromPlaylist(pl.id, track.filename)" title="Retirer">✕</button>
              <button v-if="idx > 0" @click="playlistStore.reorderTrack(pl.id, idx, idx - 1)" title="Monter">↑</button>
              <button v-if="idx < pl.tracks.length - 1" @click="playlistStore.reorderTrack(pl.id, idx, idx + 1)" title="Descendre">↓</button>
            </template>
          </TrackItem>

          <!-- Add track from library -->
          <div class="add-track-row">
            <select v-model="addTrackFilename[pl.id]" class="search">
              <option value="">Ajouter une musique...</option>
              <option
                v-for="t in availableTracks(pl)"
                :key="t.filename"
                :value="t.filename"
              >{{ t.title }} — {{ t.artist || '?' }}</option>
            </select>
            <button
              class="btn-outline"
              :disabled="!addTrackFilename[pl.id]"
              @click="addTrack(pl.id)"
            >Ajouter</button>
          </div>
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
import { formatDuration } from '@/services/csvService';
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
const confirmRename = (id: string) => {
  if (renameValue.value.trim()) playlistStore.renamePlaylist(id, renameValue.value.trim());
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

const addTrack = (playlistId: string) => {
  const filename = addTrackFilename.value[playlistId];
  const track = musicStore.tracks.find((t) => t.filename === filename);
  if (track) {
    playlistStore.addTrackToPlaylist(playlistId, track);
    addTrackFilename.value[playlistId] = '';
  }
};
</script>

<style scoped>
.view-header { margin-bottom: 1.25rem; }
.view-header h2 { font-size: 1.2rem; font-weight: 700; }
.count { color: var(--text-muted); font-weight: 400; font-size: 0.9rem; }
.empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }

.playlists-grid { display: flex; flex-direction: column; gap: 0.75rem; }

.playlist-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.15s;
}
.playlist-card.expanded { border-color: var(--accent); }

.playlist-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  cursor: pointer;
}
.playlist-card-header:hover { background: var(--surface2); }

.playlist-name { font-weight: 600; font-size: 0.95rem; }
.playlist-sub { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem; }

.playlist-card-actions { display: flex; gap: 0.25rem; }
.playlist-card-actions button {
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; padding: 0.2rem 0.4rem;
  border-radius: 4px; color: var(--text-muted);
  transition: color 0.15s, background 0.15s;
}
.playlist-card-actions button:hover { color: var(--text); background: var(--surface); }

.playlist-tracks { border-top: 1px solid var(--border); padding: 0.5rem; }

.add-track-row { display: flex; gap: 0.5rem; padding: 0.75rem 0.5rem 0.5rem; }
.search {
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); border-radius: var(--radius);
  padding: 0.4rem 0.75rem; font-size: 0.85rem; flex: 1; outline: none;
}
.btn-outline {
  background: none; border: 1px solid var(--border); color: var(--text);
  padding: 0.35rem 0.75rem; border-radius: var(--radius);
  cursor: pointer; font-size: 0.82rem;
  transition: border-color 0.15s, color 0.15s;
}
.btn-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

.rename-row { display: flex; gap: 0.4rem; align-items: center; }
.rename-input {
  background: var(--surface2); border: 1px solid var(--accent);
  color: var(--text); border-radius: 6px;
  padding: 0.3rem 0.6rem; font-size: 0.9rem; outline: none;
}
.btn-sm {
  background: none; border: 1px solid var(--border); color: var(--text);
  padding: 0.2rem 0.5rem; border-radius: 5px;
  cursor: pointer; font-size: 0.8rem;
}
</style>
