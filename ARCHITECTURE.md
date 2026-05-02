# ARCHITECTURE.md

## Purpose

`nullnull` 백엔드는 일정 조율과 장소 추천을 위한 서비스다. 이 문서는 NestJS 모듈 구조와 도메인 중심 설계(DDD)를 기준으로, 시스템의 책임 분리와 확장 기준을 정의한다.

## System Boundary

- 방 생성 및 상태 관리
- 참여자 등록 및 상태 관리
- 시간 입력 및 공통 가능 시간 계산
- 결과 생성 및 확정 처리
- 알림 및 후처리

## Backend Shape

권장 구조는 "도메인 중심 + NestJS 모듈 구조"다.

```text
src/
  common/               # guard, filter, interceptor, exception 등 공통 관심사
  config/               # 환경변수, 설정 모듈
  database/             # Prisma, DB 초기화, persistence bootstrap
  modules/
    auth/
    users/
    rooms/
    participants/
```

NestJS는 위 구조를 기준으로 모듈 단위 DI 그래프를 조립하는 역할을 한다. 구조의 기준은 프레임워크가 아니라 도메인이다.

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
- `recommendations`
    - 시간/장소 후보 생성
    - 최종 결과 확정

초기에는 최소 단위로 시작한다.

```text
modules/
  rooms/
  participants/
  users/
  auth/
```

`availability`, `recommendations`는 초기에는 `rooms` 내부에 포함할 수 있고, 복잡도가 올라가면 별도 모듈로 분리한다.

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
- NestJS는 구조를 구현하는 도구일 뿐 기준이 아니다.
- 새로운 기능은 기존 도메인에 포함 가능한지 먼저 판단한다.
- 요구사항과 구현 기준은 `docs/specs/`에서 결정한다.
- 작업 단위의 구체 실행은 `docs/exec-plans/`에 기록한다.

## First Build Order

1. Domain 모델링 (`Room`, `Participant`, 상태 전이)
2. Service 유스케이스 정의
3. Repository와 DB 연결
4. Controller에서 API 노출

## Anti-Pattern

- 파일 타입 기준 구조

```text
controllers/
services/
dtos/
```

- 기능 응집도가 낮다.
- 변경 이유가 다른 코드가 섞여 유지보수가 어려워진다.

- Service에 모든 로직 집중
    - 비즈니스 규칙은 Domain으로 내려야 한다.
    - Service는 흐름 제어와 유스케이스 조합에 집중해야 한다.

## Summary

도메인으로 나누고, NestJS로 조립한다.

구조는 단순하게 유지하고, 복잡도는 도메인 내부에서 해결한다.
