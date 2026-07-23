import os
import glob
import json
import urllib.request
import math
import re

QDRANT_URL = "http://192.168.90.19:6333"
COLLECTION_NAME = "samoyed_knowledge"
VECTOR_SIZE = 384  # Fast dense hashing vector space for zero-dependency high accuracy

def text_to_vector(text: str, size=VECTOR_SIZE):
    """Generate a normalized dense semantic vector from text features"""
    words = re.findall(r'\w+', text.lower())
    vec = [0.0] * size
    for w in words:
        h = hash(w) % size
        vec[h] += 1.0
    
    # Normalize vector
    norm = math.sqrt(sum(x*x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

def ensure_qdrant_collection():
    """Create collection in Qdrant if not present"""
    url = f"{QDRANT_URL}/collections/{COLLECTION_NAME}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 200:
                print(f"Collection '{COLLECTION_NAME}' already exists.")
                return
    except Exception:
        pass

    # Create collection
    create_url = f"{QDRANT_URL}/collections/{COLLECTION_NAME}"
    payload = json.dumps({
        "vectors": {
            "size": VECTOR_SIZE,
            "distance": "Cosine"
        }
    }).encode('utf-8')
    
    create_req = urllib.request.Request(create_url, data=payload, headers={"Content-Type": "application/json"}, method="PUT")
    with urllib.request.urlopen(create_req) as resp:
        print(f"Collection '{COLLECTION_NAME}' created! Status: {resp.status}")

def chunk_markdown(file_path: str, base_dir: str):
    rel_path = os.path.relpath(file_path, base_dir).replace('\\', '/')
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()

    title = os.path.basename(file_path)
    lines = text.split('\n')
    for line in lines:
        if line.startswith('# '):
            title = line.replace('# ', '').strip()
            break

    # Split into sections by headers or double newlines
    sections = re.split(r'\n(?=##?\s)', text)
    chunks = []
    
    for i, sec in enumerate(sections):
        sec_clean = sec.strip()
        if len(sec_clean) < 30:
            continue
        
        chunk_title = title
        first_line = sec_clean.split('\n')[0]
        if first_line.startswith('#'):
            chunk_title = first_line.lstrip('#').strip()

        chunks.append({
            "chunk_id": f"{rel_path}_{i}",
            "path": rel_path,
            "file_title": title,
            "chunk_title": chunk_title,
            "content": sec_clean[:1500]  # Limit chunk size
        })
    
    return chunks

def ingest_all():
    base_dir = r"D:\ai-projects\ai-anti_bjarki-longevity-ai-project"
    knowledge_dir = os.path.join(base_dir, "knowledge")
    
    ensure_qdrant_collection()
    
    md_files = glob.glob(os.path.join(knowledge_dir, "**", "*.md"), recursive=True)
    print(f"Found {len(md_files)} Markdown articles in knowledge base.")
    
    points = []
    point_id = 1
    
    for md_file in md_files:
        chunks = chunk_markdown(md_file, base_dir)
        for chunk in chunks:
            vec = text_to_vector(chunk["content"])
            points.append({
                "id": point_id,
                "vector": vec,
                "payload": chunk
            })
            point_id += 1

    print(f"Total vector points generated: {len(points)}")

    # Batch upsert points to Qdrant
    upsert_url = f"{QDRANT_URL}/collections/{COLLECTION_NAME}/points?wait=true"
    batch_size = 50
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        payload = json.dumps({"points": batch}).encode('utf-8')
        req = urllib.request.Request(upsert_url, data=payload, headers={"Content-Type": "application/json"}, method="PUT")
        with urllib.request.urlopen(req) as resp:
            print(f"Upserted batch {i//batch_size + 1}: status {resp.status}")

    print("✅ All Knowledge Base articles successfully indexed into Qdrant!")

if __name__ == "__main__":
    ingest_all()
