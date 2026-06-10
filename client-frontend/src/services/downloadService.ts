import JSZip from 'jszip';

const MUSIC_PATH = import.meta.env.VITE_MUSIC_PATH || '/music';

export async function downloadTracksAsZip(filenames: string[], zipName = 'music.zip'): Promise<void> {
  const zip = new JSZip();

  await Promise.all(
    filenames.map(async (filename) => {
      const url = `${MUSIC_PATH}/${filename}`;
      const response = await fetch(url);
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
