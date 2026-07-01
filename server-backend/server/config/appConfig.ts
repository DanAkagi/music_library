import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parse un fichier texte de configuration au format `clé=valeur` (une entrée
 * par ligne). Les lignes vides et celles commençant par `#` sont ignorées.
 *
 * Exemple de fichier :
 *   max_duration=120
 */
const parseConfigFile = (filePath: string): Record<string, string> => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (key) result[key] = value;
  }

  return result;
};

let loaded = false;
let maxDurationSeconds: number | undefined;

/**
 * Charge (ou recharge) la configuration depuis le fichier pointé par
 * process.env.CONFIG. Si la variable d'environnement n'est pas définie, ou
 * que le fichier est introuvable/invalide, aucune restriction n'est
 * appliquée (comportement précédent conservé).
 */
export const loadAppConfig = (): void => {
  loaded = true;
  maxDurationSeconds = undefined;

  const configPath = process.env.CONFIG;
  if (!configPath) {
    console.log('[appConfig] Variable CONFIG non définie : aucune durée maximale appliquée.');
    return;
  }

  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`[appConfig] Fichier de configuration introuvable : "${resolvedPath}". Aucune durée maximale appliquée.`);
    return;
  }

  try {
    const parsed = parseConfigFile(resolvedPath);

    if (parsed.max_duration !== undefined) {
      const value = parseInt(parsed.max_duration, 10);
      if (!Number.isNaN(value) && value > 0) {
        maxDurationSeconds = value;
        console.log(`[appConfig] max_duration chargé : ${maxDurationSeconds}s`);
      } else {
        console.warn(`[appConfig] Valeur "max_duration=${parsed.max_duration}" invalide, ignorée.`);
      }
    } else {
      console.log('[appConfig] Aucune clé "max_duration" trouvée dans le fichier de configuration.');
    }
  } catch (err) {
    console.error(`[appConfig] Échec de lecture du fichier de configuration : ${(err as Error).message}`);
  }
};

/**
 * Retourne la durée maximale (en secondes) autorisée pour une chanson,
 * ou `undefined` si aucune restriction n'est configurée.
 * Charge la configuration paresseusement si elle ne l'a pas encore été.
 */
export const getMaxDurationSeconds = (): number | undefined => {
  if (!loaded) loadAppConfig();
  return maxDurationSeconds;
};

/**
 * Vrai si la durée fournie dépasse strictement max_duration.
 * Une durée inconnue (undefined) n'est jamais considérée comme "dépassant"
 * la limite (comportement conservateur : on ne l'exclut pas faute de donnée).
 */
export const exceedsMaxDuration = (durationSeconds?: number): boolean => {
  const max = getMaxDurationSeconds();
  if (max === undefined || durationSeconds === undefined) return false;
  return durationSeconds > max;
};
