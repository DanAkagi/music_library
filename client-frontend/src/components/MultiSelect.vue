<template>
  <div class="multi-select" ref="wrapper">
    <div class="ms-trigger" @click="open = !open">
      <span v-if="modelValue.length === 0" class="ms-placeholder">{{ placeholder }}</span>
      <span v-else class="ms-tags">
        <span v-for="v in modelValue" :key="v" class="ms-tag">
          {{ v }}
          <button @click.stop="remove(v)"><i class="bi bi-x"></i></button>
        </span>
      </span>
      <span class="ms-arrow"><i :class="open ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i></span>
    </div>
    <div v-if="open" class="ms-dropdown">
      <div
        v-for="opt in options"
        :key="opt"
        class="ms-option"
        :class="{ selected: modelValue.includes(opt) }"
        @click="toggle(opt)"
      >
        {{ opt }}
      </div>
      <div v-if="options.length === 0" class="ms-empty">Aucune option disponible</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  options: string[];
  modelValue: string[];
  placeholder?: string;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string[]): void }>();

const open = ref(false);
const wrapper = ref<HTMLElement | null>(null);

const toggle = (opt: string) => {
  const val = props.modelValue.includes(opt)
    ? props.modelValue.filter((v) => v !== opt)
    : [...props.modelValue, opt];
  emit('update:modelValue', val);
};

const remove = (opt: string) => {
  emit('update:modelValue', props.modelValue.filter((v) => v !== opt));
};

const onClickOutside = (e: MouseEvent) => {
  if (wrapper.value && !wrapper.value.contains(e.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
.multi-select { position: relative; }

.ms-trigger {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; padding: 0.35rem 0.6rem;
  cursor: pointer; min-height: 34px; gap: 0.4rem;
  transition: border-color 0.15s;
}
.ms-trigger:hover { border-color: var(--accent); }

.ms-placeholder { color: var(--text-muted); font-size: 0.82rem; }
.ms-arrow { color: var(--text-muted); font-size: 0.7rem; flex-shrink: 0; }

.ms-tags { display: flex; flex-wrap: wrap; gap: 3px; flex: 1; }
.ms-tag {
  background: rgba(124, 106, 247, 0.2); color: var(--accent);
  border-radius: 4px; padding: 1px 6px; font-size: 0.75rem;
  display: flex; align-items: center; gap: 3px;
}
.ms-tag button {
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 0.7rem; padding: 0; line-height: 1;
}

.ms-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 6px; z-index: 300; max-height: 200px; overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.ms-option {
  padding: 0.45rem 0.75rem; font-size: 0.85rem; cursor: pointer;
  transition: background 0.1s;
}
.ms-option:hover { background: var(--surface2); }
.ms-option.selected { color: var(--accent); background: rgba(124, 106, 247, 0.08); }
.ms-empty { padding: 0.6rem; color: var(--text-muted); font-size: 0.82rem; text-align: center; }
</style>
