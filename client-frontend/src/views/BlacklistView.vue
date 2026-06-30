<template>
  <div class="blacklist-view">
    <div class="view-header">
      <h2>Blacklist</h2>
      <div class="header-actions">
        <button class="btn-primary" @click="showAddModal = true">
          <i class="bi bi-plus-lg"></i> Ajouter
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">Chargement...</div>
    <div v-else-if="blacklist.length === 0" class="empty-state">
      Aucune entrée dans la blacklist.
    </div>

    <div v-else class="blacklist-list">
      <div
        v-for="entry in blacklist"
        :key="entry.id"
        class="blacklist-item"
      >
        <div class="blacklist-info">
          <span class="blacklist-value">{{ entry.value }}</span>
          <span class="blacklist-type">{{ entry.type_meta }}</span>
        </div>
        <button
          class="btn-remove"
          @click="removeEntry(entry.id)"
          title="Supprimer"
        >
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Ajouter à la blacklist</h3>
          <button class="btn-close" @click="showAddModal = false">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Valeur</label>
            <input
              v-model="newEntry.value"
              type="text"
              placeholder="ex: Artiste, Genre, Langue..."
            />
          </div>
          <div class="field">
            <label>Type</label>
            <select v-model="newEntry.type_meta">
              <option value="artist">Artiste</option>
              <option value="genre">Genre</option>
              <option value="language">Langue</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddModal = false">Annuler</button>
          <button class="btn-primary" @click="addEntry" :disabled="!newEntry.value">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';

interface BlacklistEntry {
  id: number;
  value: string;
  type_meta: string;
}

const blacklist = ref<BlacklistEntry[]>([]);
const loading = ref(true);
const showAddModal = ref(false);
const newEntry = ref({ value: '', type_meta: 'artist' });

const fetchBlacklist = async () => {
  try {
    const response = await fetch(`${API_URL}/api/blacklist`);
    if (response.ok) {
      blacklist.value = await response.json();
    }
  } catch (err) {
    console.error('Failed to fetch blacklist:', err);
  } finally {
    loading.value = false;
  }
};

const addEntry = async () => {
  try {
    const response = await fetch(`${API_URL}/api/blacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry.value),
    });
    if (response.ok) {
      await fetchBlacklist();
      showAddModal.value = false;
      newEntry.value = { value: '', type_meta: 'artist' };
    }
  } catch (err) {
    console.error('Failed to add entry:', err);
  }
};

const removeEntry = async (id: number) => {
  if (!confirm('Supprimer cette entrée ?')) return;
  try {
    const response = await fetch(`${API_URL}/api/blacklist/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      await fetchBlacklist();
    }
  } catch (err) {
    console.error('Failed to remove entry:', err);
  }
};

onMounted(() => {
  fetchBlacklist();
});
</script>

<style scoped>
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.view-header h2 { font-size: 1.2rem; font-weight: 700; }

.header-actions { display: flex; gap: 0.5rem; }

.btn-primary {
  background: var(--accent);
  border: none;
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-soft); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-secondary {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: var(--accent); color: var(--accent); }

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.blacklist-list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.blacklist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.blacklist-item:last-child { border-bottom: none; }
.blacklist-item:hover { background: var(--surface2); }

.blacklist-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.blacklist-value {
  font-weight: 500;
  font-size: 0.9rem;
}

.blacklist-type {
  background: var(--surface2);
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.btn-remove:hover {
  color: #f87171;
  background: var(--surface2);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 90%;
  max-width: 400px;
  padding: 1.5rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.modal-header h3 { font-size: 1rem; font-weight: 700; }

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
}
.btn-close:hover { color: var(--text); }

.modal-body { margin-bottom: 1rem; }

.field { margin-bottom: 1rem; }
.field label {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}
.field input, .field select {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
}
.field input:focus, .field select:focus { border-color: var(--accent); }

.modal-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
