# -*- coding: utf-8 -*-
"""本地离线语音识别服务（Vosk）
POST http://127.0.0.1:8201/asr
body: {"audioBase64": "...", "mime": "audio/wav"}  → {"ok":true,"text":"..."}
模型目录：环境变量 VOSK_MODEL_DIR（默认 D:\\Desktop\\ai-school-models\\vosk-model-small-en-us-0.15）
"""
import base64, io, json, os, sys, wave
from http.server import BaseHTTPRequestHandler, HTTPServer

MODEL_DIR = os.environ.get("VOSK_MODEL_DIR", r"D:\Desktop\ai-school-models\vosk-model-small-en-us-0.15")
PORT = int(os.environ.get("VOSK_PORT", "8201"))

if not os.path.isdir(MODEL_DIR):
    print("MODEL MISSING:", MODEL_DIR, flush=True)
    sys.exit(2)

from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
model = Model(MODEL_DIR)
print("VOSK READY", MODEL_DIR, flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/health"):
            return self._json(200, {"ok": True, "model": MODEL_DIR})
        return self._json(404, {"ok": False})

    def do_POST(self):
        if not self.path.startswith("/asr"):
            return self._json(404, {"ok": False, "code": "not-found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(n) or b"{}")
            b64 = str(data.get("audioBase64") or "").split(",", 1)[-1]
            raw = base64.b64decode(b64)
            wav = wave.open(io.BytesIO(raw), "rb")
            if wav.getnchannels() != 1 or wav.getsampwidth() != 2:
                return self._json(400, {"ok": False, "code": "need-mono-16bit-wav"})
            rate = wav.getframerate()
            rec = KaldiRecognizer(model, rate)
            rec.SetWords(False)
            while True:
                chunk = wav.readframes(4000)
                if not chunk:
                    break
                rec.AcceptWaveform(chunk)
            result = json.loads(rec.FinalResult())
            text = (result.get("text") or "").strip()
            return self._json(200, {"ok": True, "text": text, "seconds": round(wav.getnframes() / float(rate), 2)})
        except Exception as e:
            return self._json(500, {"ok": False, "code": "asr-failed", "detail": str(e)[:160]})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
