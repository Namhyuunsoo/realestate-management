# Gzip 압축 기능 설치 스크립트 (PowerShell)
Write-Host "========================================" -ForegroundColor Green
Write-Host "Gzip 압축 기능 설치 스크립트" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "🔍 현재 디렉토리 확인..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "현재 디렉토리: $currentDir" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 새로운 패키지 설치 중..." -ForegroundColor Yellow
Write-Host "Flask-Compress 패키지를 설치합니다." -ForegroundColor Cyan
Write-Host ""

# 가상환경 확인 및 활성화
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "✅ 가상환경 활성화 중..." -ForegroundColor Green
    & "venv\Scripts\Activate.ps1"
    Write-Host ""
    
    Write-Host "📦 Flask-Compress 설치 중..." -ForegroundColor Yellow
    pip install Flask-Compress==1.14
    Write-Host ""
    
    Write-Host "✅ 설치 완료!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📋 설치된 패키지 확인:" -ForegroundColor Yellow
    pip list | Select-String "Flask-Compress"
    Write-Host ""
    
    Write-Host "🚀 서버 재시작이 필요합니다." -ForegroundColor Red
    Write-Host "현재 실행 중인 서버를 종료하고 다시 시작해주세요." -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📊 압축 기능 확인 방법:" -ForegroundColor Yellow
    Write-Host "1. 서버 시작 후 http://localhost:5000/api/compression/status 접속" -ForegroundColor Cyan
    Write-Host "2. 브라우저 개발자 도구 → Network 탭에서 Content-Encoding: gzip 확인" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "❌ 가상환경을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "venv 폴더가 있는지 확인해주세요." -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "설치 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "Enter를 눌러 종료"
