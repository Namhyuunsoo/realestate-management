import inspect
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Env vars missing")
    exit(1)

client = create_client(url, key)
query = client.table("customers").select("*")

print(f"Type of query: {type(query)}")
print(f"Methods: {[m for m in dir(query) if not m.startswith('_')]}")

try:
    # Try to find 'order' method and its signature
    if hasattr(query, 'order'):
        sig = inspect.signature(query.order)
        print(f"order signature: {sig}")
    else:
        print("No order method found on query object")
except Exception as e:
    print(f"Error: {e}")
