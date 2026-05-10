# Participant Participation API Plan

## Summary

- Goal: 참여자가 자신의 불가능 시간과 출발지를 제출하거나 수정하는 API를 구현한다.
- Owner: Codex + nogglee
- Date: 2026-05-07

## Context

- Relevant specs:
    - 사용자 제공 "참여 정보 저장 API" 요구사항
    - `docs/specs/room-lifecycle.md`
    - `docs/specs/domain-map.md`
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/completed/room-join-api-plan.md`
- Open decisions:
    - 없음

## Scope

- In:
    - `PATCH /participants/:participantId/participation` 또는 동등한 참여 정보 저장 API
    - 회원/비회원 수정 권한 검증
    - 불가능 시간 및 출발지 저장
    - 참여 상태를 `JOINED -> SUBMITTED`로 전이
    - 성공/실패 Swagger 문서화
- Out:
    - 방 마감 API
    - 공통 가능 시간 계산
    - 결과 확정/후보 시간 계산
    - 위치 기반 후처리 최적화

## Plan

1. 식별자와 권한 기준을 확정한다.
    - path parameter는 `participantId`를 사용한다.
    - 회원은 `authUser`, 비회원은 `participant_uuid_{roomSlug}` 쿠키로 수정 권한을 확인한다.
    - verify: guest도 자신의 participant만 수정 가능하고, 타인의 participantId만 알아도 수정할 수 없다는 규칙이 계획에 명시됨
2. 입력 계약과 저장 모델을 정리한다.
    - `blockedSlots[]`와 `origin` DTO를 정의한다.
    - 요청은 날짜별 `slotIndexes[]`를 받고, 저장은 `blocked_slots`에 한 슬롯당 한 row로 펼쳐 저장한다.
    - verify: DTO, repository 저장 단위, overwrite/update 정책이 문서에 명시됨
3. 참여 가능 상태와 수정 권한을 검증한다.
    - participant 존재 여부 확인
    - 요청자가 해당 participant의 소유자인지 확인
    - room 상태가 제출 가능한 상태인지 확인
    - verify: `PARTICIPANT_NOT_FOUND`, `FORBIDDEN`, `INVALID_ROOM_STATUS` 분기가 서비스에 직접 매핑될 수 있음
4. 제출 저장 유스케이스를 구현한다.
    - 기존 participation 정보가 있으면 수정, 없으면 생성
    - participant status를 `SUBMITTED`로 갱신
    - verify: blockedSlots/origin 저장과 status 전이가 하나의 트랜잭션으로 묶임
5. 응답과 문서를 정리한다.
    - 성공 응답은 `participantStatus: SUBMITTED`
    - 400/403/404/409/500 문서화
    - verify: Swagger 예시와 실제 분기가 일치함
6. 후속 작업 연결성을 확인한다.
    - 방 조회 API에서 `mySubmission`이 이 저장 결과를 읽을 수 있는지 확인
    - 방 마감 API가 이 제출 데이터를 전제로 설계될 수 있는지 확인
    - verify: 후속 API와의 연결 포인트가 Outcome/Follow-up에 기록됨

## Risks

- guest 수정 권한은 `participantId`만으로 판별할 수 없어서 room slug 기반 cookie 검증이 추가로 필요하다.
- 수정 API와 최초 제출 API를 분리하지 않는 만큼 overwrite 정책을 명확히 두지 않으면 프론트와 충돌할 수 있다.

## Validation

- Tests:
    - 회원이 자신의 participant 정보를 저장할 수 있음
    - 비회원이 자신의 cookie 기반 participant 정보를 저장할 수 있음
    - 타인의 participantId로 요청하면 403
    - 존재하지 않는 participantId면 404
    - 제출 불가 상태의 방이면 409
    - 잘못된 blockedSlots/origin 형식이면 400
- Manual checks:
    - 저장 후 participant status가 `SUBMITTED`로 바뀌는지 확인
    - 저장 후 방 조회 응답의 `mySubmission`에 반영되는지 확인
    - guest 수정 시 cookie가 없는 경우 거부되는지 확인
- Observability:
    - 저장 실패 시 participantId, 회원/비회원 여부, room status, 권한 검증 단계 로그를 확인할 수 있어야 함

## Decision Log

- 2026-05-07: 방 참여 직후 참여 정보 저장이 방 마감보다 선행되므로, 방 마감 API 전에 이 유스케이스를 먼저 구현한다.
- 2026-05-07: path parameter는 요구사항대로 `participantId`를 사용하되, guest 권한 검증은 cookie와 함께 확인한다.
- 2026-05-08: `blockedSlots`는 선택값으로 두고, 요청은 날짜별 `slotIndexes[]`를 받아 저장 시 한 슬롯당 한 row로 펼친다.
- 2026-05-08: 출발지는 room의 `collectOrigin=true`일 때만 필수로 검증한다.

## Outcome

- Status: completed
- Follow-up:
    - 방 조회 API의 `mySubmission` 구현
    - 방 마감 API 구현
