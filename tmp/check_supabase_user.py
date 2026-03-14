import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client = create_client(url, key)

try:
    res = client.table("users").select("*").eq("email", "darkbirth@naver.com").execute()
    if res.data:
        print(f"Supabase user record: {res.data[0]}")
    else:
        print("User not found in Supabase 'users' table.")
except Exception as e:
    print(f"Error: {e}")
