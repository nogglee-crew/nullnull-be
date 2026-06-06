# Architecture

이 문서는 `nullnull` 백엔드의 시스템 경계, 모듈 구조, 레이어 책임을 정의한다.
도메인 요구사항과 상태 전이는 `docs/specs/README.md`를 기준으로 확인한다.

## System Boundary

- 방 생성 및 상태 관리
- 참여자 등록 및 상태 관리
- 시간 입력 및 공통 가능 시간 계산
- 결과 생성 및 확정 처리
- 알림 및 후처리

## Backend Shape

권장 구조는 "도메인 중심 + NestJS 모듈 구조"다. NestJS는 모듈 단위 DI 그래프를 조립하는 도구다.

```text
src/
  common/               # guard, filter, interceptor, exception 등 공통 관심사
  database/             # Prisma, DB 초기화, persistence bootstrap
  modules/
    auth/
    users/
    rooms/
    participants/
```

## Domain Modules

도메인은 기능이 아니라 비즈니스 개념 기준으로 분리한다.

- `rooms`
    - 방 생성
    - 상태 전이 (`COLLECTING -> READY -> CONFIRMED -> CLOSED`)
    - 방장 권한
- `participants`
    - 참여자 등록
    - 제출 상태 (`JOINED -> SUBMITTED`)
- `availability`
    - 불가능 시간
    - 시간 교집합 계산

## Layer Responsibilities

각 모듈 내부는 아래 레이어를 기본으로 가진다.

```text
rooms/
  rooms.module.ts
  rooms.controller.ts
  rooms.service.ts
  dto/
  entities/
  repositories/
```

- `Controller`
    - HTTP 요청/응답 처리
    - 입력 검증
    - Service 호출
    - 비즈니스 로직 금지
- `Service`
    - 유스케이스 실행
    - 도메인 흐름 제어
    - 예: `createRoom()`, `closeRoom()`, `confirmRoom()`
- `Domain`
    - 상태 전이
    - 비즈니스 규칙
    - 예: `room.confirm()`, `room.close(reason)`
    - 외부 의존성 금지
- `Repository`
    - DB 접근 추상화
    - ORM 의존 분리

## Decision Policy

- 구조 기준은 항상 도메인이다.
- 새로운 기능은 기존 도메인에 포함 가능한지 먼저 판단한다.

## Build Order

1. Domain 모델링 (`Room`, `Participant`, 상태 전이)
2. Service 유스케이스 정의
3. Repository와 DB 연결
4. Controller에서 API 노출
