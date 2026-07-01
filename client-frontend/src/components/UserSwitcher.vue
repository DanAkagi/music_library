<template>
  <div class="user-switcher">
    <i class="bi bi-person-circle"></i>
    <select
      class="user-select"
      :value="userStore.currentUserId ?? ''"
      @change="onSelect(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="u in userStore.users" :key="u.id" :value="u.id">{{ u.name }}</option>
    </select>
    <button class="btn-add-user" title="Nouvel utilisateur" @click="showAdd = !showAdd">
      <i class="bi bi-person-plus-fill"></i>
    </button>

    <div v-if="showAdd" class="add-user-popover" @keyup.enter="confirmAdd">
      <input
        v-model="newUserName"
        class="new-user-input"
        placeholder="Nom d'utilisateur"
        autofocus
      />
      <button class="btn-sm" @click="confirmAdd"><i class="bi bi-check"></i></button>
      <button class="btn-sm" @click="showAdd = false"><i class="bi bi-x"></i></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const showAdd = ref(false);
const newUserName = ref('');

const onSelect = (id: string) => {
  userStore.switchUser(id);
};

const confirmAdd = () => {
  const user = userStore.createUser(newUserName.value);
  if (user) {
    userStore.switchUser(user.id);
    newUserName.value = '';
    showAdd.value = false;
  }
};
</script>

<style scoped>
.user-switcher {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.user-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
}
.user-select:focus { border-color: var(--accent); }

.btn-add-user {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.2rem 0.3rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.btn-add-user:hover { color: var(--accent); background: var(--surface2); }

.add-user-popover {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  display: flex;
  gap: 0.35rem;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.5rem;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.new-user-input {
  background: var(--surface2);
  border: 1px solid var(--accent);
  color: var(--text);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
  width: 140px;
}

.btn-sm {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
}
.btn-sm:hover { border-color: var(--accent); color: var(--accent); }
</style>
