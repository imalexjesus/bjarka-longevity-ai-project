
import pandas as pd
import json

file_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Наявність на складі_на 01.04.26.xlsx"
output_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\treats_data.json"

try:
    # Read the whole thing as data and search for the header row
    df_raw = pd.read_excel(file_path, nrows=20, header=None)
    header_row_idx = None
    for i, row in df_raw.iterrows():
        if 'Найменування' in str(row.values):
            header_row_idx = i
            break
            
    if header_row_idx is None:
        print("Header not found in first 20 rows.")
        # Try brute force - let's check one cell if it has 'Найменування'
        # Wait, from debug we see index 7 has it (which is row 8)
        header_row_idx = 7

    df = pd.read_excel(file_path, skiprows=header_row_idx)
    print("Found columns:", df.columns.tolist())
    
    name_col = [c for c in df.columns if 'Найменування' in str(c)][0]
    price_col = [c for c in df.columns if 'ціна' in str(c).lower() and 'базова' not in str(c).lower()][0]
    stock_col = [c for c in df.columns if 'Залишки КИЕВ' in str(c)][0]

    # ... Rest of the filter logic ...
    keywords = ['ласощ', 'вкусняш', 'кост', 'печив', 'вухо', 'сушен', 'трахей', 'легені', 'баран', 'ягня']
    mask = df[name_col].str.contains('|'.join(keywords), case=False, na=False)
    treats_df = df[mask].copy()
    
    # Filter Price
    treats_df[price_col] = pd.to_numeric(treats_df[price_col], errors='coerce')
    treats_df = treats_df[treats_df[price_col] <= 3000].dropna(subset=[price_col, name_col])
    
    # Filter Stock (just to be sure something is there)
    treats_df = treats_df[treats_df[stock_col].notna()]
    
    # Selection for Bjarki (Overweight, Senior, Joints)
    # 1. Trachea (beef or lamb) - good for joints.
    # 2. Lungs - low calorie.
    # 3. Lamb - preferred for her current diet.
    
    candidates = []
    for _, row in treats_df.iterrows():
        name = str(row[name_col]).lower()
        price = row[price_col]
        stock = row[stock_col]
        
        score = 0
        if 'трахей' in name: score += 15
        if 'леген' in name: score += 12
        if 'баран' in name or 'ягня' in name: score += 10
        if 'сушен' in name: score += 5
        if 'кіст' in name: score -= 5
        if 'печив' in name: score -= 3 # usually more calories
        
        candidates.append({
            "name": row[name_col],
            "price": price,
            "stock": str(stock),
            "score": score
        })
        
    candidates.sort(key=lambda x: x['score'], reverse=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(candidates[:50], f, ensure_ascii=False, indent=2)
        
    print(f"Extraction successful. Top treats saved to json.")

except Exception as e:
    import traceback
    print(traceback.format_exc())
