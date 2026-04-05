
import pandas as pd
import json

file_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\Наявність на складі_на 01.04.26.xlsx"
output_path = r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\data\treats_debug.json"

try:
    # Read the first 10 rows and print them out
    df = pd.read_excel(file_path, nrows=10)
    print("Columns:", df.columns.tolist())
    print("Head:\n", df.head(10))

    # Read more rows to find the actual header
    # Let's try to skip 1 or 2 rows
    for i in range(1, 4):
        df_skip = pd.read_excel(file_path, skiprows=i, nrows=5)
        print(f"Skip {i} rows columns:", df_skip.columns.tolist())

except Exception as e:
    print(f"Error: {e}")
