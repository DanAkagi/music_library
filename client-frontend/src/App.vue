<template>
  <div class="app">
    <header class="app-header">
      <h1 class="logo"><i class="bi bi-music-note-beamed"></i> Music Library</h1>
      <nav class="tabs">
        <RouterLink to="/" exact-active-class="active">Tous</RouterLink>
        <RouterLink to="/playlists" active-class="active">Saved Playlists</RouterLink>
        <RouterLink to="/generate" active-class="active">Generate Playlist</RouterLink>
        <RouterLink to="/blacklist" active-class="active">Blacklist</RouterLink>
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <MusicPlayer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useMusicStore } from '@/stores/music';
import MusicPlayer from '@/components/MusicPlayer.vue';

const musicStore = useMusicStore();

onMounted(() => {
  musicStore.fetchTracks();
});
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f0f13;
  --surface: #1a1a22;
  --surface2: #23232f;
  --accent: #7c6af7;
  --accent-soft: #4f3df0;
  --text: #e8e6f0;
  --text-muted: #7a7890;
  --border: #2e2e3e;
  --radius: 10px;
  --player-h: 80px;
  font-family: 'Inter', system-ui, sans-serif;
}

body { background: var(--bg); color: var(--text); min-height: 100vh; }

.app { display: flex; flex-direction: column; min-height: 100vh; }

.app-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0 2rem;
  height: 60px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; }

.tabs { display: flex; gap: 0.25rem; }
.tabs a {
  padding: 0.4rem 1rem;
  border-radius: 6px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.15s, background 0.15s;
}
.tabs a:hover { color: var(--text); background: var(--surface2); }
.tabs a.active { color: var(--accent); background: rgba(124, 106, 247, 0.12); }

.app-main {
  flex: 1;
  padding: 1.5rem 2rem;
  padding-bottom: calc(var(--player-h) + 2rem);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>