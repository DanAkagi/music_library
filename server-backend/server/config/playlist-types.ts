export interface PlaylistCriteria {
  artists?: string[];
  excludeArtists?: string[];
  genres?: string[];
  excludeGenres?: string[];
  languages?: string[];
  yearMin?: number;
  yearMax?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  combinationCount?: number;
}
