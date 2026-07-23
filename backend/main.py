from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import os
import json
import httpx
import pandas as pd
import google.generativeai as genai

# Setup directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "backend", "db", "bjarki_health.db")
PROFILE_PATH = os.path.join(BASE_DIR, "profile", "bjarki-profile.json")

# Import the AI Layer agents
import sys
sys.path.append(os.path.join(BASE_DIR, "agents", "ai_layer"))
from health_analyzer import HealthAnalyzer
from risk_engine import RiskEngine
from recommendation_system import RecommendationSystem

app = FastAPI(title="Bjarki Longevity AI Server")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to get database connection
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Helper function to get settings
def get_setting(key: str, default: str = "") -> str:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

# Pydantic Schemas
class LogEntry(BaseModel):
    date: str
    weight: float
    activity_minutes: int
    symptoms: Optional[str] = ""
    appetite: Optional[str] = "Good"
    mood: Optional[str] = "Normal"
    medications: Optional[str] = ""
    notes: Optional[str] = ""

class PurchaseEntry(BaseModel):
    date: str
    category: str
    item: str

class SettingsUpdate(BaseModel):
    key: str
    value: str

# --- API ENDPOINTS ---

@app.get("/api/logs")
def get_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs ORDER BY date ASC")
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for r in rows:
        logs.append({
            "date": r["date"],
            "weight": r["weight"],
            "activity_minutes": r["activity_minutes"],
            "symptoms": [s.strip() for s in r["symptoms"].split(",") if s.strip()] if r["symptoms"] else [],
            "appetite": r["appetite"],
            "mood": r["mood"],
            "medications": [m.strip() for m in r["medications"].split(",") if m.strip()] if r["medications"] else [],
            "notes": r["notes"]
        })
    return logs

@app.post("/api/logs")
def add_log(entry: LogEntry):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT OR REPLACE INTO logs (date, weight, activity_minutes, symptoms, appetite, mood, medications, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entry.date,
            entry.weight,
            entry.activity_minutes,
            entry.symptoms,
            entry.appetite,
            entry.mood,
            entry.medications,
            entry.notes
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"status": "success", "message": "Log updated"}

