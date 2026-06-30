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
  // ranges
  yearMin?: number;
  yearMax?: number;
  // duration (minutes)
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  // how many combinations to generate
  combinationCount?: number;
}