import JSZip from 'jszip';
import { getTrackAudioUrl } from './audioService';

export async function downloadTracksAsZip(filenames: string[], zipName = 'music.zip'): Promise<void> {
  const zip = new JSZip();

  await Promise.all(
    filenames.map(async (filename) => {
      const response = await fetch(getTrackAudioUrl(filename));
      if (!response.ok) {
        console.warn(`Could not fetch ${filename}: ${response.statusText}`);
        return;
      }
      const blob = await response.blob();
      zip.file(filename, blob);
    })
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
