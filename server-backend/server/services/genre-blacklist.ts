import fs from 'fs';
import path from 'path';
import { MusicFileMetadata } from '../config/types';
import { normalizeMetadata } from './metadata-normalizer';

const DEFAULT_PATH = path.resolve(process.cwd(), 'config/genre-blacklist.txt');

const resolveBlacklistPath = (): string =>
  path.resolve(process.env.GENRE_BLACKLIST_PATH || DEFAULT_PATH);

const normalizeName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

/** Comparaison insensible à la casse : rock = Rock = ROCK */
const nameMatches = (genre: string, blocked: string): boolean =>
  normalizeName(genre) === normalizeName(blocked);

export const loadGenreBlacklist = (): Set<string> => {
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

export const isGenreBlacklisted = (
  meta: MusicFileMetadata,
  blacklist: Set<string> = loadGenreBlacklist()
): boolean => {
  if (blacklist.size === 0) return false;

  const genre = normalizeMetadata(meta).genre;
  if (!genre) return false;

  for (const blocked of blacklist) {
    if (nameMatches(genre, blocked)) return true;
  }
  return false;
};
