export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function triggerAudioDownload(
  base64: string,
  mimeType: string,
  filename: string
): void {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function buildDownloadFilename(
  title: string,
  extension: "mp3" | "wav"
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${slug || "cadence-voice"}-${dateStamp}.${extension}`;
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const rounded = Math.floor(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function extractWaveformPeaks(
  wavBase64: string,
  barCount = 72
): Promise<number[]> {
  try {
    const blob = base64ToBlob(wavBase64, "audio/wav");
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return createFallbackPeaks(barCount);
    }
    const ctx = new AudioCtx();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channel = audioBuffer.getChannelData(0);
      const step = Math.max(1, Math.floor(channel.length / barCount));
      const rawPeaks: number[] = [];

      for (let i = 0; i < barCount; i++) {
        const start = i * step;
        const end = Math.min(channel.length, start + step);
        let maxAmp = 0;
        for (let j = start; j < end; j++) {
          const abs = Math.abs(channel[j]);
          if (abs > maxAmp) maxAmp = abs;
        }
        rawPeaks.push(maxAmp);
      }

      const globalMax = Math.max(...rawPeaks, 0.01);
      return rawPeaks.map((p) =>
        Math.max(0.12, Math.min(1, Number((p / globalMax).toFixed(3))))
      );
    } finally {
      await ctx.close();
    }
  } catch {
    return createFallbackPeaks(barCount);
  }
}

function createFallbackPeaks(barCount: number): number[] {
  return Array.from({ length: barCount }, (_, i) => {
    const wave = 0.45 + 0.35 * Math.sin(i * 0.35) + 0.15 * Math.cos(i * 0.9);
    return Math.max(0.15, Math.min(0.95, Number(wave.toFixed(3))));
  });
}
