import os

file_path = r'c:\code1\realestate-management\app\config.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert the helper functions before @dataclass
helpers = """def is_vercel() -> bool:
    return os.environ.get("VERCEL", "0") == "1"

def get_path(env_name: str, default: str, vercel_fallback: str) -> str:
    val = os.getenv(env_name)
    if val: return val
    return vercel_fallback if is_vercel() else default

"""

if 'def is_vercel' not in content:
    content = content.replace('@dataclass\nclass AppConfig:', helpers + '@dataclass\nclass AppConfig:')

content = content.replace('AppConfig._get_path', 'get_path')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("config.py patched successfully")
