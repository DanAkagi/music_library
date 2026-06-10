<template>
  <div class="track-item" :class="{ active: isActive }">
    <!-- Click zone for play (excludes actions column) -->
    <div class="track-play-icon" @click="emit('play', track)">
      <i v-if="isActive && isPlaying" class="bi bi-play-fill"></i>
      <span v-else>#</span>
    </div>
    <div class="track-info" @click="emit('play', track)">
      <div class="track-title">{{ track.title }}</div>
      <div class="track-meta">
        <span v-if="track.artist">{{ track.artist }}</span>
        <span v-if="track.album"> · {{ track.album }}</span>
        <span v-if="track.genre" class="badge">{{ track.genre }}</span>
        <span v-if="track.year" class="badge">{{ track.year }}</span>
      </div>
    </div>
    <div class="track-duration" @click="emit('play', track)">{{ formatDuration(track.duration) }}</div>

    <!-- Actions: never propagate click to play -->
    <div class="track-actions" @click.stop>
      <slot name="actions" />
      <button title="Télécharger" @click.stop="emit('download', track)"><i class="bi bi-download"></i></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Track } from '@/services/types';
import { formatDuration } from '@/services/csvService';
import { useMusicStore } from '@/stores/music';
import { computed } from 'vue';

const props = defineProps<{ track: Track }>();
const emit = defineEmits<{
  (e: 'play', track: Track): void;
  (e: 'download', track: Track): void;
}>();

const musicStore = useMusicStore();
const isActive = computed(() => musicStore.currentTrack?.filename === props.track.filename);
const isPlaying = computed(() => musicStore.isPlaying);
</script>

<style scoped>
.track-item {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.6rem 1rem; border-radius: var(--radius);
}
.track-item.active { background: rgba(124, 106, 247, 0.1); }

.track-play-icon {
  width: 1.5rem; text-align: center; font-size: 0.8rem;
  color: var(--text-muted); flex-shrink: 0; cursor: pointer;
}
.track-item.active .track-play-icon { color: var(--accent); }

.track-info { flex: 1; min-width: 0; cursor: pointer; }
.track-info:hover ~ .track-duration, .track-info:hover { opacity: 0.85; }

.track-title { font-size: 0.9rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-meta { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.15rem; }
.badge { background: var(--surface2); border-radius: 4px; padding: 0 5px; font-size: 0.72rem; margin-left: 4px; }

.track-duration { font-size: 0.8rem; color: var(--text-muted); flex-shrink: 0; cursor: pointer; }

.track-actions { display: flex; gap: 0.25rem; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
.track-item:hover .track-actions { opacity: 1; }
.track-actions button {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  font-size: 0.85rem; padding: 0.2rem 0.4rem; border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.track-actions button:hover { color: var(--text); background: var(--surface); }

/* Hover highlight — only on clickable zones */
.track-play-icon:hover, .track-info:hover, .track-duration:hover {
  color: var(--accent);
}
.track-item:hover { background: var(--surface2); }
.track-item.active:hover { background: rgba(124, 106, 247, 0.15); }
</style>