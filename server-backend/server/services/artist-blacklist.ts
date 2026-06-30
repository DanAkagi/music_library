import fs from 'fs';
import path from 'path';
import { MusicFileMetadata } from '../config/types';
import { normalizeMetadata } from './metadata-normalizer';

const DEFAULT_PATH = path.resolve(process.cwd(), 'config/artist-blacklist.txt');

const resolveBlacklistPath = (): string =>
  path.resolve(process.env.ARTIST_BLACKLIST_PATH || DEFAULT_PATH);

const normalizeName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

/** Comparaison insensible à la casse : justin = Justin = JUSTIN */
const nameMatches = (artist: string, blocked: string): boolean =>
  normalizeName(artist) === normalizeName(blocked);

export const loadArtistBlacklist = (): Set<string> => {
  const filePath = resolveBlacklistPath();
  if (!fs.existsSync(filePath)) return new Set();

  const content = fs.readFileSync(filePath, 'utf-8');
  const names = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(normalizeName);

  return new Set(names);
};

export const isArtistBlacklisted = (
  meta: MusicFileMetadata,
  blacklist: Set<string> = loadArtistBlacklist()
): boolean => {
  if (blacklist.size === 0) return false;

  const artist = normalizeMetadata(meta).artist;
  if (!artist) return false;

  for (const blocked of blacklist) {
    if (nameMatches(artist, blocked)) return true;
  }
  return false;
};
