import os

def extract_file_content(path):
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".pdf":
            import PyPDF2
            flat_results = []
            with open(path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page_num, page in enumerate(reader.pages, start=1):
                    text = page.extract_text() or ""
                    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
                    for para_num, para in enumerate(paragraphs, start=1):
                        flat_results.append({
                            "filepath": path,
                            "page_number": page_num,
                            "paragraph_number": para_num,
                            "text": para
                        })
            return flat_results
        elif ext == ".json":
            import json
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        elif ext == ".txt":
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        else:
            return f"Unsupported file type: {ext}"
    except Exception as e:
        return f"Error extracting content from {path}: {e}"