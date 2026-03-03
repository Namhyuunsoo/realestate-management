# 설치 파일 빌드 가이드

## 📋 사전 요구사항

1. **Inno Setup 6 설치**
   - 다운로드: https://jrsoftware.org/isdl.php
   - 설치 후 컴퓨터 재시작 권장

2. **프로젝트 파일 준비**
   - `.env` 파일 (필수, 민감한 정보 포함)
   - `service_account.json` 파일 (선택, Google Sheets 기능 사용 시 필요)
   - 모든 소스 파일과 데이터 파일

## 🚀 빌드 방법

### 방법 1: 자동 빌드 스크립트 사용 (추천)

```cmd
build_installer.bat
```

이 스크립트가 자동으로:
1. Inno Setup 설치 경로 확인
2. 필수 파일 확인
3. 설치 파일 빌드

### 방법 2: Inno Setup GUI 사용

1. Inno Setup Compiler 실행
2. `installer_setup.iss` 파일 열기
3. "Build" → "Compile" 클릭

### 방법 3: 명령줄 직접 실행

```cmd
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer_setup.iss
```

## 📦 생성되는 파일

빌드 완료 후:
- `installer_output\부동산관리시스템_설치.exe` - 최종 설치 파일

## ⚠️ 주의사항

1. **민감한 정보 포함**
   - `.env` 파일과 `service_account.json`이 설치 파일에 포함됩니다
   - 배포 시 주의가 필요합니다

2. **Python 설치 확인**
   - 설치 프로그램 실행 시 Python 설치 여부를 확인하지만
   - Python이 없어도 설치를 계속 진행합니다 (사용자가 나중에 설치 가능)

3. **설치 후 작업**
   - 설치 후 `setup_new_computer.bat` 실행 필요
   - 가상환경 생성 및 패키지 설치 자동 진행

## 🔧 설정 파일 커스터마이징

`installer_setup.iss` 파일을 수정하여:
- 앱 이름, 버전, 발행자 정보 변경
- 설치 경로 변경
- 포함할 파일 목록 수정
- 아이콘 추가

## 📝 설치 파일 테스트

1. 다른 폴더에 테스트 설치 실행
2. 모든 파일이 제대로 복사되었는지 확인
3. `setup_new_computer.bat` 실행 테스트
4. `start_server.bat` 실행 테스트
5. 실제 서버 실행 테스트

## 🐛 문제 해결

### "Inno Setup을 찾을 수 없습니다" 오류
- Inno Setup 6이 설치되어 있는지 확인
- 설치 경로를 `build_installer.bat`에 직접 지정

### 빌드 오류
- `installer_setup.iss` 파일 구문 확인
- 모든 Source 파일 경로가 올바른지 확인

### 설치 파일이 너무 큼
- `data\raw\` 폴더의 Excel 파일 크기 확인
- 필요시 `.gitignore`에 추가된 파일은 제외
