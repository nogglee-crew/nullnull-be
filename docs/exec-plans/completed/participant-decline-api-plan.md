# Participant Decline API Plan

## Summary

- Goal: 참여자가 해당 방에 대해 불참 의사를 표시하고, 기존 참여 정보를 제거하는 API를 구현한다.
- Owner: Codex + nogglee
- Date: 2026-05-08

## Context

- Relevant specs:
    - 사용자 제공 "불참 처리 API" 요구사항
    - `docs/specs/room-lifecycle.md`
    - `docs/specs/domain-map.md`
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/completed/room-join-api-plan.md`
    - `docs/exec-plans/completed/participant-participation-api-plan.md`
- Open decisions:
    - 없음

## Scope

- In:
    - `PATCH /participants/:participantId/decline` 또는 동등한 불참 처리 API
    - 회원/비회원 본인 검증
    - 방 상태 검증
    - participant status를 `DECLINED`로 전이
    - 기존 `blocked_slots`, `origin` 삭제
    - 성공/실패 Swagger 문서화
- Out:
    - 방 조회 응답 변경
    - 후보 시간 계산 로직
    - 방 마감/확정 로직

## Plan

1. 식별자와 권한 기준을 확정한다.
    - path parameter는 `participantId`를 사용한다.
    - 회원은 `authUser`, 비회원은 `participant_uuid_{roomSlug}` 쿠키로 본인 여부를 확인한다.
    - verify: 타인의 participantId만 알아도 불참 처리할 수 없다는 규칙이 계획에 명시됨
2. 조회와 상태 검증 흐름을 정리한다.
    - `participantId`로 participant를 조회한다.
    - participant가 속한 room 상태가 `COLLECTING`인지 확인한다.
    - verify: `PARTICIPANT_NOT_FOUND`, `INVALID_ROOM_STATUS` 분기가 서비스에 직접 매핑될 수 있음
3. 불참 처리 저장 모델을 확정한다.
    - participant status를 `DECLINED`로 변경한다.
    - 후보 계산 영향 제거를 위해 `blocked_slots`, `origin`을 함께 삭제한다.
    - verify: 상태 변경과 참여 정보 삭제가 하나의 트랜잭션으로 묶임
4. 권한 실패와 인증 실패를 구분한다.
    - 토큰이 유효하지만 다른 사람 participant면 `403 FORBIDDEN`
    - guest 쿠키가 없거나 본인 participant와 맞지 않으면 `403 FORBIDDEN`
    - verify: guest 허용 API 기준에 맞춰 권한 실패가 `403`으로 일관되게 정리됨
5. 응답과 문서를 정리한다.
    - 성공 응답은 `participantStatus: DECLINED`
    - 401/403/404/409/500 문서화
    - verify: Swagger 예시와 실제 분기가 일치함
6. 후속 작업 연결성을 확인한다.
    - 방 조회 API에서 `DECLINED` 상태와 삭제된 `mySubmission`을 어떻게 반영할지 확인한다.
    - 방 마감 API가 `DECLINED` 참여자를 후보 계산에서 제외할 수 있는지 확인한다.
    - verify: 후속 API와의 연결 포인트가 Outcome/Follow-up에 기록됨

## Risks

- guest 권한 검증은 `participantId`만으로 판별할 수 없어서 room slug 기반 cookie 검증이 추가로 필요하다.
- 불참 처리 시 `blocked_slots`, `origin` 삭제를 누락하면 후보 계산에 잘못 반영될 수 있다.
- 인증 없음과 권한 없음의 기준을 명확히 정하지 않으면 401/403 응답이 흔들릴 수 있다.

## Validation

- Tests:
    - 회원이 자신의 participant를 `DECLINED`로 변경할 수 있음
    - 비회원이 자신의 cookie 기반 participant를 `DECLINED`로 변경할 수 있음
    - 타인의 participantId로 요청하면 403
    - 인증/쿠키 모두 없을 때 정의된 실패 코드가 반환됨
    - 존재하지 않는 participantId면 404
    - 불참 처리 불가 상태의 방이면 409
    - 불참 처리 후 `blocked_slots`, `origin`이 삭제됨
- Manual checks:
    - 불참 처리 후 participant status가 `DECLINED`로 바뀌는지 확인
    - 불참 처리 후 방 조회 응답에서 제출 정보가 제거되는지 확인
    - guest 불참 처리 시 cookie가 없으면 거부되는지 확인
- Observability:
    - 실패 시 participantId, 회원/비회원 여부, room status, 권한 검증 단계 로그를 확인할 수 있어야 함

## Decision Log

- 2026-05-08: 불참 처리 API는 participants 도메인 안에서 구현하고, path parameter는 `participantId`를 유지한다.
- 2026-05-08: 불참 처리 시 후보 계산 영향을 없애기 위해 `blocked_slots`, `origin`을 함께 삭제한다.
- 2026-05-08: 불참 처리는 room 상태가 `COLLECTING`일 때만 허용한다.
- 2026-05-08: guest도 허용하는 API이므로 인증 토큰과 cookie가 모두 없거나 소유권 검증에 실패하면 `403 FORBIDDEN`으로 처리한다.

## Outcome

- Status: active
- Follow-up:
    - 방 조회 API의 `DECLINED` 상태 반영
    - 방 마감 API 구현
