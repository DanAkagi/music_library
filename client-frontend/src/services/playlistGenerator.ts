import type { Track, PlaylistCriteria } from './types';

/** Apply all criteria filters to a track list. Returns matching tracks. */
export function applyFilters(tracks: Track[], criteria: PlaylistCriteria): Track[] {
  return tracks.filter((t) => {
    // --- Inclusion filters (must match at least one if list is non-empty) ---
    if (criteria.artists?.length) {
      const match = criteria.artists.some((a) =>
        t.artist?.toLowerCase().includes(a.toLowerCase())
      );
      if (!match) return false;
    }
    if (criteria.genres?.length) {
      const match = criteria.genres.some((g) =>
        t.genre?.toLowerCase().includes(g.toLowerCase())
      );
      if (!match) return false;
    }
    if (criteria.languages?.length) {
      const match = criteria.languages.some((l) =>
        t.language?.toLowerCase() === l.toLowerCase()
      );
      if (!match) return false;
    }

    // --- Exclusion filters ---
    if (criteria.excludeArtists?.length) {
      const excluded = criteria.excludeArtists.some((a) =>
        t.artist?.toLowerCase().includes(a.toLowerCase())
      );
      if (excluded) return false;
    }
    if (criteria.excludeGenres?.length) {
      const excluded = criteria.excludeGenres.some((g) =>
        t.genre?.toLowerCase().includes(g.toLowerCase())
      );
      if (excluded) return false;
    }

    // --- Year range ---
    // FIX (bug #3) : un morceau dont l'année est inconnue ne doit PAS contourner
    // le filtre. On applique la même logique que pour artiste/genre/langue :
    // une donnée manquante => le critère ne peut pas être vérifié => exclusion.
    if (criteria.yearMin !== undefined || criteria.yearMax !== undefined) {
      if (t.year === undefined) return false;
      if (criteria.yearMin !== undefined && t.year < criteria.yearMin) return false;
      if (criteria.yearMax !== undefined && t.year > criteria.yearMax) return false;
    }

    return true;
  });
}

/** Shuffle array in place (Fisher-Yates). Used initially to break monotony. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calcule une signature unique et fiable pour un ensemble de morceaux,
 * indépendamment de leur ordre.
 *
 * FIX (bug #4a) : on n'utilise plus `t.filename` (potentiellement absent ou
 * non-unique selon les sources d'import) mais la position du morceau dans le
 * `pool` filtré de cet appel, qui est garantie unique par construction du
 * backtracking (chaque index n'est visité qu'une seule fois par branche).
 */
function signatureFromIndices(indices: number[]): string {
  return [...indices].sort((a, b) => a - b).join(',');
}

/**
 * Generate up to `count` distinct playlist combinations using backtracking.
 * Explores possibilities methodically instead of relying purely on luck.
 *
 * @param previousSignatures Signatures de combinaisons déjà proposées lors d'appels
 *   précédents (ex: clics successifs sur "régénérer"). Le Set est complété en
 *   place : le même Set peut être réutilisé d'un appel à l'autre pour éviter
 *   de reproposer une combinaison déjà vue, même réordonnée.
 *   FIX (bug #4b) : corrige les "doublons" perçus entre deux générations
 *   successives, dus au fait que le dédoublonnage était auparavant local à
 *   un seul appel de la fonction.
 */
