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
  artists?: string[];
  excludeArtists?: string[];
  genres?: string[];
  excludeGenres?: string[];
  languages?: string[];
  yearMin?: number;
  yearMax?: number;
  maxDurationMinutes?: number;
  minDurationMinutes?: number;
}
