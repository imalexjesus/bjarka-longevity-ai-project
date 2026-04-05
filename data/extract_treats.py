
import pandas as pd
import json
import sys

file_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Наявність на складі_на 01.04.26.xlsx"

try:
    df_raw = pd.read_excel(file_path, nrows=20, header=None)
    header_row_idx = None
    for i, row in df_raw.iterrows():
        if 'Найменування' in str(row.values):
            header_row_idx = i
            break
            
    header_row_idx = header_row_idx if header_row_idx is not None else 7
    df = pd.read_excel(file_path, skiprows=header_row_idx)
    
    name_col = [c for c in df.columns if 'Найменування' in str(c)][0]
    price_col = [c for c in df.columns if 'ціна' in str(c).lower() and 'базова' not in str(c).lower()][0]
    stock_col = [c for c in df.columns if 'Залишки КИЕВ' in str(c)][0]

    keywords = ['ласощ', 'вкусняш', 'кост', 'печив', 'вухо', 'сушен', 'трахей', 'легені', 'баран', 'ягня', 'хрустик', 'чипси']
    mask = df[name_col].str.contains('|'.join(keywords), case=False, na=False)
    treats_df = df[mask].copy()
    
    treats_df[price_col] = pd.to_numeric(treats_df[price_col], errors='coerce')
    treats_df = treats_df[treats_df[price_col] <= 3000].dropna(subset=[price_col, name_col])
    
    candidates = []
    for _, row in treats_df.iterrows():
        name = str(row[name_col]).lower()
        price = row[price_col]
        stock = str(row[stock_col]) if pd.notna(row[stock_col]) else "0"
        
        score = 0
        if 'трахей' in name: score += 15
        if 'леген' in name: score += 12
        if 'баран' in name or 'ягня' in name: score += 10
        if 'сушен' in name: score += 5
        if 'кіст' in name: score -= 5
        if 'печив' in name: score -= 3
        
        # Bjarka's specific diet (Farmina N&D Pumpkin Lamb)
        if 'farmina' in name.lower(): score += 20  # Matches brand preference maybe
        
        candidates.append({
            "name": row[name_col],
            "price": price,
            "stock": stock,
            "score": score
        })
        
    candidates.sort(key=lambda x: x['score'], reverse=True)
    
    # Print the result to stdout so I can read it from the command status
    print("--- JSON OUTPUT START ---")
    print(json.dumps(candidates[:30], ensure_ascii=False, indent=2))
    print("--- JSON OUTPUT END ---")

except Exception as e:
    import traceback
    print(traceback.format_exc(), file=sys.stderr)
