/** 加载 audio-1 并垫到 ≥10 秒，供 MiniMax 克隆超真人音色 */

export const TEACHER_VOICE_SAMPLE_SRC = '/audio/audio-1.mp3';

async function loadSampleBlob(): Promise<Blob> {
  const res = await fetch(`${TEACHER_VOICE_SAMPLE_SRC}?v=clone`);
  if (!res.ok) {
    throw new Error('找不到校长音色样本 public/audio/audio-1.mp3（将改用 MiniMax 系统超真人音色）');
  }
  return res.blob();
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const samples = buffer.length;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/** MiniMax 要求克隆样本 ≥10 秒：不够则循环垫长 */
export async function ensureSampleAtLeast10s(blob: Blob): Promise<Blob> {
  try {
    const ctx = new AudioContext();
    const audioBuf = await ctx.decodeAudioData(await blob.arrayBuffer());
    await ctx.close();
    if (audioBuf.duration >= 10.5) return blob;

    const targetSec = 12;
    const sampleRate = audioBuf.sampleRate;
    const channels = audioBuf.numberOfChannels;
    const totalFrames = Math.ceil(sampleRate * targetSec);
    const offline = new OfflineAudioContext(channels, totalFrames, sampleRate);
    let t = 0;
    while (t < targetSec) {
      const src = offline.createBufferSource();
      src.buffer = audioBuf;
      src.connect(offline.destination);
      src.start(t);
      t += audioBuf.duration;
    }
    const rendered = await offline.startRendering();
    return audioBufferToWavBlob(rendered);
  } catch {
    return blob;
  }
}

export async function blobToDataUrlBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const mime = blob.type || 'audio/mpeg';
  return `data:${mime};base64,${btoa(binary)}`;
}

let cachedSampleBase64: string | null = null;

/** 获取可用于克隆的 audio-1 样本（已垫长，带 dataURL） */
export async function getTeacherSampleBase64(): Promise<string> {
  if (cachedSampleBase64) return cachedSampleBase64;
  const padded = await ensureSampleAtLeast10s(await loadSampleBlob());
  cachedSampleBase64 = await blobToDataUrlBase64(padded);
  return cachedSampleBase64;
}
