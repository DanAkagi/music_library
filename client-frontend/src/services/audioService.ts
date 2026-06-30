/**
 * URL de lecture audio — passe par l'API backend (Range requests, noms de fichiers encodés).
 * En dev, Vite proxy `/api` → localhost:3000 (même origine, pas de souci CORS).
 */
export function getTrackAudioUrl(filename: string): string {
  return `/api/music/stream/${encodeURIComponent(filename)}`;
}
