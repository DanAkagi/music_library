import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/services/authService';
import { loginApi, registerApi, fetchMeApi, logoutApi } from '@/services/authService';
import { getAuthToken } from '@/services/http';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  const restoreSession = async (): Promise<boolean> => {
    if (!getAuthToken()) return false;
    isLoading.value = true;
    error.value = null;
    try {
      user.value = await fetchMeApi();
      return true;
    } catch {
      logoutApi();
      user.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (username: string, password: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { user: u } = await loginApi(username, password);
      user.value = u;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      error.value = msg || 'Connexion impossible';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (username: string, password: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { user: u } = await registerApi(username, password);
      user.value = u;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      error.value = msg || 'Inscription impossible';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    logoutApi();
    user.value = null;
    error.value = null;
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    restoreSession,
    login,
    register,
    logout,
  };
});
