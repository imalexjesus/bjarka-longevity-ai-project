import sqlite3
import os

def get_db_path():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_dir = os.path.join(backend_dir, "db")
    os.makedirs(db_dir, exist_ok=True)
    return os.path.join(db_dir, "bjarki_health.db")

def init_db():
    db_path = get_db_path()
    print(f"Initializing database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create logs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        weight REAL,
        activity_minutes INTEGER,
        symptoms TEXT,
        appetite TEXT,
        mood TEXT,
        medications TEXT,
        notes TEXT
    )
    ''')

    # Create purchases table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        category TEXT,
        item TEXT
    )
    ''')

    # Create settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')

    # Insert default settings if empty
    cursor.execute('SELECT COUNT(*) FROM settings')
    if cursor.fetchone()[0] == 0:
        default_settings = [
            ('theme', 'dark'),
            ('gemini_api_key', ''),
            ('ollama_url', 'http://localhost:11434'),
            ('default_breed', 'Samoyed')
        ]
        cursor.executemany('INSERT INTO settings (key, value) VALUES (?, ?)', default_settings)

    # Insert initial logs if empty to prevent empty dashboard
    cursor.execute('SELECT COUNT(*) FROM logs')
    if cursor.fetchone()[0] == 0:
        initial_logs = [
            ("2026-03-01", 27.8, 45, "", "Good", "Normal", "", ""),
            ("2026-03-10", 27.6, 60, "", "Good", "Normal", "", ""),
            ("2026-03-21", 31.0, 0, "post_surgery_recovery,stitches", "Good", "Recovering", "Синулокс 250мг (1т х 2р), Хлоргексидин 0.05% (обработка швов), Габапентин 300мг (по назначению)", "Хирургическое удаление опухоли, биохимия и ОАК в норме.")
        ]
        cursor.executemany('''
        INSERT INTO logs (date, weight, activity_minutes, symptoms, appetite, mood, medications, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', initial_logs)

    conn.commit()
    conn.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
