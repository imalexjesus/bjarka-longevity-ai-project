
import pandas as pd
import json

file_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Наявність на складі_на 01.04.26.xlsx"

try:
    # Read rows to find header
    df_raw = pd.read_excel(file_path, nrows=20, header=None)
    header_row_idx = None
    for i, row in df_raw.iterrows():
        if any('Найменування' in str(v) for v in row.values):
            header_row_idx = i
            break
            
    if header_row_idx is None:
        header_row_idx = 7
        
    df = pd.read_excel(file_path, skiprows=header_row_idx)
    
    # Resilient column finding
    def find_col(keywords):
        for col in df.columns:
            if any(k in str(col) for k in keywords):
                return col
        return None

    name_col = find_col(['Найменування'])
    price_col = find_col(['Рекомендована ціна', 'Ціна', 'Price'])
    stock_col = find_col(['Києві', 'Залишки КИЕВ', 'Склад', 'Stock'])

    if not name_col or not price_col:
        print(f"Columns not found: name_col={name_col}, price_col={price_col}")
        sys.exit(1)

    # Search for Bjarka-friendly treats
    # Bjarka is a senior Samoyed on a pumpkin-lamb diet, overweight, joint issues.
    # Lungs (low calorie), Trachea (glucosamine), Lamb (match diet).
    keywords = ['легені', 'трахея', 'ягн', 'баран', 'ялович', 'вухо']
    
    candidates = []
    # Masking for treats and prices <= 3000
    df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
    treats_df = df[(df[price_col] <= 3000) & (df[price_col] > 0)].copy()
    
    # Filter for keywords
    mask = treats_df[name_col].str.contains('|'.join(keywords), case=False, na=False)
    treats_df = treats_df[mask]
    
    for _, row in treats_df.iterrows():
        name = str(row[name_col]).lower()
        price = row[price_col]
        stock = str(row[stock_col]) if pd.notna(row[stock_col]) else "0"
        
        # Scoring
        score = 0
        if 'леген' in name: score += 15 # Low fat/calorie
        if 'трахей' in name: score += 12 # Joint health
        if 'баран' in name or 'ягн' in name: score += 10 # Hypoallergenic, fits diet
        if 'ялович' in name: score += 5
        if 'сушен' in name: score += 5 # Natural dried
        if 'печив' in name or 'кіст' in name: score -= 10 # High fat or calorie
        
        candidates.append({
            "name": row[name_col].strip(),
            "price": price,
            "stock": stock,
            "score": score
        })
        
    candidates.sort(key=lambda x: x['score'], reverse=True)
    
    # Print only distinct items
    seen = set()
    print("--- TOP RECOMMENDATIONS FOR BJARKI (MAX 3000 UAH) ---")
    count = 0
    for item in candidates:
        if item['name'] not in seen and 'немає' not in item['stock'].lower():
            print(f"- {item['name']} | Price: {item['price']} UAH. | Stock: {item['stock']}")
            seen.add(item['name'])
            count += 1
            if count >= 10: break

except Exception as e:
    import traceback
    print(traceback.format_exc())
