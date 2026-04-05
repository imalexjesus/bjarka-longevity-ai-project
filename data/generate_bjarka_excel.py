
import pandas as pd
import json

file_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Наявність на складі_на 01.04.26.xlsx"
out_file = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Bjarka_Selection_April_2026.xlsx"

try:
    # Read headers
    df_raw = pd.read_excel(file_path, nrows=20, header=None)
    header_row_idx = None
    for i, row in df_raw.iterrows():
        if any('Найменування' in str(v) for v in row.values):
            header_row_idx = i
            break
            
    header_row_idx = header_row_idx if header_row_idx is not None else 7
    df = pd.read_excel(file_path, skiprows=header_row_idx)

    name_col = [c for c in df.columns if 'Найменування' in str(c)][0]
    price_col = [c for c in df.columns if 'ціна' in str(c).lower() and 'базова' not in str(c).lower()][0]
    stock_col = [c for c in df.columns if any(k in str(c) for k in ['Києві', 'Залишки', 'Stock'])][0]

    # Clean data
    df = df[df[name_col].notna()].copy()
    df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
    available_df = df[df[stock_col].astype(str).str.contains('немає', case=False) == False]

    # Categories
    mappings = {
        "Coat_Care": ["white", "shampoo", "whitening", "slicker", "detangle", "conditioner", "спрей", "шампунь", "пуходерка", "білої", "вовни"],
        "Hygiene_and_Aid": ["wipe", "ear", "paw", "wax", "chlorhexidine", "віск", "вух", "лап", "серветки", "хлоргексидин", "рукавичк"],
        "Senior_Support": ["joint", "gluco", "ortho", "mattress", "bed", "elevated", "bowl", "суглоб", "глюкозамін", "лежак", "ортопед", "миска", "трахея"],
        "Recovery_and_Mind": ["vmp", "recovery", "immunity", "energy", "antistress", "kong", "lick", "puzzle", "конг", "лизун", "імунітет", "антистрес", "інтелект", "іграшка", "легені"]
    }

    with pd.ExcelWriter(out_file) as writer:
        for sheet_name, keywords in mappings.items():
            mask = available_df[name_col].str.contains('|'.join(keywords), case=False, na=False)
            subset = available_df[mask][[name_col, price_col, stock_col]].copy()
            subset.columns = ['Назва товару', 'Ціна (Реком.)', 'Наявність']
            
            # Additional logic: filter for specific items that are actually good for Bjarki
            # (e.g. no heavy bones, no simple toys if it's Senior room)
            if sheet_name == "Coat_Care":
                # Ensure they are dogs items
                subset = subset[subset['Назва товару'].str.contains('собак', case=False)]
            
            subset = subset.sort_values(by='Ціна (Реком.)', ascending=False)
            subset.to_excel(writer, sheet_name=sheet_name, index=False)
            
    print(f"Excel file created at: {out_file}")

except Exception as e:
    import traceback
    print(traceback.format_exc())
