---
description: 코드 수정 후 Git 커밋/푸시 및 Vercel 배포까지 자동으로 수행
---

// turbo-all

## 배포 워크플로우

1. 변경된 파일 스테이징
```
git add -A
```

2. 커밋 메시지 작성 및 커밋
```
git commit -m "<적절한 커밋 메시지>"
```

3. 원격 저장소 푸시
```
git push origin main
```

4. (필요 시) Vercel 강제 프로덕션 배포
```
vercel --prod
```

5. 배포 확인
```
vercel ls --limit 1
```
