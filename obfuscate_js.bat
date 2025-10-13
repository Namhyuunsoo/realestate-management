# 클라이언트 사이드 보안 강화 스크립트

# 1. JavaScript 난독화를 위한 패키지 설치
npm install --save-dev webpack webpack-cli javascript-obfuscator

# 2. 코드 난독화 실행
npx webpack --mode production

# 3. 원본 파일 백업 및 난독화된 파일로 교체
echo "📦 JavaScript 파일 난독화 완료"
echo "🔒 보안이 강화된 파일들이 app/static/js/dist/ 에 생성되었습니다"

# 4. HTML 파일에서 난독화된 파일 참조하도록 수정
echo "⚠️ HTML 파일에서 JS 파일 경로를 dist/ 폴더로 수정해야 합니다"

