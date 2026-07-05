import { createRouter, createWebHistory } from 'vue-router';
import LibraryView from '@/views/LibraryView.vue';
import PlaylistsView from '@/views/PlaylistsView.vue';
import GeneratePlaylistView from '@/views/GeneratePlaylistView.vue';
import LoginView from '@/views/LoginView.vue';
import { useAuthStore } from '@/stores/auth';
import { getAuthToken } from '@/services/http';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true },
    },
    {
      path: '/',
      name: 'library',
      component: LibraryView,
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: PlaylistsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/generate',
      name: 'generate',
      component: GeneratePlaylistView,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!authStore.user && getAuthToken()) {
    await authStore.restoreSession();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return { name: 'library' };
  }
});

export default router;
