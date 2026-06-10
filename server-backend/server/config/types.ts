export interface MusicFileMetadata {
  filename: string;
  filepath: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  duration?: number; // seconds
  trackNumber?: number;
  language?: string;
  bitrate?: number;
  sampleRate?: number;
  size?: number; // bytes
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

export type SenderApiPayload = MetaDataPayload;

export type FileSuppressorPayload = {
  processedFiles: string[]; // absolute paths to delete
};
