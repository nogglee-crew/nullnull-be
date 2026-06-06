# Backend Domain Map

## Core Flow

1. 사용자가 방을 만들고 방장이 된다.
2. 시스템이 방 `slug`를 발급하고 방을 `COLLECTING` 상태로 둔다.
3. 참여자가 익명 `participantUuid` 또는 로그인 사용자로 입장한다.
4. 참여자가 `BlockedSlot`으로 불가 시간을 제출한다.
5. 필요하면 참여자가 `Origin`을 제출한다.
6. 시스템이 `TimeOption`, `PlaceOption`을 계산한다.
7. 방장이 `Meeting`을 확정하거나, 시스템이 `Closure`로 종료를 기록한다.

## Domain Objects

- `User`: 로그인된 서비스 사용자
- `Room`: 제목, 상태, 날짜 범위, 수집 옵션, 마감
- `Participant`: 방 참여자, 역할, 제출 상태, 익명 식별자
- `BlockedSlot`: 참여자별 불가 시간 슬롯
- `Origin`: 참여자 출발 위치
- `TimeOption`: 공통 가능 시간 후보
- `PlaceOption`: 장소 후보
- `Meeting`: 최종 확정된 시간/장소 조합
- `Closure`: 방 종료 이력
- `PolicyVersion`, `UserConsent`: 약관/개인정보처리방침 동의 이력

## Critical Policies

- 방 상태 전이는 명시된 상태 머신만 따른다.
- 동일 참여자의 `BlockedSlot`은 같은 날짜/슬롯 인덱스로 중복되면 안 된다.
- `TimeOption`, `PlaceOption`은 같은 입력 스냅샷이면 재현 가능해야 한다.
- `Meeting`은 방당 최대 1개만 존재한다.
- `Closure`는 방당 최대 1개만 존재한다.

## Open Boundaries

아래는 구현 전에 결정해야 할 기술 경계다.

- 동기 계산 vs 비동기 재계산
- REST only vs REST + WebSocket
- 단일 서비스 vs API/Worker 분리
- Prisma ORM 중심 구현 vs 일부 직접 SQL 혼합
