import type { Track, PlaylistCriteria } from './types';

export function generatePlaylist(tracks: Track[], criteria: PlaylistCriteria): Track[] {
  let filtered = [...tracks];

  if (criteria.artists?.length) {
    filtered = filtered.filter((t) =>
      t.artist && criteria.artists!.some((a) => t.artist!.toLowerCase().includes(a.toLowerCase()))
    );
  }
  if (criteria.excludeArtists?.length) {
    filtered = filtered.filter(
      (t) =>
        !t.artist ||
        !criteria.excludeArtists!.some((a) => t.artist!.toLowerCase().includes(a.toLowerCase()))
    );
  }
  if (criteria.genres?.length) {
    filtered = filtered.filter(
      (t) =>
        t.genre &&
        criteria.genres!.some((g) => t.genre!.toLowerCase().includes(g.toLowerCase()))
    );
  }
  if (criteria.excludeGenres?.length) {
    filtered = filtered.filter(
      (t) =>
        !t.genre ||
        !criteria.excludeGenres!.some((g) => t.genre!.toLowerCase().includes(g.toLowerCase()))
    );
  }
  if (criteria.languages?.length) {
    filtered = filtered.filter(
      (t) =>
        t.language &&
        criteria.languages!.some((l) => t.language!.toLowerCase() === l.toLowerCase())
    );
  }
  if (criteria.yearMin !== undefined) {
    filtered = filtered.filter((t) => t.year !== undefined && t.year >= criteria.yearMin!);
  }
  if (criteria.yearMax !== undefined) {
    filtered = filtered.filter((t) => t.year !== undefined && t.year <= criteria.yearMax!);
  }

  // Duration fitting: greedily add tracks until max total duration
  if (criteria.maxDurationMinutes !== undefined) {
    const maxSeconds = criteria.maxDurationMinutes * 60;
    let total = 0;
    filtered = filtered.filter((t) => {
      if (total + (t.duration || 0) <= maxSeconds) {
        total += t.duration || 0;
        return true;
      }
      return false;
    });
  }

  if (criteria.minDurationMinutes !== undefined) {
    const minSeconds = criteria.minDurationMinutes * 60;
    const totalDuration = filtered.reduce((acc, t) => acc + (t.duration || 0), 0);
    if (totalDuration < minSeconds) return []; // Not enough content
  }

  return filtered;
}
