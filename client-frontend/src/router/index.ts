import { createRouter, createWebHistory } from 'vue-router';
import LibraryView from '@/views/LibraryView.vue';
import PlaylistsView from '@/views/PlaylistsView.vue';
import GeneratePlaylistView from '@/views/GeneratePlaylistView.vue';
import BlacklistView from '@/views/BlacklistView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'library',
      component: LibraryView,
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: PlaylistsView,
    },
    {
      path: '/generate',
      name: 'generate',
      component: GeneratePlaylistView,
    },
    {
      path: '/blacklist',
      name: 'blacklist',
      component: BlacklistView,
    },
  ],
});

export default router;
