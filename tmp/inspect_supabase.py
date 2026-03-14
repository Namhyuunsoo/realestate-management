import inspect
try:
    from postgrest import SelectRequestBuilder
    sig = inspect.signature(SelectRequestBuilder.order)
    print(f"SelectRequestBuilder.order signature: {sig}")
except Exception as e:
    print(f"Error inspecting SelectRequestBuilder: {e}")

try:
    from supabase import create_client
    # Simple dummy client to check if possible
    print("Supabase client created (dummy)")
except Exception as e:
    print(f"Supabase import error: {e}")
