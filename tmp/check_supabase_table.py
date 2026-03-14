import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client = create_client(url, key)

try:
    # Get one record to check columns
    res = client.table("customers").select("*").limit(1).execute()
    if res.data:
        print(f"Sample record columns: {list(res.data[0].keys())}")
    else:
        print("No records found in 'customers' table.")
        
    # Check if 'created_at' exists
    res_count = client.table("customers").select("id").limit(1).execute()
    print(f"Table exists and has at least {len(res_count.data)} record(s).")
    
except Exception as e:
    print(f"Error: {e}")
