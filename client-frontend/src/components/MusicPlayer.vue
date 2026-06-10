<template>
  <div class="player">
    <audio
      ref="audioEl"
      :src="trackUrl"
      @ended="musicStore.playNext()"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
    />

    <div class="player-info">
      <div class="player-title">{{ track.title }}</div>
      <div class="player-meta">{{ track.artist || 'Artiste inconnu' }} · {{ track.album || '' }}</div>
    </div>

    <div class="player-controls">
      <button @click="musicStore.playPrev()" title="Précédent">⏮</button>
      <button class="play-btn" @click="togglePlay">{{ musicStore.isPlaying ? '⏸' : '▶' }}</button>
      <button @click="musicStore.playNext()" title="Suivant">⏭</button>
    </div>

    <div class="player-progress">
      <span class="time">{{ formatDuration(currentTime) }}</span>
      <input
        type="range"
        min="0"
        :max="duration"
        :value="currentTime"
        @input="seek"
        class="progress-bar"
      />
      <span class="time">{{ formatDuration(duration) }}</span>
    </div>

    <div class="player-volume">
      <span>🔊</span>
      <input type="range" min="0" max="1" step="0.01" v-model="volume" @input="setVolume" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useMusicStore } from '@/stores/music';
import { formatDuration } from '@/services/csvService';

const musicStore = useMusicStore();
const audioEl = ref<HTMLAudioElement | null>(null);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);

const track = computed(() => musicStore.currentTrack!);
const trackUrl = computed(
  () => `${import.meta.env.VITE_MUSIC_PATH || '/music'}/${track.value.filename}`
);

watch(
  () => musicStore.currentTrack,
  async () => {
    currentTime.value = 0;
    duration.value = 0;
    await new Promise((r) => setTimeout(r, 50));
    if (musicStore.isPlaying) audioEl.value?.play();
  }
);

watch(
  () => musicStore.isPlaying,
  (playing) => {
    if (!audioEl.value) return;
    playing ? audioEl.value.play() : audioEl.value.pause();
  }
);

const onTimeUpdate = () => {
  currentTime.value = audioEl.value?.currentTime || 0;
};

const onLoaded = () => {
  duration.value = audioEl.value?.duration || 0;
};

const togglePlay = () => {
  musicStore.togglePlay();
};

const seek = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  if (audioEl.value) audioEl.value.currentTime = val;
};

const setVolume = () => {
  if (audioEl.value) audioEl.value.volume = volume.value;
};

onMounted(() => {
  if (musicStore.isPlaying) audioEl.value?.play();
});
</script>

<style scoped>
.player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--player-h);
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 2rem;
  z-index: 200;
}

.player-info { flex: 1; min-width: 0; }
.player-title { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player-meta { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.player-controls { display: flex; align-items: center; gap: 0.5rem; }
.player-controls button {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.player-controls button:hover { opacity: 1; }
.play-btn { font-size: 1.4rem !important; opacity: 1 !important; color: var(--accent) !important; }

.player-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 2;
  min-width: 0;
}
.time { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }

.progress-bar, input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  cursor: pointer;
}

.player-volume { display: flex; align-items: center; gap: 0.5rem; width: 120px; }
.player-volume span { font-size: 0.9rem; }
</style>
