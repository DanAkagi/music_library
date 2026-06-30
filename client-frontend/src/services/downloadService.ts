import JSZip from 'jszip';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';

export async function downloadTracksAsZip(filenames: string[], zipName = 'music.zip'): Promise<void> {
  const zip = new JSZip();

  await Promise.all(
    filenames.map(async (filename) => {
      const url = `${API_URL}/api/music/stream/${encodeURIComponent(filename)}`;
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
