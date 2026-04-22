# Backend Domain Map

## Core Flow

1. 방장이 방을 만든다.
2. 시스템이 방 slug와 방장 세션을 발급한다.
3. 참여자가 익명 토큰으로 입장하고 불가 시간을 제출한다.
4. 선택적으로 위치를 제출한다.
5. 시스템이 공통 가능 시간과 미팅 포인트를 계산한다.
6. 방장이 결과를 확정한다.
7. 시스템이 확정 결과를 브로드캐스트하고 알림을 발송한다.

## Domain Objects

- `Room`: 제목, 상태, 날짜 범위, 후보 시간대, 마감
- `Participant`: 이름, 제출 여부, 세션 토큰
- `UnavailableBlock`: 참여자별 불가 시간 구간
- `Location`: 참여자 위치와 표기용 라벨
- `RoomResult`: 계산 시점별 결과 스냅샷
- `RecommendedPlace`: 최종 후보 장소
- `Notification`: 발송 대상, 채널, 상태

## Critical Policies

- 방 상태 전이는 명시된 상태 머신만 따른다.
- 동일 참여자의 시간 블록은 겹치지 않아야 한다.
- 결과 계산은 입력 스냅샷 기준으로 재현 가능해야 한다.
- 확정 이후 위치 정밀도는 익명화 정책을 따라 낮춰질 수 있다.

## Open Boundaries

아래는 구현 전에 결정해야 할 기술 경계다.

- 동기 계산 vs 비동기 재계산
- REST only vs REST + WebSocket
- 단일 서비스 vs API/Worker 분리
- 직접 SQL 중심 vs ORM 중심
