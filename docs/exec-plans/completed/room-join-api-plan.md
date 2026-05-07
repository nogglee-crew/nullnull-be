# Room Join API Plan

## Summary

- Goal: `GUEST` 사용자가 방에 참여할 수 있는 참여자 등록 API를 구현한다.
- Owner: Codex + nogglee
- Date: 2026-05-07

## Context

- Relevant specs:
    - `docs/specs/room-lifecycle.md`
    - `docs/specs/domain-map.md`
    - 사용자 제공 "방 참여하기 API" 요구사항
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/completed/auth-sync-backend-plan.md`
- Open decisions:
    - 없음

## Scope

- In:
    - 방 참여자 등록 API
    - 회원/비회원 분기
    - 중복 참여 방지 검증
    - 닉네임 검증
    - 최신 동의 이력 확인 및 저장
    - 비회원 `participant_uuid_{roomSlug}` HttpOnly cookie 발급
    - 성공/실패 Swagger 문서화
- Out:
    - 방 조회 응답 구조 변경
    - 참여자 제출(`JOINED -> SUBMITTED`) API
    - 회원탈퇴 시 participant nickname 보존 후처리
    - Swagger 테스트용 대체 헤더(`x-participant-uuid`) 도입

## Plan

1. 식별자와 모듈 경계를 확정한다.
    - verify: route 식별자를 `room_id`로, 구현 모듈을 `participants`로 고정
2. 입력/인증 정책을 정리한다.
    - 회원: `Authorization`이 있으면 guard 또는 optional auth helper로 `SupabaseUser` 확보
    - 비회원: 쿠키의 `participant_uuid_{roomSlug}` 기준으로 기존 participant 재입장 여부 확인
    - verify: 회원/비회원/기존 participant 케이스별 컨트롤러 입력값과 서비스 시그니처 정의
3. 참여 가능 여부를 검증한다.
    - 방 존재 여부 확인
    - 방 상태가 `COLLECTING`인지 확인
    - 회원은 `room + user_id`, 비회원은 `room + participant_uuid`로 중복 참여 여부 확인
    - verify: `ROOM_NOT_FOUND`, `INVALID_ROOM_STATUS`, `ALREADY_PARTICIPATED` 조건이 서비스 분기로 명확히 표현됨
4. 참여자 생성 유스케이스를 구현한다.
    - 회원: 최신 동의 이력 확인 후 필요 시 저장, participant 생성
    - 비회원: participant UUID 발급, 동의 정보 저장, participant 생성
    - 공통: participant nickname은 user 참조가 아니라 값 복사
    - verify: 트랜잭션으로 consent + participant 생성이 묶이고 `JOINED` 상태로 저장됨
5. HTTP 응답과 쿠키 처리를 마무리한다.
    - 비회원 참여 시 `participant_uuid_{roomSlug}` HttpOnly cookie 저장
    - 응답 DTO는 생성된 `participantId`를 반환
    - verify: 회원/비회원 성공 응답과 Set-Cookie 유무 차이를 수동 확인
6. 에러/문서/검증을 정리한다.
    - `400 INVALID_NICKNAME`
    - `404 ROOM_NOT_FOUND`
    - `409 ALREADY_PARTICIPATED`, `INVALID_ROOM_STATUS`
    - `500 INTERNAL_SERVER_ERROR`
    - verify: typecheck, build, openapi 생성, 수동 요청 시나리오 통과

## Risks

- 회원 참여의 동의 저장 정책이 auth sync/consent 흐름과 겹치므로, consent 저장 중복 기준을 먼저 맞춰야 한다.
- 비회원 쿠키는 Swagger UI에서 직접 검증이 불편하므로 curl/Postman 기준 수동 검증 절차가 필요하다.
- participant 생성 시 nickname 복사 정책을 놓치면 회원탈퇴 이후 표시명이 깨질 수 있다.

## Validation

- Tests:
    - 회원 참여 성공
    - 비회원 신규 참여 성공
    - 이미 참여 중인 회원/비회원 409
    - 방 미존재 404
    - `COLLECTING`이 아닌 방 409
    - 닉네임 길이/공백 검증 400
- Manual checks:
    - 회원 요청 시 Set-Cookie가 생기지 않는지 확인
    - 비회원 요청 시 `participant_uuid_{roomSlug}` 쿠키가 HttpOnly로 발급되는지 확인
    - participant row에 nickname이 복사 저장되는지 확인
    - participant row에 `terms_version_id`, `privacy_version_id`, `agreed_at`가 저장되는지 확인
    - participant status가 `JOINED`로 저장되는지 확인
- Observability:
    - 참여자 생성 실패 시 room identifier, 회원/비회원 여부, policy 저장 단계 로그 확인 가능해야 함

## Decision Log

- 2026-05-07: 이 유스케이스는 방 조회가 아니라 participant 생성이 핵심이므로 도메인 책임은 `participants`에 둔다.
- 2026-05-07: 방 조회 구현 방향에 맞춰 참여 API도 `room_id` path parameter 기준으로 맞춘다.
- 2026-05-07: 최신 약관 동의 이력이 없으면 403으로 막지 않고, 최신 policy 기준 `user_consents`를 저장한 뒤 participant를 생성한다.
- 2026-05-07: Swagger UI는 Cookie 헤더 수동 테스트가 불안정하므로 비회원 시나리오는 curl/Postman 기준으로 검증한다.

## Outcome

- Status: completed
- Follow-up:
    - 참여 직후 참여 정보 저장 API 설계
