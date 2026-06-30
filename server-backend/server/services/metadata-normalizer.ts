import path from 'path';
import { MusicFileMetadata } from '../config/types';

const cleanText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const text = value.trim().replace(/\s+/g, ' ');
  return text || undefined;
};

/** Conserve les métadonnées ID3 telles quelles. Artiste : album artist → artist. */
export const normalizeMetadata = (meta: MusicFileMetadata): MusicFileMetadata => {
  const title = cleanText(meta.title);
  const artist = cleanText(meta.albumartist) || cleanText(meta.artist);
  const album = cleanText(meta.album);

  return {
    ...meta,
    title,
    artist,
    album,
    genre: cleanText(meta.genre) || meta.genre,
    year: meta.year ?? undefined,
    duration: meta.duration,
    trackNumber: meta.trackNumber,
    language: cleanText(meta.language) || meta.language,
    bitrate: meta.bitrate,
    sampleRate: meta.sampleRate,
  };
};
