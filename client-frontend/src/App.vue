<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon" aria-hidden="true">
          <span class="vinyl-ring" />
        </div>
        <div>
          <h1 class="brand-name">Sonothèque</h1>
          <p class="brand-tagline">Votre bibliothèque</p>
        </div>
      </div>

      <nav class="nav">
        <RouterLink to="/" exact-active-class="active" class="nav-link">
          <span class="nav-icon" aria-hidden="true">◉</span>
          Bibliothèque
        </RouterLink>
        <RouterLink to="/playlists" active-class="active" class="nav-link">
          <span class="nav-icon" aria-hidden="true">▤</span>
          Playlists
        </RouterLink>
        <RouterLink to="/generate" active-class="active" class="nav-link">
          <span class="nav-icon" aria-hidden="true">✦</span>
          Générateur
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <span class="track-count">{{ musicStore.tracks.length }} morceaux</span>
      </div>
    </aside>

    <div class="shell">
      <main class="main">
        <RouterView />
      </main>
    </div>

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
@import './assets/global.css';

.app {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1.75rem 1.25rem;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 2.5rem;
  padding: 0 0.5rem;
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent) 0%, #14b8a6 100%);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.vinyl-ring {
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: block;
}

.brand-name {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.brand-tagline {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.nav-link:focus { outline: none; }
.nav-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.nav-link.active {
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-weight: 600;
  box-shadow: none;
  border: none;
}

.nav-icon {
  font-size: 0.85rem;
  opacity: 0.85;
  width: 1.25rem;
  text-align: center;
}

.sidebar-footer {
  padding: 0.5rem;
  border-top: 1px solid var(--border);
  margin-top: 1rem;
  padding-top: 1rem;
}

.track-count {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ── Main area ── */
.shell {
  flex: 1;
  margin-left: var(--sidebar-w);
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(13, 148, 136, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse at 80% 100%, rgba(220, 90, 69, 0.05) 0%, transparent 50%),
    var(--bg);
}

.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 2.25rem;
  padding-bottom: calc(var(--player-h) + 2.5rem);
}

@media (max-width: 768px) {
  .sidebar {
    position: relative;
    width: 100%;
    bottom: auto;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1rem;
    gap: 1rem;
  }

  .brand { margin-bottom: 0; }
  .nav { flex-direction: row; flex-wrap: wrap; flex: unset; }
  .sidebar-footer { display: none; }

  .shell { margin-left: 0; }
  .app { flex-direction: column; }
  .main { padding: 1.25rem; }
}
</style>
