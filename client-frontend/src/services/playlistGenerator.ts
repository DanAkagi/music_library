import type { Track, PlaylistCriteria } from './types';

/** Apply all criteria filters to a track list. Returns matching tracks. */
export function applyFilters(tracks: Track[], criteria: PlaylistCriteria): Track[] {
  return tracks.filter((t) => {
    // --- Inclusion filters (must match at least one if list is non-empty) ---
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

    // --- Exclusion filters ---
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

    // --- Year range ---
    if (criteria.yearMin !== undefined && t.year !== undefined && t.year < criteria.yearMin) return false;
    if (criteria.yearMax !== undefined && t.year !== undefined && t.year > criteria.yearMax) return false;

    return true;
  });
}

/** Shuffle array in place (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate one playlist respecting optional total-duration constraints.
 * If maxDurationMinutes is set, greedily fills up to the limit.
 * If minDurationMinutes is set, returns [] when total falls short.
 */
function buildPlaylist(candidates: Track[], criteria: PlaylistCriteria): Track[] {
  if (!criteria.maxDurationMinutes) {
    // No duration cap — return all candidates
    const total = candidates.reduce((s, t) => s + (t.duration || 0), 0);
    if (criteria.minDurationMinutes && total < criteria.minDurationMinutes * 60) return [];
    return candidates;
  }

  const maxSec = criteria.maxDurationMinutes * 60;
  const minSec = (criteria.minDurationMinutes || 0) * 60;
  let total = 0;
  const result: Track[] = [];
  for (const t of candidates) {
    if (total + (t.duration || 0) <= maxSec) {
      result.push(t);
      total += t.duration || 0;
    }
  }
  if (total < minSec) return [];
  return result;
}

/**
 * Generate up to `count` distinct playlist combinations.
 * Each combination is a different random ordering of the filtered pool,
 * sliced to fit duration constraints.
 */
export function generatePlaylists(
  tracks: Track[],
  criteria: PlaylistCriteria,
  count: number = 3
): Track[][] {
  const pool = applyFilters(tracks, criteria);
  if (pool.length === 0) return [];

  const results: Track[][] = [];
  const signatures = new Set<string>();
  const MAX_ATTEMPTS = count * 10;
  let attempts = 0;

  while (results.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const shuffled = shuffle(pool);
    const playlist = buildPlaylist(shuffled, criteria);
    if (playlist.length === 0) continue;

    // Signature = sorted filenames to detect duplicate sets
    const sig = [...playlist].map((t) => t.filename).sort().join('|');
    if (!signatures.has(sig)) {
      signatures.add(sig);
      results.push(playlist);
    }
  }

  return results;
}