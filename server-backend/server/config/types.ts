export interface MusicFileMetadata {
  filename: string;
  filepath: string;
  title?: string;
  artist?: string;
  albumartist?: string;
  album?: string;
  genre?: string;
  year?: number;
  duration?: number;
  trackNumber?: number;
  language?: string;
  bitrate?: number;
  sampleRate?: number;
}

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

export interface QueueMessage<T = unknown> {
  timestamp: string;
  data: T;
}

export type UpdateCheckerPayload = {
  newFiles: string[]; // absolute paths
};

export type MetaDataPayload = {
  files: MusicFileMetadata[];
};

export type FileSuppressorPayload = {
  processedFiles: string[]; // absolute paths to delete
};
