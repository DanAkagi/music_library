export interface MusicFileMetadata {
  filename: string;
  filepath?: string | null;
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

/**
 * Entrée décrivant un fichier traité par sender-api à destination de
 * file-suppressor. On y garde `duration` en plus de `filepath` pour que
 * file-suppressor puisse lui aussi appliquer (en défense en profondeur)
 * l'exclusion des chansons dépassant `max_duration`.
 */
export type FileSuppressorEntry = {
  filepath: string; // absolute path to delete
  duration?: number; // seconds
};

export type FileSuppressorPayload = {
  processedFiles: FileSuppressorEntry[];
};
