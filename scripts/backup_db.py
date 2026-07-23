import os
import shutil
import datetime
import glob

base_dir = r"D:\ai-projects\ai-anti_bjarki-longevity-ai-project"
db_path = os.path.join(base_dir, "backend", "db", "bjarki_health.db")
backup_dir = os.path.join(base_dir, "backend", "db", "backups")

def backup_database():
    if not os.path.exists(db_path):
        print(f"Database file not found at: {db_path}")
        return

    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"bjarki_health_{timestamp}.db")
    
    shutil.copy2(db_path, backup_file)
    print(f"✅ Database backup created: {backup_file}")
    
    # Maintain maximum 10 recent backups
    backups = sorted(glob.glob(os.path.join(backup_dir, "bjarki_health_*.db")), key=os.path.getmtime)
    if len(backups) > 10:
        for old_b in backups[:-10]:
            try:
                os.remove(old_b)
                print(f"Purged old backup: {os.path.basename(old_b)}")
            except Exception as e:
                print(f"Failed to remove {old_b}: {e}")

if __name__ == "__main__":
    backup_database()
