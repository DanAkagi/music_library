import type { Track, PlaylistCriteria } from './types';

const getDurationSec = (track: Track): number => {
  const d = track.duration;
  return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : 0;
};

const sumDuration = (tracks: Track[]): number =>
  tracks.reduce((acc, t) => acc + getDurationSec(t), 0);

/** Minutes entières de la durée totale (30:59 → 30). */
const getTotalDurationMinutes = (totalSec: number): number =>
  Math.floor(totalSec / 60);

export function normalizeCriteria(criteria: PlaylistCriteria): PlaylistCriteria {
  const c = { ...criteria };

  if (c.year != null) {
    const y = Math.trunc(c.year);
    c.year = Number.isFinite(y) && y >= 1 ? y : undefined;
  }

  if (c.durationMinutes != null) {
    const m = Math.trunc(c.durationMinutes);
    c.durationMinutes = Number.isFinite(m) && m >= 0 ? m : undefined;
  }

  return c;
}

/** Filtres artiste / genre / année (pas la durée playlist). */
export function applyFilters(tracks: Track[], criteria: PlaylistCriteria): Track[] {
  const c = normalizeCriteria(criteria);

  return tracks.filter((t) => {
    if (c.artists?.length) {
      const match = c.artists.some((a) =>
        t.artist?.toLowerCase().includes(a.toLowerCase())
      );
      if (!match) return false;
    }
    if (c.genres?.length) {
      const match = c.genres.some((g) =>
        t.genre?.toLowerCase().includes(g.toLowerCase())
      );
      if (!match) return false;
    }
    if (c.languages?.length) {
      const match = c.languages.some((l) =>
        t.language?.toLowerCase() === l.toLowerCase()
      );
      if (!match) return false;
    }

    if (c.excludeArtists?.length) {
      const excluded = c.excludeArtists.some((a) =>
        t.artist?.toLowerCase().includes(a.toLowerCase())
      );
      if (excluded) return false;
    }
    if (c.excludeGenres?.length) {
      const excluded = c.excludeGenres.some((g) =>
        t.genre?.toLowerCase().includes(g.toLowerCase())
      );
      if (excluded) return false;
    }

    if (c.year !== undefined) {
      if (t.year === undefined || t.year !== c.year) return false;
    }

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

/**
 * Construit une playlist dont la durée totale tombe dans la minute cible.
 * Ex. 30 → entre 30:00 et 30:59 (somme des morceaux).
 */
function buildPlaylist(candidates: Track[], targetMinutes: number): Track[] {
  const minSec = targetMinutes * 60;
  const maxSecExclusive = (targetMinutes + 1) * 60;
  const pool = candidates.filter((t) => getDurationSec(t) > 0);

  if (pool.length === 0) return [];

  const tryPack = (ordered: Track[]): Track[] => {
    const picked: Track[] = [];
    let total = 0;

    for (const track of ordered) {
      const d = getDurationSec(track);
      if (total + d < maxSecExclusive) {
        picked.push(track);
        total += d;
      }
    }

    if (total >= minSec && getTotalDurationMinutes(total) === targetMinutes) {
      return picked;
    }
    return [];
  };

  const shuffled = tryPack(shuffle(pool));
  if (shuffled.length > 0) return shuffled;

  const byLongest = tryPack([...pool].sort((a, b) => getDurationSec(b) - getDurationSec(a)));
  if (byLongest.length > 0) return byLongest;

  return [];
}

export function generatePlaylists(
  tracks: Track[],
  criteria: PlaylistCriteria,
  count: number = 3
): Track[][] {
  const normalized = normalizeCriteria(criteria);
  const pool = applyFilters(tracks, normalized);
  if (pool.length === 0) return [];

  const targetMinutes = normalized.durationMinutes;
  const needsDurationTarget = targetMinutes !== undefined;

  if (needsDurationTarget) {
    const poolWithDuration = pool.filter((t) => getDurationSec(t) > 0);
    if (poolWithDuration.length === 0) return [];
    const maxPossible = getTotalDurationMinutes(sumDuration(poolWithDuration));
    if (maxPossible < targetMinutes!) return [];
  }

  const results: Track[][] = [];
  const signatures = new Set<string>();
  const MAX_ATTEMPTS = Math.max(count * 40, 60);
  let attempts = 0;

  while (results.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;

    const playlist = needsDurationTarget
      ? buildPlaylist(pool, targetMinutes!)
      : shuffle(pool);

    if (playlist.length === 0) continue;

    const sig = [...playlist].map((t) => t.filename).sort().join('|');
    if (!signatures.has(sig)) {
      signatures.add(sig);
      results.push(playlist);
    }
  }

  return results;
}
