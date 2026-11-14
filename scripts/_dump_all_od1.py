# -*- coding: utf-8 -*-
import fitz, os
out = r"D:\Desktop\OD1\_txt"
os.makedirs(out, exist_ok=True)
pdfs = {
 "grammar_vocab_ws_u1": r"D:\Desktop\OD1\OD2e_L1_Grammar_and_Vocab_WS_Unit_1.pdf",
 "phonics_ws_u1": r"D:\Desktop\OD1\OD2e_L1_Phonics_WS_Unit_1.pdf",
 "reading_ws_u1": r"D:\Desktop\OD1\OD2e_L1_Reading_Comprehension_WS_Unit_1.pdf",
 "grammar_book": r"D:\Desktop\OD1\Oxford-Discover-2nd-1-Grammar.pdf",
 "writing_spelling": r"D:\Desktop\OD1\Oxford-Discover-2nd-1-Writing-and-Spelling.pdf",
}
for name, p in pdfs.items():
    doc = fitz.open(p)
    lines = []
    for i in range(doc.page_count):
        t = doc[i].get_text().strip()
        if t:
            lines.append(f"\n===== PAGE {i+1} =====\n{t}")
    path = os.path.join(out, name + ".txt")
    open(path, "w", encoding="utf-8").write("\n".join(lines))
    print(name, doc.page_count, "->", path, os.path.getsize(path))
