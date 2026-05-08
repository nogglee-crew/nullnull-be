# Room Ready API Plan

## Summary

- Goal: 방장이 수동으로 입력 수집을 마감하고, 방 상태를 `COLLECTING`에서 `READY`로 변경하는 API를 구현한다.
- Owner: Codex + nogglee
- Date: 2026-05-08

## Context

- Relevant specs:
    - 사용자 제공 "방 마감 및 후보 생성 API" 요구사항
    - `docs/specs/room-lifecycle.md`
    - `docs/specs/domain-map.md`
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/completed/participant-participation-api-plan.md`
    - `docs/exec-plans/active/participant-decline-api-plan.md`
- Open decisions:
    - room 식별자를 현재 요구사항대로 `roomId`로 유지할지, 이후 room API 전체를 `slug`로 통일할지 확인 필요

## Scope

- In:
    - `POST /rooms/:roomId/ready` 또는 동등한 수동 마감 API
    - access token 기반 방장 권한 검증
    - room 상태 `COLLECTING -> READY` 전이
    - `SUBMITTED` participant 존재 여부 검증
    - 제출 데이터 기반 시간 후보 생성
    - `collectOrigin=true`일 때 장소 후보 생성
    - 성공/실패 Swagger 문서화
- Out:
    - 자동 마감 스케줄러 구현
    - 결과 확정 API
    - 방 종료 API
    - 후보 추천 고도화/랭킹 최적화

## Plan

1. 식별자와 권한 기준을 확정한다.
    - 요청은 인증 필수 API로 두고 `JwtAuthGuard`를 사용한다.
    - path parameter는 우선 요구사항대로 `roomId`를 사용한다.
    - 요청 사용자가 `room.hostUserId`와 일치하는지 검증한다.
    - verify: 비방장 호출 시 `403 FORBIDDEN`, 인증 누락 시 `401 UNAUTHORIZED`가 계획에 명시됨
2. 마감 가능 상태를 검증한다.
    - room 존재 여부 확인
    - room 상태가 `COLLECTING`인지 확인
    - `SUBMITTED` 상태 participant가 1명 이상인지 확인
    - verify: `ROOM_NOT_FOUND`, `INVALID_ROOM_STATUS`, `NO_SUBMITTED_PARTICIPANTS` 분기가 서비스에 직접 매핑될 수 있음
3. 후보 생성 입력 모델을 확정한다.
    - 시간 후보 생성은 `SUBMITTED` participant의 `blocked_slots`를 기준으로 계산한다.
    - `blocked_slots`가 비어 있는 `SUBMITTED` participant는 전 시간 가능으로 취급한다.
    - 장소 후보 생성은 `collectOrigin=true`이고 유효한 origin이 있는 participant 데이터만 사용한다.
    - origin 기반 중간 지점을 계산한 뒤, 그 좌표를 기준으로 Kakao Local API를 호출해 추천 장소 후보를 만든다.
    - verify: 후보 생성에 쓰이는 participant/status/origin 기준이 문서에 명시됨
4. 시간 후보 생성 유스케이스를 구현한다.
    - 제출된 불가능 시간 정보를 바탕으로 가능한 시간 슬롯을 계산한다.
    - 계산된 결과를 room 후보 테이블/모델에 저장한다.
    - verify: 후보 생성과 room 상태 전이가 하나의 트랜잭션 또는 일관된 저장 흐름으로 묶임
5. 장소 후보 생성 유스케이스를 구현한다.
    - `collectOrigin=true`일 때만 추천 장소 후보를 생성한다.
    - 중간 지점 계산 후 Kakao Local API로 장소 후보 TOP N을 조회하고 저장한다.
    - `collectOrigin=false`면 장소 후보 생성은 건너뛴다.
    - verify: 장소 후보 생성이 room 설정값에 따라 분기되고, 실패 정책이 명확히 정리됨
6. 방 상태를 `READY`로 전이한다.
    - 시간 후보/장소 후보 생성 및 저장이 모두 끝난 뒤 room 상태를 `READY`로 변경한다.
    - verify: 상태 전이 조건과 저장 순서가 문서에 명시됨
7. 응답과 문서를 정리한다.
    - 성공 응답은 `data: null`, 메시지는 `방이 마감되었습니다.`
    - 401/403/404/409/422/500 문서화
    - verify: Swagger 예시와 실제 분기가 일치함
8. 자동 마감과의 연결 지점을 기록한다.
    - 자동 마감 스케줄러는 동일한 후보 생성/상태 전이 로직을 재사용할 수 있어야 한다.
    - 수동 마감 API와 자동 마감 내부 job의 공통 유스케이스 경계를 기록한다.
    - verify: 자동 마감이 중복 구현 없이 연결될 수 있는 후속 포인트가 Outcome/Follow-up에 남음

## Risks

- 시간 후보 계산 규칙이 명확하지 않으면 `READY` 전이만 먼저 구현되고 후보 품질이 흔들릴 수 있다.
- 장소 후보 생성은 Kakao Local API 의존이므로 네트워크 실패 시 room 상태를 `READY`로 바꾸지 않고 전체를 실패 처리한다.
- 수동 마감과 자동 마감이 서로 다른 저장 흐름을 가지면 이후 정합성이 깨질 수 있다.

## Validation

- Tests:
    - 방장이 `COLLECTING` 상태 room을 `READY`로 변경할 수 있음
    - 비방장이 호출하면 403
    - 존재하지 않는 room이면 404
    - `COLLECTING`이 아닌 room이면 409
    - `SUBMITTED` participant가 없으면 422
    - `collectOrigin=true`인 room에서 장소 후보 생성 분기가 실행됨
    - 마감 성공 시 후보 데이터 저장과 room 상태 변경이 함께 반영됨
- Manual checks:
    - 마감 후 room 상태가 `READY`로 바뀌는지 확인
    - 생성된 시간 후보/장소 후보가 DB에 저장되는지 확인
    - `collectOrigin=false`인 room에서는 장소 후보가 생성되지 않는지 확인
- Observability:
    - 실패 시 roomId, host 여부, room status, submitted participant 수, 후보 생성 단계 로그를 확인할 수 있어야 함

## Decision Log

- 2026-05-08: 수동 마감 API는 방장 전용 인증 API로 두고, 자동 마감은 후속 스케줄러 작업으로 분리한다.
- 2026-05-08: 마감 시점에는 `SUBMITTED` participant 데이터를 기준으로 시간 후보와 장소 후보를 생성한다.
- 2026-05-08: 장소 후보는 origin 기반 중간 지점을 계산한 뒤 Kakao Local API로 조회한다.
- 2026-05-08: room 상태는 후보 생성과 저장이 모두 끝난 뒤 마지막에 `READY`로 전이한다.
- 2026-05-08: 시간/장소 후보 orchestration은 우선 `RoomService` 내부에서 동기 처리한다.
- 2026-05-08: `blocked_slots`가 비어 있는 `SUBMITTED` participant는 전 시간 가능으로 해석한다.

## Outcome

- Status: active
- Follow-up:
    - 자동 마감 스케줄러 구현
    - 결과 확정 API 구현
    - 방 조회 API의 후보 데이터 반영
