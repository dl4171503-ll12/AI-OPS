# -*- coding: utf-8 -*-
import fitz, os

def dump(path, upto=None, label=""):
    doc = fitz.open(path)
    print("\n=====", label or os.path.basename(path), "pages", doc.page_count)
    n = doc.page_count if upto is None else min(upto, doc.page_count)
    for i in range(n):
        t = doc[i].get_text().strip()
        if not t: continue
        print(f"\n--- p{i+1} ---")
        print(t[:1800])

dump(r"D:\Desktop\OD1\OD2e_L1_Grammar_and_Vocab_WS_Unit_1.pdf", 2, "GrammarVocab WS U1")
dump(r"D:\Desktop\OD1\OD2e_L1_Phonics_WS_Unit_1.pdf", 2, "Phonics WS U1")
dump(r"D:\Desktop\OD1\OD2e_L1_Reading_Comprehension_WS_Unit_1.pdf", 2, "ReadingComp WS U1")
dump(r"D:\Desktop\OD1\Oxford-Discover-2nd-1-Grammar.pdf", 12, "Grammar book (first 12)")
dump(r"D:\Desktop\OD1\Oxford-Discover-2nd-1-Writing-and-Spelling.pdf", 12, "Writing&Spelling (first 12)")
