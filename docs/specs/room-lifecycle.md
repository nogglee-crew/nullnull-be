# Room Lifecycle

현재 Prisma 기준 핵심 객체는 `Room`, `Participant`, `Meeting`, `Closure`다. 이 문서는 백엔드가 가장 먼저 고정해야 하는 방 라이프사이클과 상태 전이 규칙을 요약한다.

## Main States

- `COLLECTING`: 방 생성 직후, 참여자 입력 수집 중
- `READY`: 결과 계산과 확정이 가능한 상태
- `CONFIRMED`: 방장이 `Meeting`을 확정한 상태
- `CLOSED`: 수동 종료 또는 만료 처리된 상태

상태명은 Prisma enum `RoomStatus`를 기준으로 고정한다.

## Core Requirements

- 방은 고유 slug로 식별된다.
- 방장은 `hostId -> users.user_id`로 연결된다.
- 참여자는 익명 `participantUuid` 또는 로그인 사용자 `userId`로 식별된다.
- 확정은 단일 `Meeting` 레코드를 가리켜야 한다.
- 종료는 단일 `Closure` 레코드로 기록되어야 한다.
- 만료 정책은 `deadlineAt` 기반 자동 처리될 수 있다.

## Write Paths

- 방 생성
- 방 기본 설정 수정
- 참여자 입장 또는 재입장
- `BlockedSlot` 제출
- `Origin` 제출
- `TimeOption` / `PlaceOption` 계산 결과 생성
- `Meeting` 확정
- `Closure` 생성에 의한 방 종료 또는 만료 처리

## Read Paths

- 방 기본 정보 조회
- 참여자 요약 조회
- `TimeOption` / `PlaceOption` 최신 후보 조회
- 확정된 `Meeting` 조회
