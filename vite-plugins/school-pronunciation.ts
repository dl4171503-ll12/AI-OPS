/**
 * 口语发音评测代理（Azure Pronunciation Assessment）
 *
 * POST /api/pronunciation
 * body: { audioBase64: string(WAV 16k mono), referenceText: string, locale?: string }
 * → { ok:true, accuracy, fluency, completeness, pronunciation, prosody, words?: [...] }
 * 未配置密钥 → 501 { ok:false, code:'azure-not-configured' }（不假装能评）
 *
 * 环境变量：
 *   AZURE_SPEECH_KEY      （必填）
 *   AZURE_SPEECH_REGION   （必填，如 eastasia）
 *   AZURE_PA_LOCALE       （可选，默认 en-US）
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function loadEnv(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of [path.join(root, '.env'), path.join(root, '..', '.env')]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      if (out[m[1]]) continue;
      out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_AUDIO_BYTES * 1.5) {
        reject(new Error('audio too large'));
        req.destroy();
        return;
      }
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(String(b64 || '').replace(/^data:[^;]+;base64,/, ''), 'base64');
}

function assessmentParams(referenceText: string) {
  const payload = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableProsodyAssessment: true,
    EnableMiscue: true,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function pickNum(o: any, k: string): number | null {
  const v = o?.[k];
  return typeof v === 'number' && isFinite(v) ? v : null;
}

export function schoolPronunciationPlugin(): Plugin {
  return {
    name: 'school-pronunciation',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      const env = loadEnv(root);
      const key = (env.AZURE_SPEECH_KEY || env.VITE_AZURE_SPEECH_KEY || '').trim();
      const region = (env.AZURE_SPEECH_REGION || env.VITE_AZURE_SPEECH_REGION || '').trim();
      const locale = (env.AZURE_PA_LOCALE || 'en-US').trim();

      server.middlewares.use('/api/pronunciation', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method-not-allowed' });
        if (!key || !region) {
          return sendJson(res, 501, {
            ok: false,
            code: 'azure-not-configured',
            hint: '在 .env 配置 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 后重启 dev server',
          });
        }
        try {
          const raw = await readBody(req);
          const { audioBase64, referenceText, locale: bodyLocale } = JSON.parse(raw || '{}');
          const audio = b64ToBuffer(audioBase64);
          if (!audio.length) return sendJson(res, 400, { ok: false, code: 'empty-audio' });
          if (!referenceText || String(referenceText).trim().length < 3) {
            return sendJson(res, 400, { ok: false, code: 'missing-reference-text' });
          }
          const lang = (bodyLocale || locale).trim();
          const url =
            `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
            `?language=${encodeURIComponent(lang)}&pronunciationAssessmentParams=${encodeURIComponent(assessmentParams(String(referenceText)))}`;

          const upstream = await fetch(url, {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': key,
              'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
              'Accept': 'application/json',
            },
            body: audio,
          });
          const text = await upstream.text();
          if (!upstream.ok) {
            return sendJson(res, 502, { ok: false, code: 'azure-error', status: upstream.status, detail: text.slice(0, 400) });
          }
          const data = JSON.parse(text);
          const best = data?.NBest?.[0] || {};
          const pa = best.PronunciationAssessment || {};
          sendJson(res, 200, {
            ok: true,
            recognized: best.Display || data?.DisplayText || '',
            accuracy: pickNum(pa, 'AccuracyScore'),
            fluency: pickNum(pa, 'FluencyScore'),
            completeness: pickNum(pa, 'CompletenessScore'),
            pronunciation: pickNum(pa, 'PronunciationScore'),
            prosody: pickNum(pa, 'ProsodyScore'),
            words: Array.isArray(best.Words)
              ? best.Words.slice(0, 200).map((w: any) => ({
                  word: w.Word,
                  accuracy: pickNum(w?.PronunciationAssessment, 'AccuracyScore'),
                  errorType: w?.PronunciationAssessment?.ErrorType || null,
                }))
              : [],
          });
        } catch (e) {
          sendJson(res, 500, { ok: false, code: 'proxy-failed', detail: String(e instanceof Error ? e.message : e).slice(0, 300) });
        }
      });
    },
  };
}
