from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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

# --- LLM INTEGRATIONS (NUTRITION AND PRICE ANALYSIS) ---

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
    
    system_prompt = (
        "Вы — опытный ветеринарный диетолог. Проанализируйте ингредиенты собачьего корма "
        "и определите, подходит ли этот рацион конкретной собаке. Верните подробный разбор "
        "в красивом формате Markdown со следующими секциями:\n"
        "1. Общая оценка корма (Premium, Normal, Low Quality)\n"
        "2. Анализ основных белков и жиров\n"
        "3. Подходит ли для собаки с учетом ее медицинского профиля\n"
        "4. Обнаруженные потенциальные аллергены или нежелательные ингредиенты\n"
        "5. Итоговый вердикт (Рекомендовано / С ограничениями / Не рекомендуется)"
    )
    
    user_prompt = (
        f"Профиль собаки:\n"
        f"- Порода: {profile_data.get('breed', 'Самоед')}\n"
        f"- Возраст: {profile_data.get('age', '10 лет 8 месяцев')}\n"
        f"- Текущий вес: {profile_data.get('weight_current', 31.0)} кг (Целевой: {profile_data.get('weight_target', 25.0)} кг)\n"
        f"- Особенности: {', '.join(profile_data.get('conditions', []))}\n\n"
        f"Ингредиенты корма:\n{ingredients}"
    )

    result = await call_llm(system_prompt, user_prompt)
    return {"analysis": result}

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

    # Truncate content if too long to avoid token limits
    if len(content) > 30000:
        content = content[:30000] + "\n...[Текст прайс-листа обрезан]..."

    system_prompt = (
        "Вы — ИИ-ассистент по ветеринарным товарам и покупкам. Проанализируйте прайс-лист "
        "и выберите подходящие товары (лакомства, корма, игрушки или витамины) из запрошенных категорий, "
        "которые будут безопасны и полезны для конкретной собаки с ее текущими диагнозами. "
        "Верните результат в виде красивой таблицы Markdown с колонками:\n"
        "- Товар\n"
        "- Цена\n"
        "- Категория\n"
        "- Почему подходит / Ограничения\n"
        "- Оценка (Рекомендовано / Избегать)"
    )

    user_prompt = (
        f"Интересующие категории: {categories}\n\n"
        f"Профиль здоровья собаки:\n"
        f"- Порода: {profile_data.get('breed', 'Самоед')}\n"
        f"- Возраст: {profile_data.get('age', '10 лет 8 месяцев')}\n"
        f"- Текущий вес: {profile_data.get('weight_current', 31.0)} кг (Ожирение, цель 25.0 кг)\n"
        f"- Состояние: {', '.join(profile_data.get('conditions', []))}\n\n"
        f"Прайс-лист:\n{content}"
    )

    result = await call_llm(system_prompt, user_prompt)
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

# --- SERVE FRONTEND ---

# Mount dashboard files
dashboard_path = os.path.join(BASE_DIR, "dashboard")
if os.path.exists(dashboard_path):
    app.mount("/", StaticFiles(directory=dashboard_path, html=True), name="dashboard")
else:
    @app.get("/")
    def index():
        return {"status": "success", "message": "Backend running, dashboard directory not found"}
