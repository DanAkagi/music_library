import path from 'path';
import { MusicFileMetadata } from '../config/types';

const JUNK_PATTERNS: RegExp[] = [
  /\(MP3_\d+K\)/gi,
  /\(Official\s+Audio\)/gi,
  /\(Official\s+Video\)/gi,
  /\[Official\s+Video\]/gi,
  /\[Official\s+Audio\]/gi,
  /\[MV\]/gi,
  /\[Lyrics\]/gi,
  /HD\s*\d+p/gi,
  /HDYoutube/gi,
  /Official\s+Video/gi,
  /Official\s+Audio/gi,
  /_HQ\s*Audio/gi,
  /\s*_\s*/g,
];

const cleanText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  let text = value.trim();
  for (const pattern of JUNK_PATTERNS) {
    text = text.replace(pattern, ' ');
  }
  text = text.replace(/\s+/g, ' ').trim();
  return text || undefined;
};

const cleanBaseName = (filename: string): string => {
  const base = filename.replace(/\.mp3$/i, '');
  return cleanText(base) || base;
};

const isSameText = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

const isNoisyTitle = (title: string, cleanFile: string): boolean => {
  const t = title.toLowerCase();
  const f = cleanFile.toLowerCase();
  return (
    t === f ||
    t.length > 70 ||
    /hd\s*\d+p/i.test(title) ||
    /official video/i.test(title) ||
    /mp3_\d+k/i.test(title) ||
    /hdyoutube/i.test(title)
  );
};

/** Extrait artiste = préfixe du nom de fichier avant le titre connu */
const artistFromFilenamePrefix = (cleanFile: string, title: string): string | undefined => {
  const fileLower = cleanFile.toLowerCase();
  const titleLower = title.toLowerCase();
  const idx = fileLower.indexOf(titleLower);
  if (idx <= 0) return undefined;
  const prefix = cleanFile.slice(0, idx).replace(/[\s\-–—|]+$/g, '').trim();
  return prefix || undefined;
};

/** Parse "Artiste - Titre" ou variantes */
const splitOnSeparator = (cleanFile: string): { artist?: string; title?: string } => {
  const separators = [' - ', ' – ', ' — ', ' | '];
  for (const sep of separators) {
    const idx = cleanFile.indexOf(sep);
    if (idx > 0) {
      return {
        artist: cleanFile.slice(0, idx).trim(),
        title: cleanFile.slice(idx + sep.length).trim(),
      };
    }
  }
  return {};
};

const stripArtistFromTitle = (title: string, artist?: string): string => {
  if (!artist) return title;
  const lowerTitle = title.toLowerCase();
  const lowerArtist = artist.toLowerCase();
  if (lowerTitle.startsWith(lowerArtist)) {
    const rest = title.slice(artist.length).replace(/^[\s\-–—|]+/, '').trim();
    if (rest) return rest;
  }
  return title;
};

/** Devine artiste + titre depuis les mots du nom de fichier (MP3 YouTube sans tags) */
const guessArtistTitleFromWords = (cleanFile: string): { artist?: string; title?: string } => {
  const words = cleanFile.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { title: cleanFile };

  let best: { artist?: string; title?: string } = { title: cleanFile };
  let bestScore = -1;

  for (let titleWords = 1; titleWords <= Math.min(5, words.length - 1); titleWords++) {
    const title = words.slice(-titleWords).join(' ');
    const artist = words.slice(0, -titleWords).join(' ');
    if (!artist) continue;

    let score = 0;
    const firstWord = title.split(/\s+/)[0] ?? '';
    if (/^[A-Z][a-z]/.test(firstWord)) score += 2;
    if (/[a-z]/.test(title)) score += 1;
    if (/\b(du|de|des|la|le|les|the|feat|ft)\b/i.test(title)) score += 2;
    if (titleWords >= 2 && titleWords <= 4) score += 1;
    if (artist.length >= 3) score += 1;

    if (score > bestScore || (score === bestScore && titleWords > (best.title?.split(/\s+/).length ?? 0))) {
      bestScore = score;
      best = { artist, title };
    }
  }

  return best;
};

/**
 * Normalise titre / artiste / album :
 * - retire le bruit YouTube (HD, Official Video, MP3_160K…)
 * - évite artiste === album === titre
 * - déduit artiste depuis le nom de fichier si les tags ID3 sont mauvais
 */
export const normalizeMetadata = (meta: MusicFileMetadata): MusicFileMetadata => {
  const cleanFile = cleanBaseName(meta.filename);
  const fromSeparator = splitOnSeparator(cleanFile);

  let title = cleanText(meta.title) || cleanText(fromSeparator.title);
  let artist = cleanText(meta.artist);
  let album = cleanText(meta.album);

  // Tags ID3 YouTube : album = nom de chaîne = artiste
  if (album && artist && isSameText(album, artist)) {
    album = undefined;
  }
  if (album && title && isSameText(album, title)) {
    album = undefined;
  }

  // Titre ID3 trop long ou = nom de fichier entier
  if (!title || isNoisyTitle(title, cleanFile)) {
    title = fromSeparator.title || cleanText(cleanFile);
  }

  // Si le titre propre apparaît dans le nom de fichier → artiste = préfixe
  if (title && !isNoisyTitle(title, cleanFile)) {
    const prefixArtist = artistFromFilenamePrefix(cleanFile, title);
    if (prefixArtist) {
      artist = prefixArtist;
    }
  }

  // Séparateur "Artiste - Titre" dans le fichier
  if (fromSeparator.artist && fromSeparator.title) {
    if (!artist || isSameText(artist, title) || isSameText(artist, album)) {
      artist = fromSeparator.artist;
    }
    if (title && (isNoisyTitle(title, cleanFile) || isSameText(title, artist))) {
      title = fromSeparator.title;
    }
  }

  // Artiste manquant ou identique au titre
  if (!artist || isSameText(artist, title)) {
    const prefixArtist = title ? artistFromFilenamePrefix(cleanFile, title) : undefined;
    artist = prefixArtist || fromSeparator.artist;
  }

  // Dernier recours : deviner artiste / titre par mots (fichiers YouTube sans séparateur)
  if (!artist || isSameText(artist, title) || (title ? isNoisyTitle(title, cleanFile) : true)) {
    const guessed = guessArtistTitleFromWords(cleanFile);
    if (guessed.artist && guessed.title) {
      artist = guessed.artist;
      title = guessed.title;
    }
  }

  title = stripArtistFromTitle(title || cleanFile, artist);
  title = cleanText(title) || cleanFile;

  if (artist) {
    artist = cleanText(artist);
  }

  // Dernière vérification : pas de doublon titre/artiste
  if (artist && isSameText(artist, title)) {
    const fallback = splitOnSeparator(cleanFile);
    artist = fallback.artist;
    title = fallback.title || title;
  }

  // Ne pas répéter le titre dans album
  if (album && (isSameText(album, artist) || isSameText(album, title))) {
    album = undefined;
  }

  return {
    ...meta,
    title,
    artist: artist || undefined,
    album: album || undefined,
  };
};

/** Pour réappliquer la normalisation depuis une ligne DB (filename connu) */
export const normalizeFromFilename = (
  filename: string,
  fields: Pick<MusicFileMetadata, 'title' | 'artist' | 'album' | 'genre' | 'year' | 'duration'>
): Pick<MusicFileMetadata, 'title' | 'artist' | 'album'> => {
  const normalized = normalizeMetadata({
    filename,
    filepath: path.join('virtual', filename),
    ...fields,
  });
  return {
    title: normalized.title || filename,
    artist: normalized.artist,
    album: normalized.album,
  };
};