@app.get("/api/purchases")
def get_purchases():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM purchases ORDER BY date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/purchases")
def add_purchase(entry: PurchaseEntry):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO purchases (date, category, item)
        VALUES (?, ?, ?)
        """, (entry.date, entry.category, entry.item))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"status": "success", "message": "Purchase recorded"}

@app.get("/api/settings")
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

@app.put("/api/settings")
def update_settings(settings: List[SettingsUpdate]):
    conn = get_db()
    cursor = conn.cursor()
    try:
        for s in settings:
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (s.key, s.value))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"status": "success", "message": "Settings updated"}

@app.get("/api/profile")
def get_profile():
    if not os.path.exists(PROFILE_PATH):
        raise HTTPException(status_code=404, detail="Profile file not found")
    with open(PROFILE_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.put("/api/profile")
def update_profile(profile_data: dict):
    try:
        with open(PROFILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(profile_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "message": "Profile updated"}

@app.get("/api/recommendations")
def get_ai_recommendations():
    # 1. Health Analysis
    analyzer = HealthAnalyzer(PROFILE_PATH)
    health_analysis = analyzer.analyze()

    # 2. Risk Assessment
    engine = RiskEngine(PROFILE_PATH)
    risk_assessment = engine.evaluate_risks()

    # 3. Recommendations
    recommender = RecommendationSystem(PROFILE_PATH)
    recommendations = recommender.get_recommendations(health_analysis, risk_assessment)
    
    return {
        "health_analysis": health_analysis,
        "risk_assessment": risk_assessment,
        "recommendations": recommendations.split("\n")
    }

# --- CLAUDE CODE AGENTIC PATTERNS & LLM INTEGRATIONS ---

TOXIC_CANINE_INGREDIENTS = {
    "ксилит": "Ксилит (Xylitol) — вызывает смертельную гипогликемию и острую печеночную недостаточность!",
    "xylitol": "Ксилит (Xylitol) — вызывает смертельную гипогликемию и острую печеночную недостаточность!",
    "виноград": "Виноград — вызывает острую почечную недостаточность у собак!",
    "изюм": "Изюм — смертельно опасен для почек собаки!",
    "grape": "Виноград (Grapes) — вызывает острую почечную недостаточность!",
    "raisin": "Изюм (Raisins) — вызывает острую почечную недостаточность!",
    "шоколад": "Теобромин в шоколаде — токсичен для сердечно-сосудистой системы собак!",
    "какао": "Какао — содержит теобромин, опасный для сердца собаки!",
    "chocolate": "Шоколад (Chocolate) — содержит токсичный теобромин!",
    "лук": "Лук — разрушает эритроциты (вызывает гемолитическую анемию)!",
    "чеснок": "Чеснок — вызывает анемию и повреждение эритроцитов у собак!",
    "onion": "Лук (Onion) — токсичен для эритроцитов собак!",
    "garlic": "Чеснок (Garlic) — вызывает гемолитическую анемию!",
    "макадамия": "Орехи макадамия — вызывают неврологические нарушения и слабость лап!",
    "macadamia": "Орехи макадамия — вызывают токсический парез у собак!"
}

def stage_1_safety_classifier(ingredients_text: str) -> list:
    """Stage 1 Fast Safety & Toxin Classifier Pattern (Claude Code Pattern 12)"""
    text_lower = ingredients_text.lower()
    alerts = []
    for toxin, warning in TOXIC_CANINE_INGREDIENTS.items():
        if toxin in text_lower:
            alerts.append(f"🚨 **КРИТИЧЕСКИЙ ТОКСИН ОБНАРУЖЕН ({toxin.upper()})**: {warning}")
    return alerts

async def call_llm(system_prompt: str, user_prompt: str) -> str:
    gemini_key = get_setting("gemini_api_key")
    ollama_url = get_setting("ollama_url", "http://localhost:11434")

    if gemini_key:
        try:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_prompt)
            response = model.generate_content(user_prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API call failed: {e}")

    # Fallback to Ollama
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{ollama_url}/api/generate", json={
                "model": "llama3",
                "system": system_prompt,
                "prompt": user_prompt,
                "stream": False
            })
            if res.status_code == 200:
                return res.json().get("response", "")
    except Exception as e:
        print(f"Ollama call failed: {e}")

    return "AI Unavailable (both Gemini and Ollama failed or are unconfigured). Please enter a Gemini API Key in the settings."

@app.post("/api/analyze-nutrition")
async def analyze_nutrition_endpoint(ingredients: str = Form(...)):
    profile_data = get_profile()
    
    # Stage 1: Fast Security & Toxin Classifier
    toxin_alerts = stage_1_safety_classifier(ingredients)
    
    # Static Prompt Assembly (Claude Code Cache-Boundary Pattern)
    STATIC_SYSTEM_PROMPT = (
        "Вы — ведущий ветеринарный диетолог и эксперт по долголетию собак породы самоед.\n\n"
        "ПРАВИЛА И ОГРАНИЧЕНИЯ (BEHAVIORAL DIRECTIVES):\n"
        "1. Безопасность превыше всего: Проверяйте состав на скрытые искусственные химикаты (BHA/BHT, пропиленгликоль, искусственные красители).\n"
        "2. Учитывайте профиль старшей собаки (Senior 10+): критичен контроль жиров (не более 12-14%) и белка (легкоусвояемый ягненок/рыба).\n"
        "3. Самокритика и верификация (Verification Agent Pattern): Обязательно проверьте свой анализ на отсутствие внутренних противоречий.\n"
        "4. Всегда возвращайте структурированный разбор в красивом формате Markdown со секциями:\n"
        "   - 📊 Общая оценка корма (Holistic / Premium / Standard / Low Quality)\n"
        "   - 🥩 Анализ источников белка и жиров\n"
        "   - 🩺 Совместимость с медкартами Бьярки\n"
        "   - ⚠️ Риски аллергенов или скрытой химии\n"
        "   - ⚖️ Финальный экспертный вердикт"
    )
    
    user_prompt = (
        f"--- ДИНАМИЧЕСКИЙ ПРОФИЛЬ ПАЦИЕНТА ---\n"
        f"- Кличка: {profile_data.get('name_ru', 'Бьярки')}\n"
        f"- Порода: {profile_data.get('breed', 'Самоед')}\n"
        f"- Возраст: {profile_data.get('age', '10 лет 8 месяцев')}\n"
        f"- Весовой статус: {profile_data.get('weight_current', 31.0)} кг (Целевой: {profile_data.get('weight_target', 25.0)} кг, Ожирение I ст.)\n"
        f"- Особые диагнозы: {', '.join(profile_data.get('conditions', []))}\n\n"
        f"--- ИНГРЕДИЕНТЫ ДЛЯ АНАЛИЗА ---\n{ingredients}"
    )

    llm_analysis = await call_llm(STATIC_SYSTEM_PROMPT, user_prompt)
    
    if toxin_alerts:
        prefix = "\n\n".join(toxin_alerts) + "\n\n---\n\n### 🤖 Экспертный ИИ-Анализ состава:\n"
        return {"analysis": prefix + llm_analysis}

    return {"analysis": llm_analysis}

@app.post("/api/analyze-price")
async def analyze_price_endpoint(
    file: UploadFile = File(...),
    categories: str = Form(...)
):
    profile_data = get_profile()
    
    # Read the file
    content = ""
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    try:
        if file_ext == '.txt':
            content = (await file.read()).decode('utf-8')
        elif file_ext == '.csv':
            df = pd.read_csv(file.file)
            content = df.to_string(index=False)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file.file)
            content = df.to_string(index=False)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

    if len(content) > 30000:
        content = content[:30000] + "\n...[Текст прайс-листа обрезан для лимита токенов]..."

    STATIC_PRICE_PROMPT = (
        "Вы — ИИ-ассистент по фильтрации ветеринарных товаров и прайс-листов.\n\n"
        "ПРАВИЛА ОТБОРА И ВЕРИФИКАЦИИ:\n"
        "1. Отбирайте ТОЛЬКО те товары из запрошенных категорий, которые безопасны для 10-летнего самоеда весом 31 кг.\n"
        "2. Категорически отбраковывайте жесткие свиные уши, слишком жирные лакомства и игрушки из дешевого пластика.\n"
        "3. Верните результат в виде Markdown-таблицы с колонками:\n"
        "   - Товар\n"
        "   - Цена\n"
        "   - Категория\n"
        "   - Почему подходит / Ограничения\n"
        "   - Оценка (🟢 Рекомендовано / 🟡 С ограничениями / 🔴 Избегать)"
    )

    user_prompt = (
        f"Запрошенные категории: {categories}\n\n"
        f"Медицинские ограничения собаки:\n"
        f"- Порода: {profile_data.get('breed', 'Самоед')}\n"
        f"- Возраст: {profile_data.get('age', '10 лет 8 месяцев')}\n"
        f"- Текущий вес: {profile_data.get('weight_current', 31.0)} кг (Ожирение, цель 25.0 кг)\n"
        f"- Состояния: {', '.join(profile_data.get('conditions', []))}\n\n"
        f"Данные прайс-листа:\n{content}"
    )

    result = await call_llm(STATIC_PRICE_PROMPT, user_prompt)
    return {"analysis": result}

# --- KNOWLEDGE BASE ENDPOINTS ---

KNOWLEDGE_DIR = os.path.join(BASE_DIR, "knowledge")

@app.get("/api/knowledge/tree")
def get_knowledge_tree():
    if not os.path.exists(KNOWLEDGE_DIR):
        return []

    category_labels = {
        "grooming": "Груминг и Уход",
        "health": "Здоровье и Превенции",
        "shopping-list": "Шоппинг-каталоги",
        "slickers": "Пуходерки и Сликеры",
        "combs-rakes": "Гребни и Грабли",
        "dematters": "Колтунорезы и Стриппинги",
        "cosmetics": "Косметика и Шампуни",
        "dryers": "Компрессоры и Бластеры",
        "scissors": "Ножницы и Триммеры",
        "paw-care": "Уход за Лапами"
    }

    tree = []

    for root, dirs, files in os.walk(KNOWLEDGE_DIR):
        rel_root = os.path.relpath(root, KNOWLEDGE_DIR)
        md_files = [f for f in files if f.endswith(".md")]
        
        if not md_files:
            continue

        category_key = os.path.basename(root) if rel_root != "." else "general"
        category_name = category_labels.get(category_key, category_key.capitalize())

        articles = []
        for f in md_files:
            file_path = os.path.join(root, f)
            rel_file_path = os.path.relpath(file_path, KNOWLEDGE_DIR).replace("\\", "/")
            
            # Read first line for title or fallback
            title = f.replace(".md", "").replace("-", " ").capitalize()
            try:
                with open(file_path, "r", encoding="utf-8") as file_obj:
                    first_line = file_obj.readline().strip()
                    if first_line.startswith("# "):
                        title = first_line.replace("# ", "").strip()
            except Exception:
                pass

            articles.append({
                "filename": f,
                "title": title,
                "path": rel_file_path,
                "category": category_name
            })

        tree.append({
            "category_key": category_key,
            "category_name": category_name,
            "path": rel_root.replace("\\", "/"),
            "articles": articles
        })

    return tree

@app.get("/api/knowledge/article")
def get_knowledge_article(path: str):
    # Security check: ensure path does not escape KNOWLEDGE_DIR
    target_path = os.path.normpath(os.path.join(KNOWLEDGE_DIR, path))
    if not target_path.startswith(KNOWLEDGE_DIR):
        raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(target_path) or not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail="Article not found")

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Calculate estimated reading time (words / 180)
        word_count = len(content.split())
        read_time_min = max(1, round(word_count / 180))

        return {
            "path": path,
            "content": content,
            "word_count": word_count,
            "read_time_min": read_time_min
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading article: {str(e)}")

@app.get("/api/knowledge/vector-search")
async def vector_search_endpoint(query: str = Query(...)):
    """Search Qdrant vector database for relevant knowledge chunks"""
    try:
        import math, re
        VECTOR_SIZE = 384
        words = re.findall(r'\w+', query.lower())
        vec = [0.0] * VECTOR_SIZE
        for w in words:
            h = hash(w) % VECTOR_SIZE
            vec[h] += 1.0
        norm = math.sqrt(sum(x*x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]

        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post("http://192.168.90.19:6333/collections/samoyed_knowledge/points/search", json={
                "vector": vec,
                "limit": 5,
                "with_payload": True
            })
            if res.status_code == 200:
                data = res.json()
                results = []
                for hit in data.get("result", []):
                    payload = hit.get("payload", {})
                    results.append({
                        "score": hit.get("score", 0.0),
                        "file_title": payload.get("file_title", ""),
                        "chunk_title": payload.get("chunk_title", ""),
                        "path": payload.get("path", ""),
                        "content": payload.get("content", "")
                    })
                return {"query": query, "results": results}
    except Exception as e:
        print(f"Vector search failed: {e}")

    return {"query": query, "results": []}

# --- SERVE FRONTEND ---

# Mount dashboard files
dashboard_path = os.path.join(BASE_DIR, "dashboard")
if os.path.exists(dashboard_path):
    app.mount("/", StaticFiles(directory=dashboard_path, html=True), name="dashboard")
else:
    @app.get("/")
    def index():
        return {"status": "success", "message": "Backend running, dashboard directory not found"}
