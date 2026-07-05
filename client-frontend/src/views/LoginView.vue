<template>
  <div class="login-page">
    <div class="login-card card">
      <header class="login-head">
        <h1 class="login-title">Sonothèque</h1>
        <p class="login-sub">{{ mode === 'login' ? 'Connexion' : 'Créer un compte' }}</p>
      </header>

      <form class="login-form" @submit.prevent="submit">
        <div class="field">
          <label for="username">Identifiant</label>
          <input id="username" v-model="username" class="input" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            autocomplete="current-password"
            minlength="4"
            required
          />
        </div>

        <p v-if="authStore.error" class="error-msg">{{ authStore.error }}</p>

        <button type="submit" class="btn btn-primary btn-block" :disabled="authStore.isLoading">
          {{ authStore.isLoading ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire" }}
        </button>
      </form>

      <p class="switch-mode">
        <template v-if="mode === 'login'">
          Pas de compte ?
          <button type="button" class="link-btn" @click="switchMode('register')">S'inscrire</button>
        </template>
        <template v-else>
          Déjà un compte ?
          <button type="button" class="link-btn" @click="switchMode('login')">Se connecter</button>
        </template>
      </p>

      <p class="login-note">La bibliothèque musicale est commune à tous les utilisateurs.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePlaylistStore } from '@/stores/playlists';

const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const router = useRouter();
const route = useRoute();

const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');

const switchMode = (next: 'login' | 'register') => {
  mode.value = next;
  authStore.error = null;
};

const submit = async () => {
  try {
    if (mode.value === 'login') {
      await authStore.login(username.value, password.value);
    } else {
      await authStore.register(username.value, password.value);
    }
    await playlistStore.fetchPlaylists();
    const redirect = (route.query.redirect as string) || '/';
    router.replace(redirect);
  } catch {
    // error shown via store
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(13, 148, 136, 0.12) 0%, transparent 55%),
    var(--bg);
}

.login-card {
  width: min(100%, 380px);
  padding: 1.75rem;
}

.login-head {
  margin-bottom: 1.5rem;
}

.login-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
}

.login-sub {
  margin-top: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field label {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.field .input {
  width: 100%;
}

.btn-block {
  width: 100%;
  margin-top: 0.25rem;
}

.error-msg {
  font-size: 0.85rem;
  color: #b91c1c;
}

.switch-mode {
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
}

.link-btn {
  border: none;
  background: none;
  color: var(--accent-dark);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
}

.link-btn:hover {
  text-decoration: underline;
}

.login-note {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.4;
}
</style>
