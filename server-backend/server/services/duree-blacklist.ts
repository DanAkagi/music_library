import fs from 'fs';
import path from 'path';
import { MusicFileMetadata } from '../config/types';
import { normalizeMetadata } from './metadata-normalizer';

const DEFAULT_PATH = path.resolve(process.cwd(), 'config/duree-blacklist.txt');

const resolveBlacklistPath = (): string =>
  path.resolve(process.env.DUREE_BLACKLIST_PATH || DEFAULT_PATH);

const parseDurationLine = (line: string): number | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.trunc(seconds);
};

export const loadDurationBlacklist = (): number[] => {
  const filePath = resolveBlacklistPath();
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const limits = content
    .split(/\r?\n/)
    .map(parseDurationLine)
    .filter((n): n is number => n !== null);

  return [...new Set(limits)].sort((a, b) => a - b);
};

const getDurationSec = (meta: MusicFileMetadata): number | null => {
  const duration = normalizeMetadata(meta).duration;
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null;
  return duration;
};

/** Bloqué si la durée (secondes) est strictement supérieure à une limite du fichier. */
export const isDurationBlacklisted = (
  meta: MusicFileMetadata,
  limits: number[] = loadDurationBlacklist()
): boolean => {
  if (limits.length === 0) return false;

  const durationSec = getDurationSec(meta);
  if (durationSec === null) return false;

  return limits.some((limit) => durationSec > limit);
};

export const getDurationBlacklistReason = (
  meta: MusicFileMetadata,
  limits: number[] = loadDurationBlacklist()
): string | null => {
  const durationSec = getDurationSec(meta);
  if (durationSec === null) return null;

  const exceeded = limits.filter((limit) => durationSec > limit);
  if (exceeded.length === 0) return null;

  const minLimit = Math.min(...exceeded);
  return `${formatDuration(durationSec)} (${Math.round(durationSec)}s) > ${minLimit}s`;
};

const formatDuration = (seconds: number): string => {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
