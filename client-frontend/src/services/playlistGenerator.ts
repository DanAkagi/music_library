import type { Track, PlaylistCriteria } from './types';

const getDurationSec = (track: Track): number => {
  const d = track.duration;
  return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : 0;
};

const sumDuration = (tracks: Track[]): number =>
  tracks.reduce((acc, t) => acc + getDurationSec(t), 0);

/** Apply all criteria filters to a track list. Returns matching tracks. */
export function applyFilters(tracks: Track[], criteria: PlaylistCriteria): Track[] {
  return tracks.filter((t) => {
    if (criteria.artists?.length) {
      const match = criteria.artists.some((a) =>
        t.artist?.toLowerCase().includes(a.toLowerCase())
      );
      if (!match) return false;
    }
    if (criteria.genres?.length) {
      const match = criteria.genres.some((g) =>
        t.genre?.toLowerCase().includes(g.toLowerCase())
      );
      if (!match) return false;
    }
    if (criteria.languages?.length) {
      const match = criteria.languages.some((l) =>
        t.language?.toLowerCase() === l.toLowerCase()
      );
      if (!match) return false;
    }

    if (criteria.excludeArtists?.length) {
      const excluded = criteria.excludeArtists.some((a) =>
        t.artist?.toLowerCase().includes(a.toLowerCase())
      );
      if (excluded) return false;
    }
    if (criteria.excludeGenres?.length) {
      const excluded = criteria.excludeGenres.some((g) =>
        t.genre?.toLowerCase().includes(g.toLowerCase())
      );
      if (excluded) return false;
    }

    if (criteria.yearMin !== undefined && t.year !== undefined && t.year < criteria.yearMin) return false;
    if (criteria.yearMax !== undefined && t.year !== undefined && t.year > criteria.yearMax) return false;

    return true;
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Remplit une playlist sans dépasser maxSec (ordre des morceaux conservé). */
const packUpToMax = (ordered: Track[], maxSec: number): Track[] => {
  const picked: Track[] = [];
  let total = 0;
  for (const track of ordered) {
    const d = getDurationSec(track);
    if (d > 0 && total + d <= maxSec) {
      picked.push(track);
      total += d;
    }
  }
  return picked;
};

/** Construit une playlist d'au moins minSec en ajoutant des morceaux dans l'ordre donné. */
const packToMin = (ordered: Track[], minSec: number): Track[] => {
  const picked: Track[] = [];
  let total = 0;
  for (const track of ordered) {
    const d = getDurationSec(track);
    if (d <= 0) continue;
    picked.push(track);
    total += d;
    if (total >= minSec) break;
  }
  return total >= minSec ? picked : [];
};

/**
 * Durée totale de la playlist en secondes :
 * - max seul → remplir jusqu'au plafond
 * - min seul → sous-ensemble d'au moins min minutes
 * - min + max → entre les deux bornes
 */
function buildPlaylist(candidates: Track[], criteria: PlaylistCriteria): Track[] {
  const minSec =
    criteria.minDurationMinutes != null && criteria.minDurationMinutes > 0
      ? criteria.minDurationMinutes * 60
      : 0;
  const hasMax =
    criteria.maxDurationMinutes != null && criteria.maxDurationMinutes > 0;
  const maxSec = hasMax ? criteria.maxDurationMinutes! * 60 : Infinity;

  const needsDuration = minSec > 0 || hasMax;
  const pool = needsDuration
    ? candidates.filter((t) => getDurationSec(t) > 0)
    : candidates;

  if (pool.length === 0) return needsDuration ? [] : candidates;
  if (!needsDuration) return pool;

  // Pool insuffisant pour le minimum global
  if (minSec > 0 && sumDuration(pool) < minSec) return [];

  let picked: Track[] = [];

  if (hasMax) {
    // Essai 1 : ordre aléatoire (déjà mélangé en amont)
    picked = packUpToMax(pool, maxSec);

    // Essai 2 : morceaux les plus longs d'abord → mieux remplir le max / atteindre le min
    if (sumDuration(picked) < minSec) {
      const byLongest = [...pool].sort((a, b) => getDurationSec(b) - getDurationSec(a));
      const alt = packUpToMax(byLongest, maxSec);
      if (sumDuration(alt) > sumDuration(picked)) picked = alt;
    }
  } else if (minSec > 0) {
    picked = packToMin(pool, minSec);
  }

  if (sumDuration(picked) < minSec) return [];
  return picked;
}

export function generatePlaylists(
  tracks: Track[],
  criteria: PlaylistCriteria,
  count: number = 3
): Track[][] {
  const pool = applyFilters(tracks, criteria);
  if (pool.length === 0) return [];

  const results: Track[][] = [];
  const signatures = new Set<string>();
  const MAX_ATTEMPTS = Math.max(count * 20, 30);
  let attempts = 0;

  while (results.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const shuffled = shuffle(pool);
    const playlist = buildPlaylist(shuffled, criteria);
    if (playlist.length === 0) continue;

    const sig = [...playlist].map((t) => t.filename).sort().join('|');
    if (!signatures.has(sig)) {
      signatures.add(sig);
      results.push(playlist);
    }
  }

  return results;
}

/** Durée totale en secondes (utilitaire UI / tests). */
export const getPlaylistDurationSec = (tracks: Track[]): number => sumDuration(tracks);
