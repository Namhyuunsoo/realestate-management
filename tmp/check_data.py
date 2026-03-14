import os
import pandas as pd
import glob

def check_excel_data():
    data_dir = "data"
    excel_files = glob.glob(os.path.join(data_dir, "*.xlsx"))
    
    print(f"🔍 Checking {len(excel_files)} Excel files in {data_dir}...")
    
    for file_path in excel_files:
        try:
            print(f"\n--- File: {file_path} ---")
            df = pd.read_excel(file_path)
            print(f"Rows: {len(df)}, Columns: {list(df.columns)}")
            
            # Check for critical columns
            if 'manager' not in df.columns:
                print("❌ Missing 'manager' column!")
            
            # Check for data types
            if 'created_at' in df.columns:
                print(f"'created_at' sample: {df['created_at'].iloc[0] if len(df) > 0 else 'N/A'} (Type: {df['created_at'].dtype})")
            
            # Check for NaN in IDs or mandatory fields
            if 'id' in df.columns:
                nan_ids = df['id'].isna().sum()
                if nan_ids > 0:
                    print(f"❌ Found {nan_ids} NaN IDs!")

        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")

if __name__ == "__main__":
    check_excel_data()
