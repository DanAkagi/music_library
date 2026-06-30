import path from 'path';
import { parseFile } from 'music-metadata';
import { MusicFileMetadata } from '../config/types';
import { normalizeMetadata } from './metadata-normalizer';

/** Lit les tags ID3 d'un fichier MP3 et retourne les métadonnées normalisées. */
export const extractMetadataFromPath = async (filepath: string): Promise<MusicFileMetadata> => {
  const filename = path.basename(filepath);
  const metadata = await parseFile(filepath, { duration: true });
  const { common, format } = metadata;

  return normalizeMetadata({
    filename,
    filepath,
    title: common.title,
    artist: common.artist || common.artists?.[0],
    albumartist: common.albumartist,
    album: common.album,
    genre: common.genre?.[0],
    year: common.year,
    duration: format.duration ? Math.round(format.duration) : undefined,
    trackNumber: common.track?.no ?? undefined,
    language: common.language,
    bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined,
    sampleRate: format.sampleRate,
  });
};
