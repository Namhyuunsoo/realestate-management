import os
os.environ['SUPABASE_URL'] = 'https://jwwdmtkwrejnwougcrod.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3d2RtdGt3cmVqbndvdWdjcm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MzUwNCwiZXhwIjoyMDg0MTU5NTA0fQ.YjVHqRrwywCsqG-E1_OZ2uV69CLihfo4QOcu3x5_9Is'

from supabase import create_client
c = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

CORRECT_URLS = {
    '1': ('남현수', 'https://docs.google.com/spreadsheets/d/18I1rog8mytAT9cHgLQOrRjqo_MA7uC2jzWf7sJRN4LY/edit?gid=1916491129#gid=1916491129'),
    '2': ('정한나', 'https://docs.google.com/spreadsheets/d/1B4w5TPxNZ9ZfzHn1LxHJoqbNDkPkI13in8F4VH-zZi8/edit?gid=1305239230#gid=1305239230'),
    '3': ('오태식', 'https://docs.google.com/spreadsheets/d/1XVbR4WmllKJPQx_bATHVEJ0EGumnkMlFbSGzmDByYhg/edit?gid=1008165249#gid=1008165249'),
    '4': ('유아름', 'https://docs.google.com/spreadsheets/d/1sl1UNf4QWAEb6k_pPHluwHuU58IhknHpY6AUR6EsS6s/edit?gid=1144727921#gid=1144727921'),
    '5': ('이한신', 'https://docs.google.com/spreadsheets/d/1dkmzISKJEXhScr3uyjca-2mIt-H3dqsPQen-4tAqQrI/edit?gid=814133760#gid=814133760'),
    '6': ('공석', 'https://docs.google.com/spreadsheets/d/1h-JlsFTsYKmRTYnHEL8H_uobXaYrRMichUZ7qK4YUmE/edit?gid=1305239230#gid=1305239230'),
    '7': ('공석', 'https://docs.google.com/spreadsheets/d/1KB4NSYCPuqBOfuv_nixz_9tM_5ul67hSTZHehGVLPq4/edit?gid=1305239230#gid=1305239230')
}

res2 = c.table('sheet_registry').select('slot_id,manager_name,sheet_url,is_active').order('slot_id').execute()

with open('slot_verify_result.txt', 'w', encoding='utf-8') as f:
    f.write("===== 현재 DB 슬롯 상태 확인 =====\n")
    for r in res2.data:
        slot_id = str(r['slot_id'])
        db_manager = r.get('manager_name', '')
        db_url = r.get('sheet_url', '')
        
        expected_manager, expected_url = CORRECT_URLS.get(slot_id, ('', ''))
        
        status = "✅ 일치"
        if db_manager != expected_manager or db_url != expected_url:
            status = "❌ 불일치"
            
        f.write(f"[{status}] Slot {slot_id}:\n")
        f.write(f"  DB  : {db_manager} / {db_url}\n")
        f.write(f"  사용자: {expected_manager} / {expected_url}\n")
        if status == "❌ 불일치":
            if db_manager != expected_manager:
                f.write(f"    --> 담당자 불일치! (DB: {db_manager}, 사용자: {expected_manager})\n")
            if db_url != expected_url:
                f.write(f"    --> URL 불일치! \n      (DB: {db_url})\n      (사: {expected_url})\n")
        f.write("\n")

    f.write("===== 담당자 목록 (users) =====\n")
    res = c.table('users').select('email,name,manager_name,role').execute()
    for u in res.data:
        f.write(f"  {u['name']}({u.get('manager_name', '')}) - {u['email']} [{u['role']}]\n")

print("확인 완료: slot_verify_result.txt 파일을 기록함.")
