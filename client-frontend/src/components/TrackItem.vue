<template>
  <div class="track-item" :class="{ active: isActive }">
    <button
      type="button"
      class="cover"
      :style="{ background: coverGradient }"
      @click="emit('play', track)"
      :aria-label="`Lire ${track.title}`"
    >
      <span v-if="isActive && isPlaying" class="cover-play">❚❚</span>
      <span v-else class="cover-play">▶</span>
    </button>

    <div class="track-info" @click="emit('play', track)">
      <div class="track-title">{{ track.title }}</div>
      <div class="track-meta">
        <span v-if="track.artist">{{ track.artist }}</span>
        <span v-if="displayAlbum"> · {{ displayAlbum }}</span>
        <span v-if="track.genre" class="badge">{{ track.genre }}</span>
        <span v-if="track.year" class="badge">{{ track.year }}</span>
      </div>
    </div>

    <div class="track-duration" @click="emit('play', track)">
      {{ formatDuration(track.duration) }}
    </div>

    <div class="track-actions" @click.stop>
      <slot name="actions" />
      <button type="button" class="btn btn-ghost btn-sm" title="Télécharger" @click.stop="emit('download', track)">
        ↓
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Track } from '@/services/types';
import { formatDuration } from '@/services/trackService';
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

const displayAlbum = computed(() => {
  const album = props.track.album?.trim();
  if (!album) return undefined;
  const artist = props.track.artist?.trim().toLowerCase();
  if (artist && album.toLowerCase() === artist) return undefined;
  return album;
});

const coverGradient = computed(() => {
  let hash = 0;
  const str = props.track.title || props.track.filename;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hues = [168, 24, 200, 340, 45, 210];
  const h = hues[Math.abs(hash) % hues.length];
  return `linear-gradient(145deg, hsl(${h}, 55%, 42%), hsl(${h + 40}, 60%, 58%))`;
});
</script>

<style scoped>
.track-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 1.1rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.track-item:last-child { border-bottom: none; }

.track-item:hover { background: var(--surface-hover); }

.track-item.active {
  background: var(--accent-soft);
  border-left: 3px solid var(--accent);
  padding-left: calc(1.1rem - 3px);
}

.cover {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: none;
  flex-shrink: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s;
}

.cover:hover { transform: scale(1.05); }

.cover-play {
  color: #fff;
  font-size: 0.7rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.track-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.track-title {
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.15rem;
}

.track-duration {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  cursor: pointer;
  min-width: 2.5rem;
  text-align: right;
}

.track-actions {
  display: flex;
  gap: 0.2rem;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.track-item:hover .track-actions,
.track-item.active .track-actions { opacity: 1; }
</style>
