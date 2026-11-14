# -*- coding: utf-8 -*-
import glob, os, sys
import fitz

outroot = r"D:\Desktop\OD1\_render"
os.makedirs(outroot, exist_ok=True)
pdfs = [
    r"D:\Desktop\OD1\OD2e_L1_Grammar_and_Vocab_WS_Unit_1.pdf",
    r"D:\Desktop\OD1\OD2e_L1_Phonics_WS_Unit_1.pdf",
    r"D:\Desktop\OD1\OD2e_L1_Reading_Comprehension_WS_Unit_1.pdf",
    r"D:\Desktop\OD1\Oxford-Discover-2nd-1-Grammar.pdf",
    r"D:\Desktop\OD1\Oxford-Discover-2nd-1-Writing-and-Spelling.pdf",
]
for p in pdfs:
    if not os.path.exists(p):
        print("MISSING", p); continue
    doc = fitz.open(p)
    name = os.path.splitext(os.path.basename(p))[0].replace(" ", "_")
    od = os.path.join(outroot, name); os.makedirs(od, exist_ok=True)
    n = doc.page_count
    txt = sum(1 for i in range(n) if doc[i].get_text().strip())
    render = min(n, 24)
    for i in range(render):
        pix = doc[i].get_pixmap(dpi=110)
        pix.save(os.path.join(od, f"p{i+1:03d}.png"))
    print(name, "pages", n, "textpages", txt, "rendered", render)
print("DONE")
