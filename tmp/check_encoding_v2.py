
import codecs

def check_encodings(filename):
    for enc in ['utf-8', 'cp949', 'euc-kr', 'utf-8-sig']:
        try:
            with codecs.open(filename, 'r', encoding=enc) as f:
                content = f.read()
                if "사용자" in content:
                    print(f"Match found with: {enc}")
                    return enc
        except:
            continue
    return None

enc = check_encodings('app/static/js/modules/ui/user-management.js')
print(f"Final detected encoding: {enc}")
