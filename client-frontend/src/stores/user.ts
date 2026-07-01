import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/services/types';

const USERS_KEY = 'music_library_users';
const CURRENT_USER_KEY = 'music_library_current_user';

const loadUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Store des utilisateurs locaux (profils simples, sans authentification serveur).
 * Chaque playliste enregistrée est rattachée à l'utilisateur courant (currentUserId).
 */
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>(loadUsers());
  const currentUserId = ref<string | null>(localStorage.getItem(CURRENT_USER_KEY));

  // Garantit qu'il existe toujours au moins un utilisateur et une sélection valide,
  // pour que le reste de l'app (ex: création de playlist) ait toujours un userId à utiliser.
  const ensureValidState = () => {
    if (users.value.length === 0) {
      const defaultUser: User = { id: crypto.randomUUID(), name: 'Moi' };
      users.value.push(defaultUser);
      saveUsers(users.value);
    }
    if (!currentUserId.value || !users.value.some((u) => u.id === currentUserId.value)) {
      currentUserId.value = users.value[0].id;
      localStorage.setItem(CURRENT_USER_KEY, currentUserId.value);
    }
  };
  ensureValidState();

  const currentUser = computed(
    () => users.value.find((u) => u.id === currentUserId.value) || null
  );

  const createUser = (name: string): User | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const user: User = { id: crypto.randomUUID(), name: trimmed };
    users.value.push(user);
    saveUsers(users.value);
    return user;
  };

  const switchUser = (id: string) => {
    if (users.value.some((u) => u.id === id)) {
      currentUserId.value = id;
      localStorage.setItem(CURRENT_USER_KEY, id);
    }
  };

  const renameUser = (id: string, newName: string) => {
    const trimmed = newName.trim();
    const u = users.value.find((u) => u.id === id);
    if (u && trimmed) {
      u.name = trimmed;
      saveUsers(users.value);
    }
  };

  const deleteUser = (id: string) => {
    // On garde toujours au moins un utilisateur
    if (users.value.length <= 1) return;
    users.value = users.value.filter((u) => u.id !== id);
    saveUsers(users.value);
    if (currentUserId.value === id) {
      currentUserId.value = users.value[0].id;
      localStorage.setItem(CURRENT_USER_KEY, currentUserId.value);
    }
  };

  return {
    users,
    currentUserId,
    currentUser,
    createUser,
    switchUser,
    renameUser,
    deleteUser,
  };
});
