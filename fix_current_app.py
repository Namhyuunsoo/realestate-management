import os
import glob

def fix_current_app_check(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # has_app_context 안되어 있으면 import 추가
    if 'from flask import current_app' in content:
        if 'has_app_context' not in content:
            content = content.replace('from flask import current_app', 'from flask import current_app, has_app_context')
    elif 'flask import' in content:
        if 'has_app_context' not in content:
            # find the first flask import and add has_app_context
            pass # we'll just blindly try to add it, or simpler: append it
            
    # replace 'if current_app:' with 'if has_app_context() and current_app:'
    if 'if current_app:' in content:
        if 'has_app_context' not in content:
            # Add it to top if not present
            content = "from flask import has_app_context\n" + content
        content = content.replace('if current_app:', 'if has_app_context() and current_app:')
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {file_path}")

target_paths = [
    "app/services/**/*.py",
    "app/routes/**/*.py"
]

files = []
for p in target_paths:
    files.extend(glob.glob(p, recursive=True))

for f in files:
    fix_current_app_check(f)
