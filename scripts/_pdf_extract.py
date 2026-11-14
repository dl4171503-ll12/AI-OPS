# -*- coding: utf-8 -*-
"""检查 OD2e L1 教材 PDF：页数、文本层、目录/单元结构；渲染几页为图片备用。"""
import glob, os, sys, json
import fitz

files = glob.glob(r"D:\Desktop\OD2e*.pdf")
if not files:
    print("NO PDF"); sys.exit(2)
path = files[0]
print("FILE:", path, os.path.getsize(path), "bytes")
doc = fitz.open(path)
print("PAGES:", doc.page_count)

outdir = os.path.join(os.path.dirname(path), "_od2e_pages")
os.makedirs(outdir, exist_ok=True)

text_pages = 0
for i in range(doc.page_count):
    t = doc[i].get_text().strip()
    if t:
        text_pages += 1
print("TEXT_LAYER_PAGES:", text_pages, "/", doc.page_count)

# 前 20 页文本摘要
for i in range(min(20, doc.page_count)):
    t = doc[i].get_text().strip()
    if t:
        print(f"--- page {i+1} len={len(t)}")
        print(t[:400].replace("\n", " | "))

# 渲染前 40 页为 PNG（150dpi）
for i in range(min(40, doc.page_count)):
    pix = doc[i].get_pixmap(dpi=150)
    pix.save(os.path.join(outdir, f"p{i+1:03d}.png"))
print("RENDERED:", outdir)
