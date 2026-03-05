import os
env_path = 'c:/code1/realestate-management/.env'

# 읽어서 \x00 제거하고 다시 쓰기
with open(env_path, 'rb') as f:
    content = f.read()

# null byte 제거
cleaned_content = content.replace(b'\x00', b'')

with open(env_path, 'wb') as f:
    f.write(cleaned_content)

print(".env cleaned.")
