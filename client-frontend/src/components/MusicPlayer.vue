<template>
  <div class="player" v-if="musicStore.currentTrack">
    <audio ref="audioEl" @ended="onEnded" @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded" @error="onError" />

    <div class="player-inner">
      <!-- Colonne gauche : piste en cours -->
      <div class="col col-track">
        <div class="player-dot" aria-hidden="true" />
        <div class="player-info">
          <div class="player-title">{{ musicStore.currentTrack.title }}</div>
          <div class="player-meta">
            {{ musicStore.currentTrack.artist || 'Artiste inconnu' }}
            <template v-if="musicStore.currentTrack.album"> · {{ musicStore.currentTrack.album }}</template>
          </div>
        </div>
      </div>

      <!-- Colonne centre : contrôles + progression -->
      <div class="col col-center">
        <div class="player-controls">
          <button type="button" class="ctrl" @click="musicStore.playPrev()" title="Précédent">⏮</button>
          <button type="button" class="ctrl play-btn" @click="togglePlay" :title="musicStore.isPlaying ? 'Pause' : 'Lecture'">
            {{ musicStore.isPlaying ? '❚❚' : '▶' }}
          </button>
          <button type="button" class="ctrl" @click="musicStore.playNext()" title="Suivant">⏭</button>
        </div>
        <div class="player-progress">
          <span class="time">{{ formatDuration(currentTime) }}</span>
          <input type="range" min="0" :max="duration || 0" :value="currentTime" @input="seek" class="progress-bar" />
          <span class="time">{{ formatDuration(duration) }}</span>
        </div>
      </div>

      <!-- Colonne droite : volume -->
      <div class="col col-volume">
        <button type="button" class="vol-toggle" @click="toggleMute" :title="volume > 0 ? 'Couper le son' : 'Activer le son'">
          {{ volumeIcon }}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-model="volume"
          @input="setVolume"
          class="vol-bar"
          aria-label="Volume"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useMusicStore } from '@/stores/music';
import { formatDuration } from '@/services/trackService';

const musicStore = useMusicStore();
const audioEl = ref<HTMLAudioElement | null>(null);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const MUSIC_PATH = import.meta.env.VITE_MUSIC_PATH || '/music';

const volumeIcon = computed(() => {
  if (volume.value === 0) return '🔇';
  if (volume.value < 0.5) return '🔉';
  return '🔊';
});

let playPromise: Promise<void> | null = null;

const safePlay = async () => {
  const el = audioEl.value;
  if (!el) return;
  if (playPromise) {
    try { await playPromise; } catch { /* aborted */ }
  }
  playPromise = el.play();
  try {
    await playPromise;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name !== 'AbortError') {
      console.error('Play error:', e);
    }
  } finally {
    playPromise = null;
  }
};

const safePause = () => { audioEl.value?.pause(); };

watch(
  () => musicStore.currentTrack,
  (newTrack) => {
    if (!newTrack || !audioEl.value) return;
    currentTime.value = 0;
    duration.value = 0;
    const encoded = newTrack.filename.split('/').map(encodeURIComponent).join('/');
    audioEl.value.src = `${MUSIC_PATH}/${encoded}`;
    audioEl.value.load();
    audioEl.value.addEventListener('canplay', () => {
      if (musicStore.isPlaying) safePlay();
    }, { once: true });
  }
);

watch(
  () => musicStore.isPlaying,
  (playing) => {
    if (!audioEl.value?.src) return;
    if (playing) safePlay();
    else safePause();
  }
);

const onTimeUpdate = () => { currentTime.value = audioEl.value?.currentTime || 0; };
const onLoaded = () => { duration.value = audioEl.value?.duration || 0; };
const onEnded = () => { musicStore.playNext(); };
const onError = () => { console.error('Audio error:', musicStore.currentTrack?.filename); };
const togglePlay = () => { musicStore.togglePlay(); };
const seek = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  if (audioEl.value) audioEl.value.currentTime = val;
};
const setVolume = () => { if (audioEl.value) audioEl.value.volume = volume.value; };

const lastVolume = ref(1);
const toggleMute = () => {
  if (volume.value > 0) {
    lastVolume.value = volume.value;
    volume.value = 0;
  } else {
    volume.value = lastVolume.value || 1;
  }
  setVolume();
};

onMounted(() => { if (audioEl.value) audioEl.value.volume = volume.value; });
</script>

<style scoped>
.player {
  position: fixed;
  bottom: 1.25rem;
  left: var(--sidebar-w);
  right: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  padding: 0 2.25rem;
  pointer-events: none;
}

.player-inner {
  pointer-events: auto;
  width: 100%;
  max-width: 1100px;
  height: var(--player-h);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(240px, 2fr) 140px;
  align-items: center;
  gap: 1rem;
  padding: 0 1.25rem;
}

.col-track {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.player-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.player-info { min-width: 0; }

.player-title {
  font-weight: 600;
  font-size: 0.88rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ctrl {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem;
  transition: color 0.15s;
}

.ctrl:hover { color: var(--text); }

.play-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff !important;
  font-size: 0.8rem !important;
  display: grid;
  place-items: center;
  box-shadow: 0 3px 10px rgba(13, 148, 136, 0.3);
}

.play-btn:hover { background: var(--accent-dark); }

.player-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.time {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 2rem;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}

.col-volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-hover);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.vol-toggle {
  background: none;
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.vol-bar {
  flex: 1;
  min-width: 60px;
  height: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}

@media (max-width: 768px) {
  .player {
    left: 0.75rem;
    right: 0.75rem;
    padding: 0;
  }

  .player-inner {
    grid-template-columns: 1fr;
    height: auto;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }

  .col-track,
  .col-volume { display: none; }

  .col-center { width: 100%; }
}
</style>
