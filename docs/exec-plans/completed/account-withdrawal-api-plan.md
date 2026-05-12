# Account Withdrawal API Plan

## Summary

- Goal: 로그인 사용자가 자신의 계정을 탈퇴하고, 서비스 계정은 soft delete 처리하며 참여 기록은 유지한다.
- Owner: Codex + nogglee
- Date: 2026-05-09

## Context

- Relevant specs:
    - 사용자 제공 "회원 탈퇴 API" 요구사항
    - `docs/specs/domain-map.md`
    - `docs/specs/room-lifecycle.md`
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/completed/room-join-api-plan.md`
- Open decisions:
    - soft delete 이후 장기 hard delete 배치 정책을 둘지, 익명 보존 정책으로 유지할지 후속 결정 필요

## Scope

- In:
    - 회원 탈퇴 API
    - access token 기반 본인 인증
    - `users` soft delete 처리
    - `participants.user_id = null` 처리
    - 탈퇴 사용자 요청 차단 정책 반영
    - 성공/실패 Swagger 문서화
- Out:
    - 회원 데이터 물리 삭제
    - room/participant 기록 삭제
    - 회원탈퇴 이후 알림/이메일 처리
    - Supabase auth 실제 계정 삭제 여부 결정 이후의 연동 작업

## Plan

1. soft delete 저장 구조를 확정한다.
    - 현재 `users`에는 탈퇴 상태 필드가 없으므로 soft delete 필드를 추가해야 한다.
    - 요구사항 문구에 맞추면 `users.status = DELETED`가 가장 직접적이다.
    - verify: 스키마 변경 후 기존 ACTIVE 사용자와 탈퇴 사용자 구분 가능
2. 탈퇴 유스케이스 입력/권한 기준을 정리한다.
    - 요청은 인증 필수 API로 두고 `JwtAuthGuard`를 사용한다.
    - guard가 확인한 `authUser.id`를 기준으로 본인 계정만 탈퇴 처리한다.
    - verify: 인증 누락 시 `401 UNAUTHORIZED`
3. 사용자 존재 여부와 현재 상태를 검증한다.
    - `users.user_id` 기준으로 서비스 user 존재 여부 확인
    - 이미 soft delete된 사용자는 재탈퇴를 허용하지 않고 `존재하지 않는 사용자입니다.`로 처리한다.
    - verify: 미존재 사용자 `404 USER_NOT_FOUND`
4. 방장 책임이 남아 있는 room을 검증한다.
    - 사용자가 방장인 `COLLECTING` 상태 room이 하나라도 있으면 탈퇴를 막는다.
    - 프론트는 이 응답을 기반으로 “모집중인 모임이 있어 탈퇴할 수 없습니다. 먼저 종료해 주세요.” 확인창/에러를 노출한다.
    - `READY`, `CONFIRMED`, `CLOSED` room은 기록 보존을 위해 탈퇴를 막지 않는다.
    - verify: 모집중 room이 있는 host는 탈퇴 불가, 아닌 경우 계속 진행
5. 탈퇴 트랜잭션을 구현한다.
    - `users`를 soft delete 상태로 변경한다.
    - `participants.user_id = null`로 연결 해제한다.
    - 참여자 nickname은 이미 값 복사 저장되어 있으므로 표시명은 유지된다.
    - `user_consents`, host/room, meeting 기록은 보존한다.
    - verify: 탈퇴 후 participant row는 남아 있고 `user_id`만 null 처리됨
6. 탈퇴 사용자 차단 정책을 구현한다.
    - soft delete만 하면 access token 검증 자체는 통과할 수 있으므로, 이후 요청에서 `users.status === DELETED` 사용자를 차단해야 한다.
    - 구현 위치는 `JwtAuthGuard` 보강으로 확정한다.
    - verify: 탈퇴 후 보호된 API 재호출 시 더 이상 정상 동작하지 않음
7. HTTP 응답과 문서를 정리한다.
    - 성공 응답은 `data: null`
    - 성공 메시지는 `회원 탈퇴가 완료되었습니다.`
    - `404/401/409/500` 문서화
    - verify: Swagger example과 실제 응답 shape 일치

## Risks

- `users` soft delete만 하고 탈퇴 사용자 차단을 하지 않으면, 기존 JWT가 살아 있는 동안 보호 API 접근이 가능할 수 있다.
- `participants.user_id = null`만 처리하면 host인 room과의 관계는 남으므로, `COLLECTING` 상태 방장 탈퇴를 차단하지 않으면 운영 주체가 사라진 모집중 방이 남는다.
- `user_consents`와 `rooms.host_id`는 여전히 `users` row를 참조하므로 물리 삭제로 확장하기 어렵다.
- Supabase auth 계정까지 실제 삭제할지 여부가 나중에 정해지면 추가 연동 작업이 필요하다.

## Validation

- Tests:
    - 인증된 사용자가 본인 계정을 soft delete할 수 있음
    - 인증 누락 시 401
    - 존재하지 않는 사용자면 404
    - 사용자가 방장인 `COLLECTING` room이 있으면 409
    - 탈퇴 후 `participants.user_id`가 null로 변경됨
    - 탈퇴 후 participant nickname/room 기록은 유지됨
    - 탈퇴 후 보호된 API 접근이 차단됨
- Manual checks:
    - 탈퇴 전후 `users.status` 또는 soft delete 필드 값 확인
    - 탈퇴 전후 `participants.user_id` null 처리 확인
    - room/participant/meeting 기록이 삭제되지 않는지 확인
- Observability:
    - 실패 시 userId, host collecting room count, soft delete 단계, participant detach count를 로그로 확인할 수 있어야 함

## Decision Log

- 2026-05-09: 회원탈퇴는 user row 물리 삭제가 아니라 soft delete로 처리하고, participant 기록은 유지한 채 `participants.user_id`만 null 처리한다.
- 2026-05-09: participant nickname은 이미 값 복사 정책이므로 회원탈퇴 후에도 과거 참여 표시명을 유지할 수 있다.
- 2026-05-09: user/consent/host room FK가 남아 있으므로 현재 스키마에선 hard delete보다 soft delete가 맞다.
- 2026-05-09: 사용자가 방장인 `COLLECTING` 상태 room이 있으면 탈퇴를 차단하고, 먼저 방 종료를 유도한다.
- 2026-05-09: soft delete 필드는 `users.status` enum(`ACTIVE`, `DELETED`)으로 확정한다.
- 2026-05-09: 탈퇴 사용자 인증 차단은 `JwtAuthGuard`에서 `users.status === DELETED`를 검사하는 방식으로 확정한다.

## Outcome

- Status: completed
- Follow-up:
    - soft delete 이후 장기 hard delete/익명 보존 정책 결정
