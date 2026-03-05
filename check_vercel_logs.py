import requests
import os

token = os.environ.get("VERCEL_TOKEN") # 만약 있다면
if not token:
    print("수동 확인이 필요합니다. Vercel 대시보드(https://vercel.com/namhyuunsoos-projects/realestate-management/logs) 로 이동해 주세요.")
