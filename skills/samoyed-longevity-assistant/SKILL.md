---
name: samoyed-longevity-assistant
description: >-
  Complete agentic skill to manage, inspect, RAG-search, calculate nutrition,
  and backup the Bjarki Samoyed Longevity AI platform.
triggers:
  - samoyed longevity assistant
  - bjarki longevity AI
  - manage bjarki health platform
  - search samoyed knowledge vector db
  - calculate dog kibble portion deficit
---

# Samoyed Longevity AI Assistant

## Overview
This skill provides the full protocol and commands for interacting with, managing, and indexing the **Bjarki Longevity AI System** (FastAPI backend + React/Vite dashboard + SQLite DB + Qdrant Vector RAG + Knowledge Base).

## Core Architecture
- **Backend API**: `http://127.0.0.1:8000` (FastAPI serving compiled React frontend at `/`)
- **Vector Database**: Qdrant at `http://192.168.90.19:6333` (Collection: `samoyed_knowledge`)
- **Database**: SQLite `backend/db/bjarki_health.db`
- **Forgejo Repository**: `https://forgejo.alexj.top/root/ai-bjarki-longevity-global`

## Utility Scripts & Workflows

### 1. Vector RAG Search & Indexing
To re-index all Markdown articles into Qdrant vector space:
```bash
python scripts/ingest_qdrant.py
```
To test vector search endpoint via API:
```bash
curl -s "http://127.0.0.1:8000/api/knowledge/vector-search?query=устюки"
```

### 2. Database Backup & Maintenance
To create an instant snapshot of `bjarki_health.db`:
```bash
python scripts/backup_db.py
```

### 3. Food Portion & Calorie Deficit Calculator
Calculate daily kibble portion (grams) for weight loss:
```bash
curl -X POST http://127.0.0.1:8000/api/nutrition/calculator -H "Content-Type: application/json" -d "{\"weight_current\": 31.0, \"weight_target\": 25.0, \"kibble_kcal_per_kg\": 3900.0}"
```

### 4. Build & Deploy Workflow
To recompile the React frontend and deploy to Forgejo:
```bash
node build.js
git add .
git commit -m "feat: update platform assets"
git push -u forgejo main
```

## Common Mistakes & Best Practices
- **Never shave Samoyeds**: Double-coat insulation prevents alopecia and heatstroke.
- **Ustyuki Inspection**: Check interdigital paw pads after dry grass walks.
- **Portion Deficit**: Maintain target loss of ~300g / week for 10+ senior dog.
