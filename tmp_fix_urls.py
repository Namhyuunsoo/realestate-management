import os
os.environ['SUPABASE_URL'] = 'https://jwwdmtkwrejnwougcrod.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3d2RtdGt3cmVqbndvdWdjcm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MzUwNCwiZXhwIjoyMDg0MTU5NTA0fQ.YjVHqRrwywCsqG-E1_OZ2uV69CLihfo4QOcu3x5_9Is'

from supabase import create_client
c = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

# 올바른 시트 URL (사용자 제공)
CORRECT_URLS = {
    'darkbirth@naver.com': 'https://docs.google.com/spreadsheets/d/18I1rog8mytAT9cHgLQOrRjqo_MA7uC2jzWf7sJRN4LY/edit?gid=1916491129#gid=1916491129',
    'charming_nam@naver.com': 'https://docs.google.com/spreadsheets/d/18I1rog8mytAT9cHgLQOrRjqo_MA7uC2jzWf7sJRN4LY/edit?gid=1916491129#gid=1916491129',
    'jeonghannah@naver.com': 'https://docs.google.com/spreadsheets/d/1B4w5TPxNZ9ZfzHn1LxHJoqbNDkPkI13in8F4VH-zZi8/edit?gid=1305239230#gid=1305239230',
    'ots2580@naver.com': 'https://docs.google.com/spreadsheets/d/1XVbR4WmllKJPQx_bATHVEJ0EGumnkMlFbSGzmDByYhg/edit?gid=1008165249#gid=1008165249',
    'hswkrl@naver.com': 'https://docs.google.com/spreadsheets/d/1sl1UNf4QWAEb6k_pPHluwHuU58IhknHpY6AUR6EsS6s/edit?gid=1144727921#gid=1144727921',
}

# 1) 활성 사용자 sheet_url 수정
print("===== [1] 사용자 sheet_url 수정 =====")
res = c.table('users').select('id,email,name,sheet_url').execute()
for user in res.data:
    email = user['email']
    if email in CORRECT_URLS:
        correct_url = CORRECT_URLS[email]
        current_url = user.get('sheet_url', '')
        if current_url != correct_url:
            print(f"  수정: {user['name']}({email})")
            print(f"    기존: {current_url}")
            print(f"    변경: {correct_url}")
            c.table('users').update({'sheet_url': correct_url}).eq('id', user['id']).execute()
            print(f"    => 완료!")
        else:
            print(f"  정상: {user['name']}({email}) - 이미 올바른 URL")

# 2) 장희선, 진혜영 비활성화
print()
print("===== [2] 장희선/진혜영 비활성화 확인 =====")
for email in ['izskyok@gmail.com', 'peaceinwater@hanmail.net']:
    user_res = c.table('users').select('id,email,name,sheet_url,role').eq('email', email).execute()
    if user_res.data:
        u = user_res.data[0]
        print(f"  {u['name']}({email}): sheet_url={u.get('sheet_url','(없음)')}")
        # sheet_url 비우기
        if u.get('sheet_url'):
            c.table('users').update({'sheet_url': ''}).eq('id', u['id']).execute()
            print(f"    => sheet_url 비움 처리 완료")
        else:
            print(f"    => 이미 sheet_url이 비어있음")

# 3) 최종 확인
print()
print("===== [3] 최종 상태 =====")
res = c.table('users').select('email,name,manager_name,role,sheet_url').execute()
for r in res.data:
    su = r.get('sheet_url') or '(없음)'
    print(f"  {r['name']:6s}({r.get('manager_name','')}): {su[:70]}...")
