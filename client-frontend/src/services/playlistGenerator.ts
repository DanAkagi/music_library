import type { Track, PlaylistCriteria } from './types';

const getDurationSec = (track: Track): number => {
  const d = track.duration;
  return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : 0;
};

/** Minutes entières de la piste (2:50 → 2). */
const getTrackDurationMinutes = (track: Track): number =>
  Math.floor(getDurationSec(track) / 60);

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

/** Apply all criteria filters to a track list. Returns matching tracks. */
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

    if (c.durationMinutes !== undefined) {
      if (getDurationSec(t) <= 0) return false;
      if (getTrackDurationMinutes(t) !== c.durationMinutes) return false;
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

export function generatePlaylists(
  tracks: Track[],
  criteria: PlaylistCriteria,
  count: number = 3
): Track[][] {
  const normalized = normalizeCriteria(criteria);
  const pool = applyFilters(tracks, normalized);
  if (pool.length === 0) return [];

  const results: Track[][] = [];
  const signatures = new Set<string>();
  const MAX_ATTEMPTS = Math.max(count * 20, 30);
  let attempts = 0;

  while (results.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const playlist = shuffle(pool);
    if (playlist.length === 0) continue;

    const sig = [...playlist].map((t) => t.filename).sort().join('|');
    if (!signatures.has(sig)) {
      signatures.add(sig);
      results.push(playlist);
    }
  }

  return results;
}
