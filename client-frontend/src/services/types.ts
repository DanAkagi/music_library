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

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
  criteria?: PlaylistCriteria;
}

export interface PlaylistCriteria {
  // include/exclude per category
  artists?: string[];
  excludeArtists?: string[];
  genres?: string[];
  excludeGenres?: string[];
  languages?: string[];
  year?: number;
  /** Durée par morceau en minutes entières exactes (ex. 2 = 2:00 à 2:59). */
  durationMinutes?: number;
  combinationCount?: number;
}