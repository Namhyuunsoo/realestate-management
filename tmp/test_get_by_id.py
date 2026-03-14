import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
client = create_client(url, key)

uuid = "8d65317d-76c5-42c3-8550-b06fe8fe2d7a"

try:
    print(f"Testing select with id={uuid}")
    res = client.table("users").select("*").eq("id", uuid).execute()
    print(f"Result count: {len(res.data)}")
    if res.data:
        print(f"Data: {res.data[0]}")
    else:
        print("Data is empty!")
        
    print(f"\nTesting select with id as string='darkbirth'")
    res2 = client.table("users").select("*").eq("id", "darkbirth").execute()
    print(f"Result count: {len(res2.data)}")
    if res2.data:
        print(f"Data: {res2.data[0]}")
except Exception as e:
    print(f"Error: {e}")
