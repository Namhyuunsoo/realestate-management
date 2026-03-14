
import os

filepath = 'app/static/js/modules/ui/user-management.js'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_show_admin_ui = """// 어드민 UI 표시
function showAdminUI(showAllFeatures = true) {
  console.log(`🔍 showAdminUI 실행: ${showAllFeatures}`);

  // toggleAdminUI (user-utils.js) 가 있으면 우선 사용 (클래스 충돌 방지)
  if (typeof window.toggleAdminUI === 'function') {
    window.toggleAdminUI(showAllFeatures);
  }

  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach((element, index) => {
    if (showAllFeatures) {
      // 어드민: 모든 기능 표시
      element.classList.remove('hidden');
      element.classList.add('show');
      element.style.setProperty('display', 'flex', 'important');
    } else {
      // 매니저: 사용자관리/통계 버튼만 숨김
      const userManagementBtn = element.querySelector('#userManagementBtn');
      const adminStatsBtn = element.querySelector('#adminStatsBtn');
      
      if (userManagementBtn || adminStatsBtn) {
        element.classList.add('hidden');
        element.classList.remove('show');
        element.style.setProperty('display', 'none', 'important');
      } else {
        element.classList.remove('hidden');
        element.classList.add('show');
        element.style.setProperty('display', 'flex', 'important');
      }
    }
  });
}\n"""

# Replace lines 75 to 110 (1-based index)
# 75 is index 74
start_idx = 74
end_idx = 109 # Original showAdminUI ends around here

# Delete original function block and insert new one
# We need to find where setupUserManagementEvents starts to be safe
setup_events_idx = -1
for i, line in enumerate(lines):
    if "function setupUserManagementEvents()" in line:
        setup_events_idx = i
        break

if setup_events_idx != -1:
    del lines[start_idx:setup_events_idx]
    lines.insert(start_idx, new_show_admin_ui)
    
    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)
    print("Successfully replaced showAdminUI")
else:
    print("Failed to find setupUserManagementEvents")
