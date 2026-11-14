# -*- coding: utf-8 -*-
import sys, time
from faster_whisper import WhisperModel

path = sys.argv[1] if len(sys.argv) > 1 else r"D:\Desktop\app-cjxeruyihxxd\ai-school\docs\research\img-demo\dictation-test.mp3"
t0 = time.time()
model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
print("model load", round(time.time()-t0, 1), "s")
t1 = time.time()
segments, info = model.transcribe(path, language="en", vad_filter=True, beam_size=1)
text = " ".join(s.text.strip() for s in segments)
print("transcribe", round(time.time()-t1, 1), "s")
print("TEXT:", text)
