import re
import os

target_file = r'c:\code1\realestate-management\app\services\repositories\__init__.py'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import AppConfig
if 'from app.config import AppConfig' not in content:
    content = content.replace('from flask import', 'from app.config import AppConfig\nfrom flask import')

# Replace FileUserRepository() -> FileUserRepository(data_dir=AppConfig.DATA_DIR)
content = re.sub(r'return FileUserRepository\(\)', r'return FileUserRepository(data_dir=AppConfig.DATA_DIR)', content)

# Replace FileCustomerRepository() -> FileCustomerRepository(data_dir=AppConfig.DATA_DIR)
content = re.sub(r'return FileCustomerRepository\(\)', r'return FileCustomerRepository(data_dir=AppConfig.DATA_DIR)', content)

# Replace FileBriefingRepository() -> FileBriefingRepository(data_dir=AppConfig.DATA_DIR)
content = re.sub(r'return FileBriefingRepository\(\)', r'return FileBriefingRepository(data_dir=AppConfig.DATA_DIR)', content)

# Replace FileRecommendationRepository(data_dir) -> FileRecommendationRepository(data_dir=AppConfig.DATA_DIR)
content = re.sub(r'return FileRecommendationRepository\(data_dir\)', r'return FileRecommendationRepository(data_dir=AppConfig.DATA_DIR)', content)

# Replace FileUserSheetRepository()
content = re.sub(r'return FileUserSheetRepository\(\)', r'return FileUserSheetRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "user_sheets.json"))', content)

# Replace FileSheetRegistryRepository()
content = re.sub(r'return FileSheetRegistryRepository\(\)', r'return FileSheetRegistryRepository(data_store_path=os.path.join(AppConfig.DATA_DIR, "sheet_registry.json"))', content)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("__init__.py patched successfully.")
