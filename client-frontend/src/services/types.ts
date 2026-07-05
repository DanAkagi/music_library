export interface Track {
  filename: string;
  title: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  duration?: number; // seconds
  trackNumber?: number;
  language?: string;
  bitrate?: number;
  sampleRate?: number;
}

export interface PlaylistCriteria {
  // include/exclude per category
  artists?: string[];
  excludeArtists?: string[];
  genres?: string[];
  excludeGenres?: string[];
  languages?: string[];
  year?: number;
  /** Durée totale de la playlist en minutes entières (ex. 30 = 30:00 à 30:59). */
  durationMinutes?: number;
  combinationCount?: number;
}