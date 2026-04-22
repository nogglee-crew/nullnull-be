# ARCHITECTURE.md

## Purpose

`nullnull` 백엔드는 그룹 일정 조율과 장소 추천을 처리하는 서비스다. 현재 기술 스택은 확정되지 않았으므로, 이 문서는 프레임워크보다 도메인 경계와 책임 분리를 우선 정의한다.

## System Boundary

- 방 생성과 수정
- 참여자 입력과 익명 토큰 관리
- 시간 후보/불가 시간 관리
- 공통 가능 시간 계산
- 위치 수집과 미팅 포인트 계산
- 결과 확정과 알림 발송
- 실시간 동기화와 비동기 후처리

## Backend Shape

권장 구조는 "도메인 중심 + 어댑터 분리"다.

```text
services/
  api/                  # HTTP/WebSocket ingress, auth/session, orchestration
  worker/               # async jobs, notifications, cleanup, recomputation
packages/
  domain/               # entities, value objects, domain services, policies
  application/          # use cases, command/query handlers, transactions
  contracts/            # request/response DTOs, event schemas, error model
  platform/             # db, cache, queue, geo provider, push provider adapters
  testkit/              # fixtures, scenario builders, contract tests
docs/
  ...                   # human + agent readable system of record
```

기술 선택이 단일 런타임으로 수렴하더라도 이 경계는 유지한다. 예를 들어 Nest.js를 쓰면 `services/api`는 Nest 모듈 조립 계층이 되고, Go를 쓰면 transport layer가 된다.

## Domain Modules

아래 모듈은 프레임워크 패키지보다 우선되는 기준 분해다.

- `rooms`: 방 생성, 상태 전이, 방장 권한
- `participants`: 참여자 등록, 토큰, 제출 상태
- `availability`: 후보 시간대, 불가 시간 블록, 교집합 계산
- `locations`: 참여자 위치, 중심점, 익명화 정책
- `recommendations`: 결과 스냅샷, 추천 장소, 확정 처리
- `notifications`: 푸시/알림톡 발송, 재시도, 발송 이력
- `realtime`: 방 단위 브로드캐스트, presence, 재계산 트리거

## Layer Responsibilities

- `domain`: 비즈니스 규칙만 가진다. 외부 API, SQL, 프레임워크 타입 의존 금지.
- `application`: 유스케이스를 구성한다. 트랜잭션 경계와 권한 검사를 명시한다.
- `contracts`: 외부 노출 계약을 보관한다. API/이벤트/에러 코드는 이 레이어가 기준이다.
- `platform`: 저장소, 캐시, 메시지 브로커, 외부 지도/알림 공급자 구현을 담는다.
- `services/api`: 인증, 입력 검증, transport mapping, 응답 조립을 수행한다.
- `services/worker`: 비동기 작업과 스케줄링, 재시도 정책을 수행한다.

## Decision Policy

- 요구사항과 구현 기준은 `docs/specs/`에서 결정한다.
- 작업 단위의 구체 실행은 `docs/exec-plans/`에 기록한다.

## First Build Order

1. `contracts`에서 에러 코드와 DTO 식별자를 정한다.
2. `domain`에 방/참여자/시간 규칙을 모델링한다.
3. `application`에 방 생성, 참여자 제출, 결과 계산 유스케이스를 만든다.
4. `platform`에 저장소와 외부 연동 어댑터를 붙인다.
5. `api`와 `worker`는 가장 마지막에 조립한다.
