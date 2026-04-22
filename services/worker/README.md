# Worker Service

비동기 후처리와 스케줄링을 담당한다.

## Responsibilities

- 결과 재계산 작업
- 알림 발송
- 만료 방 정리
- 재시도와 데드레터 정책

## Do Not Put Here

- API transport 로직
- 영속 계층 구현 상세
