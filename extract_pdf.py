import sys, json

sys.stdout.reconfigure(encoding="utf-8")
from pypdf import PdfReader

r = PdfReader("audit/new/api-keys-audit-report.pdf")
pages = []
for i, p in enumerate(r.pages):
    pages.append({"page": i + 1, "text": p.extract_text()})
with open("audit-report-utf8.json", "w", encoding="utf-8") as f:
    json.dump(pages, f, indent=2, ensure_ascii=False)
print(f"Extracted {len(pages)} pages to audit-report-utf8.json")
