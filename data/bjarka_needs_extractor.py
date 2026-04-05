
import pandas as pd
import json

file_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Наявність на складі_на 01.04.26.xlsx"

try:
    df_raw = pd.read_excel(file_path, nrows=20, header=None)
    header_row_idx = None
    for i, row in df_raw.iterrows():
        if any('Найменування' in str(v) for v in row.values):
            header_row_idx = i
            break
            
    header_row_idx = header_row_idx if header_row_idx is not None else 7
    df = pd.read_excel(file_path, skiprows=header_row_idx)

    def find_col(keywords):
        for col in df.columns:
            if any(k in str(col) for k in keywords):
                return col
        return None

    name_col = find_col(['Найменування'])
    price_col = find_col(['Рекомендована ціна', 'Ціна', 'Price'])
    stock_col = find_col(['Києві', 'Залишки КИЕВ', 'Склад', 'Stock'])

    # Categories to search for Bjarki
    needs = {
        "Main Food": ["Farmina", "Pumpkin", "Lamb"],
        "Joints": ["Glucosamine", "Chondroitin", "Глюкозамін", "Хондроїтин", "Суглоб", "Трахея", "Joint"],
        "Heart/Skin": ["Омега", "Риб'ячий жир", "Omega", "Fish oil", "Криль"],
        "Weight Loss Treats": ["Легені", "Lungs"],
        "Hygiene/Skin": ["Шампунь", "Shampoo", "Гігієна"],
        "Mental Stimulation": ["Kong", "Lick", "Інтелект", "Іграшка"]
    }

    results = {}
    
    df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
    available_df = df[df[stock_col].astype(str).str.contains('немає', case=False) == False]

    for category, keywords in needs.items():
        mask = available_df[name_col].str.contains('|'.join(keywords), case=False, na=False)
        subset = available_df[mask].copy()
        
        # Sort by relevance (best match first)
        category_results = []
        for _, row in subset.head(10).iterrows():
            category_results.append({
                "name": row[name_col].strip(),
                "price": row[price_col],
                "stock": str(row[stock_col])
            })
        results[category] = category_results

    print("--- COMPREHENSIVE BJARKIS NEEDS ---")
    print(json.dumps(results, ensure_ascii=False, indent=2))

except Exception as e:
    import traceback
    print(traceback.format_exc())
