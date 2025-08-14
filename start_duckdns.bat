@echo off
title DuckDNS 자동 IP 업데이트
echo DuckDNS 자동 IP 업데이트 시작...
echo.
echo 도메인: realestate.duckdns.org
echo 업데이트 주기: 5분
echo 로그 파일: duckdns_update.log
echo.
echo 스크립트를 중단하려면 Ctrl+C를 누르세요.
echo.
pause
python duckdns_updater.py
pause