export function generatePlaylists(
  tracks: Track[],
  criteria: PlaylistCriteria,
  count: number = 3,
  previousSignatures: Set<string> = new Set()
): Track[][] {
  // FIX (bug #2) : `count` est un plafond, pas un objectif à atteindre.
  // Une valeur nulle ou négative ne doit produire aucune playlist.
  if (count <= 0) return [];

  // 1. Filtrer les morceaux valides
  let pool = applyFilters(tracks, criteria);
  if (pool.length === 0) return [];

  // Mélanger initialement le pool pour que l'exploration de l'arbre
  // ne commence pas toujours par les mêmes morceaux à chaque appel global
  pool = shuffle(pool);

  const minSec = (criteria.minDurationMinutes || 0) * 60;
  const maxSec = criteria.maxDurationMinutes ? (criteria.maxDurationMinutes * 60) + 59 : Infinity;

  // FIX (bug #2) : table des durées cumulées restantes (de l'index i jusqu'à
  // la fin du pool) pour pouvoir élaguer les branches qui ne pourront jamais
  // atteindre `minSec`, même en prenant tous les morceaux restants.
  const remainingDuration = new Array<number>(pool.length + 1).fill(0);
  for (let i = pool.length - 1; i >= 0; i--) {
    remainingDuration[i] = remainingDuration[i + 1] + (pool[i].duration || 0);
  }

  // FIX (bug #5) : couverture obligatoire de chaque valeur incluse.
  // `applyFilters` ne garantit qu'une logique "OU" (le morceau matche au moins
  // une des valeurs) pour construire le pool. Mais quand l'utilisateur inclut
  // plusieurs artistes/genres/langues, chaque playlist générée doit contenir
  // au moins un morceau pour CHACUNE de ces valeurs (logique "ET" au niveau
  // de la combinaison), pas juste piocher dans la première valeur venue.
  const reqArtists = criteria.artists ?? [];
  const reqGenres = criteria.genres ?? [];
  const reqLanguages = criteria.languages ?? [];

  // Pour chaque morceau du pool, quels index de valeurs requises satisfait-il ?
  const artistMatches: number[][] = pool.map((t) =>
    reqArtists.reduce<number[]>((acc, a, idx) => {
      if (t.artist?.toLowerCase().includes(a.toLowerCase())) acc.push(idx);
      return acc;
    }, [])
  );
  const genreMatches: number[][] = pool.map((t) =>
    reqGenres.reduce<number[]>((acc, g, idx) => {
      if (t.genre?.toLowerCase().includes(g.toLowerCase())) acc.push(idx);
      return acc;
    }, [])
  );
  const languageMatches: number[][] = pool.map((t) =>
    reqLanguages.reduce<number[]>((acc, l, idx) => {
      if (t.language?.toLowerCase() === l.toLowerCase()) acc.push(idx);
      return acc;
    }, [])
  );

  // Dernier index du pool où chaque valeur requise apparaît encore, pour élaguer
  // les branches qui ne pourront de toute façon jamais atteindre la couverture.
  function lastReachableIndex(matches: number[][], reqCount: number): number[] {
    const last = new Array<number>(reqCount).fill(-1);
    matches.forEach((idxs, poolIdx) => {
      idxs.forEach((reqIdx) => {
        last[reqIdx] = poolIdx;
      });
    });
    return last;
  }
  const lastArtist = lastReachableIndex(artistMatches, reqArtists.length);
  const lastGenre = lastReachableIndex(genreMatches, reqGenres.length);
  const lastLanguage = lastReachableIndex(languageMatches, reqLanguages.length);

  // Si une valeur requise n'apparaît dans aucun morceau du pool, aucune
  // playlist ne pourra jamais couvrir tous les critères : inutile d'explorer.
  if (
    lastArtist.some((v) => v === -1) ||
    lastGenre.some((v) => v === -1) ||
    lastLanguage.some((v) => v === -1)
  ) {
    return [];
  }

  const artistCoverage = new Array<number>(reqArtists.length).fill(0);
  const genreCoverage = new Array<number>(reqGenres.length).fill(0);
  const languageCoverage = new Array<number>(reqLanguages.length).fill(0);

  function isFullyCovered(): boolean {
    return (
      artistCoverage.every((c) => c > 0) &&
      genreCoverage.every((c) => c > 0) &&
      languageCoverage.every((c) => c > 0)
    );
  }

  // Vrai s'il reste, à partir de `index`, une chance d'atteindre une
  // couverture complète pour chaque valeur pas encore couverte.
  function canStillCover(index: number): boolean {
    for (let j = 0; j < reqArtists.length; j++) {
      if (artistCoverage[j] === 0 && lastArtist[j] < index) return false;
    }
    for (let j = 0; j < reqGenres.length; j++) {
      if (genreCoverage[j] === 0 && lastGenre[j] < index) return false;
    }
    for (let j = 0; j < reqLanguages.length; j++) {
      if (languageCoverage[j] === 0 && lastLanguage[j] < index) return false;
    }
    return true;
  }

  const results: Track[][] = [];
  const signatures = previousSignatures;

  /**
   * Fonction récursive de Backtracking
   * @param index L'index du morceau courant dans le pool
   * @param currentTracks Les morceaux actuellement sélectionnés dans la combinaison
   * @param currentIndices Les index (dans pool) des morceaux sélectionnés, pour la signature
   * @param currentDuration La durée cumulée en secondes
   */
  function backtrack(
    index: number,
    currentTracks: Track[],
    currentIndices: number[],
    currentDuration: number
  ) {
    // Si on a trouvé le nombre de playlists demandées, on stoppe l'exploration
    if (results.length >= count) return;

    // FIX (bug #2) : élagage — si même en ajoutant tous les morceaux restants
    // on ne peut pas atteindre minSec, inutile d'explorer cette branche plus loin.
    if (currentDuration + remainingDuration[index] < minSec) return;

    // FIX (bug #5) : élagage — si une valeur requise (artiste/genre/langue) n'est
    // plus atteignable avec les morceaux restants et n'est pas déjà couverte,
    // cette branche ne pourra jamais produire de playlist valide.
    if (!canStillCover(index)) return;

    // Si la combinaison actuelle respecte les bornes, couvre bien chaque valeur
    // incluse (artiste(s)/genre(s)/langue(s)) ET contient au moins un morceau,
    // on l'évalue.
    // FIX (bug #1) : on exige explicitement currentTracks.length > 0 pour ne
    // jamais accepter une playlist vide (cas minSec === 0).
    if (
      currentTracks.length > 0 &&
      currentDuration >= minSec &&
      currentDuration <= maxSec &&
      isFullyCovered()
    ) {
      // Signature unique basée sur les index des morceaux dans le pool (triés)
      // pour éviter de proposer deux fois les mêmes morceaux dans un ordre différent.
      const sig = signatureFromIndices(currentIndices);

      if (!signatures.has(sig)) {
        signatures.add(sig);
        // On insère une copie mélangée pour l'expérience d'écoute de l'utilisateur
        results.push(shuffle(currentTracks));
      }
    }

    // Si on a dépassé le max ou qu'on a parcouru tout le pool, on s'arrête pour cette branche
    if (currentDuration > maxSec || index >= pool.length) return;

    // --- EXPLORATION DES CHOIX ---

    // Choix 1 : On inclut le morceau actuel (si sa durée est connue)
    const track = pool[index];
    const trackDuration = track.duration || 0;

    if (currentDuration + trackDuration <= maxSec) {
      currentTracks.push(track);
      currentIndices.push(index);
      // On incrémente la couverture pour chaque valeur requise satisfaite par ce morceau
      artistMatches[index].forEach((j) => artistCoverage[j]++);
      genreMatches[index].forEach((j) => genreCoverage[j]++);
      languageMatches[index].forEach((j) => languageCoverage[j]++);

      backtrack(index + 1, currentTracks, currentIndices, currentDuration + trackDuration);

      // Backtrack : on retire le morceau et on annule sa contribution à la couverture
      artistMatches[index].forEach((j) => artistCoverage[j]--);
      genreMatches[index].forEach((j) => genreCoverage[j]--);
      languageMatches[index].forEach((j) => languageCoverage[j]--);
      currentIndices.pop();
      currentTracks.pop();
    }

    // Choix 2 : On n'inclut PAS le morceau actuel, on passe directement au suivant
    backtrack(index + 1, currentTracks, currentIndices, currentDuration);
  }

  // Lancer l'exploration à partir du premier élément
  backtrack(0, [], [], 0);

  return results;
}