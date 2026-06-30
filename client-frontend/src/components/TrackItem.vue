<template>
  <div class="track-item" :class="{ active: isActive }">
    <button
      type="button"
      class="cover"
      :style="{ background: coverGradient }"
      @click="emit('play', track)"
      :aria-label="`Lire ${displayTitle}`"
    >
      <span v-if="isActive && isPlaying" class="cover-play">❚❚</span>
      <span v-else class="cover-play">▶</span>
    </button>

    <div class="track-info" @click="emit('play', track)">
      <div class="track-title">{{ displayTitle }}</div>
      <dl class="track-meta">
        <div v-if="track.artist" class="meta-row meta-row--artist">
          <dt>Artiste</dt>
          <dd>{{ track.artist }}</dd>
        </div>
        <div v-if="track.album" class="meta-row meta-row--album">
          <dt>Album</dt>
          <dd>{{ track.album }}</dd>
        </div>
        <div v-if="track.year" class="meta-row meta-row--year">
          <dt>Année</dt>
          <dd>{{ track.year }}</dd>
        </div>
        <div v-if="track.genre || editable" class="meta-row meta-row--genre">
          <dt>Genre</dt>
          <dd>{{ track.genre || '—' }}</dd>
        </div>
      </dl>
      <div v-if="editable && isEditing" class="genre-edit" @click.stop>
        <input
          v-model="genreDraft"
          class="input genre-input"
          :list="genreListId"
          placeholder="Genre"
          @keyup.enter="saveGenre"
          @keyup.escape="cancelEdit"
        />
        <datalist :id="genreListId">
          <option v-for="g in musicStore.allGenres" :key="g" :value="g" />
        </datalist>
        <button type="button" class="btn btn-primary btn-sm" :disabled="saving" @click="saveGenre">
          {{ saving ? '…' : 'OK' }}
        </button>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="saving" @click="cancelEdit">×</button>
        <span v-if="saveError" class="genre-error">{{ saveError }}</span>
      </div>
    </div>

    <div class="track-duration" @click="emit('play', track)">
      {{ formatDuration(track.duration) }}
    </div>

    <div class="track-actions" @click.stop>
      <button
        v-if="editable"
        type="button"
        class="btn btn-ghost btn-sm"
        title="Éditer le genre"
        @click.stop="startEdit"
      >
        ✎
      </button>
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
import { computed, ref } from 'vue';

const props = defineProps<{ track: Track; editable?: boolean }>();
const emit = defineEmits<{
  (e: 'play', track: Track): void;
  (e: 'download', track: Track): void;
  (e: 'genre-updated', track: Track): void;
}>();

const musicStore = useMusicStore();
const isEditing = ref(false);
const genreDraft = ref('');
const saving = ref(false);
const saveError = ref<string | null>(null);

const genreListId = computed(() => `genre-suggestions-${props.track.filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`);

const startEdit = () => {
  genreDraft.value = props.track.genre ?? '';
  isEditing.value = true;
  saveError.value = null;
};

const cancelEdit = () => {
  isEditing.value = false;
  saveError.value = null;
};

const saveGenre = async () => {
  saving.value = true;
  saveError.value = null;
  try {
    const updated = await musicStore.saveTrackGenre(props.track.filename, genreDraft.value);
    isEditing.value = false;
    emit('genre-updated', updated);
  } catch {
    saveError.value = 'Échec de la sauvegarde';
  } finally {
    saving.value = false;
  }
};
const isActive = computed(() => musicStore.currentTrack?.filename === props.track.filename);
const isPlaying = computed(() => musicStore.isPlaying);

const displayTitle = computed(() => props.track.title?.trim() || props.track.filename);

const coverGradient = computed(() => {
  let hash = 0;
  const str = displayTitle.value;
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
  padding: 0.75rem 1.1rem;
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
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.track-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.65rem;
  margin-top: 0.35rem;
}

.meta-row {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  max-width: 100%;
  min-width: 0;
  padding: 0.12rem 0.45rem;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
}

.meta-row dt {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  flex-shrink: 0;
}

.meta-row dd {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row--artist {
  border-color: #c4ddd9;
  background: #f0faf8;
}

.meta-row--artist dt { color: var(--accent-dark); }

.meta-row--album {
  border-color: #ddd6c8;
  background: #faf8f5;
}

.meta-row--album dt { color: #92400e; }

.meta-row--year {
  border-color: #e5e0f0;
  background: #f8f7fc;
}

.meta-row--year dt { color: #5b4b8a; }

.meta-row--genre {
  border-color: #f5d0c8;
  background: #fff7f5;
}

.meta-row--genre dt { color: var(--accent-warm); }

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

.genre-edit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.genre-input {
  width: min(10rem, 100%);
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
}

.genre-error {
  font-size: 0.72rem;
  color: #b91c1c;
  width: 100%;
}

@media (max-width: 640px) {
  .track-meta {
    gap: 0.3rem;
  }

  .meta-row {
    padding: 0.1rem 0.35rem;
  }

  .meta-row dd {
    max-width: 8rem;
  }
}
</style>
