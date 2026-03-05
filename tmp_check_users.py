import os, json
os.environ['SUPABASE_URL'] = 'https://jwwdmtkwrejnwougcrod.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3d2RtdGt3cmVqbndvdWdjcm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MzUwNCwiZXhwIjoyMDg0MTU5NTA0fQ.YjVHqRrwywCsqG-E1_OZ2uV69CLihfo4QOcu3x5_9Is'
from supabase import create_client
c = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

res = c.table('users').select('email,name,manager_name,role,sheet_url').execute()
res2 = c.table('sheet_registry').select('slot_id,manager_name,sheet_url,is_active').order('slot_id').execute()

with open('tmp_result.json', 'w', encoding='utf-8') as f:
    json.dump({'users': res.data, 'sheet_registry': res2.data}, f, ensure_ascii=False, indent=2)

print("Done - saved to tmp_result.json")
