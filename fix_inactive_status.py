from app import create_app
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

app = create_app()

with app.app_context():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    c = create_client(supabase_url, supabase_key)
    
    # 이름으로 조회
    res = c.table('users').select('id, name, email, status').in_('name', ['장희선', '진혜영']).execute()
    print("현재 상태:", res.data)
    
    # inactive로 강제 변경
    print("status='inactive' 업데이트...")
    c.table('users').update({'status': 'inactive'}).in_('name', ['장희선', '진혜영']).execute()
    
    res2 = c.table('users').select('id, name, email, status').in_('name', ['장희선', '진혜영']).execute()
    print("변경 후 상태:", res2.data)
