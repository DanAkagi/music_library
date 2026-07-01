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

/** Utilisateur local (profil, sans authentification serveur). */
export interface User {
  id: string;
  name: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
  criteria?: PlaylistCriteria;
  /** Identifiant de l'utilisateur propriétaire de la playlist. */
  userId: string;
}

export interface CriterionGroup {
  values: string[];
  mode: 'include' | 'exclude';
}

export interface PlaylistCriteria {
  // include/exclude per category
  artists?: string[];
  excludeArtists?: string[];
  genres?: string[];
  excludeGenres?: string[];
  languages?: string[];
  // ranges
  yearMin?: number;
  yearMax?: number;
  // duration (minutes)
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  // how many combinations to generate
  combinationCount?: number;
}
