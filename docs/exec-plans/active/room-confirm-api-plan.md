# Room Confirm API Plan

## Summary

- Goal: 방장이 `READY` 상태의 방에서 선택한 시간 후보와 장소 후보를 기반으로 약속을 확정하는 API를 구현한다.
- Owner: Codex + nogglee
- Date: 2026-05-09

## Context

- Relevant specs:
    - 사용자 제공 "약속 확정 API" 요구사항
    - `docs/specs/room-lifecycle.md`
    - `docs/specs/domain-map.md`
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/completed/room-ready-api-plan.md`
    - `docs/exec-plans/completed/room-candidates-api-plan.md`
- Open decisions:
    - room 식별자를 현재 구현 기준대로 `roomId`로 유지할지, 이후 room API 전체를 `slug`로 통일할지 확인 필요
    - `collectOrigin=false`인 room에서 `placeCandidateId`를 필수로 받을지, nullable 선택으로 받을지 확정 필요

## Scope

- In:
    - `POST /rooms/:roomId/confirm` 또는 동등한 약속 확정 API
    - access token 기반 방장 권한 검증
    - room 상태 `READY` 검증
    - 선택한 `timeCandidateId`, `placeCandidateId`가 해당 room의 후보인지 검증
    - `meetings` row 생성
    - room 상태를 `CONFIRMED`로 전이
    - 성공/실패 Swagger 문서화
- Out:
    - 후보 재생성
    - 참여자 제출 데이터 수정
    - 확정 이후 알림/공유 링크 후속 처리
    - 자동 확정 스케줄러

## Plan

1. 식별자와 권한 기준을 확정한다.
    - 요청은 인증 필수 API로 두고 `JwtAuthGuard`를 사용한다.
    - path parameter는 우선 `roomId`를 사용하고 `ParseBigIntPipe`로 검증한다.
    - 요청 사용자가 `room.hostId`와 일치하는지 검증한다.
    - verify: 비방장 호출 시 `403 FORBIDDEN`, 인증 누락 시 `401 UNAUTHORIZED`
2. 확정 가능 상태를 검증한다.
    - room 존재 여부를 확인한다.
    - room 상태가 `READY`인지 확인한다.
    - 이미 확정된 room이나 `COLLECTING` 상태 room은 `409 INVALID_ROOM_STATUS`로 막는다.
    - verify: `ROOM_NOT_FOUND`, `INVALID_ROOM_STATUS` 분기가 서비스에 직접 매핑될 수 있음
3. 후보 선택 입력 shape를 확정한다.
    - body는 `timeCandidateId`, `placeCandidateId`를 받는다.
    - 프론트 후보 화면은 기본 선택값으로 rank 1을 잡고 보내더라도, 백엔드는 항상 id 기준으로 다시 검증한다.
    - `timeCandidateId`는 필수다.
    - `placeCandidateId`는 현재 요구사항상 필수로 두되, `collectOrigin=false` room에서도 필수로 유지할지 다시 확인한다.
    - verify: 프론트 기본 선택값이 rank 1이어도, 다른 id로 변경 후 보내는 시나리오가 동일하게 처리됨
4. 선택한 후보의 소속을 검증한다.
    - `timeCandidateId`가 해당 room의 `time_options`인지 확인한다.
    - `placeCandidateId`가 해당 room의 `place_options`인지 확인한다.
    - room 소속이 아니거나 존재하지 않는 후보면 `400 INVALID_CANDIDATE`로 처리한다.
    - verify: 다른 room 후보 id를 보내면 400이 난다.
5. meeting 생성 기준을 확정한다.
    - 현재 `time_options`는 `date`(`DATE`) + `start_at/end_at`(`TIME`) 구조이고, `meetings`는 `time_option_id`, `place_option_id` FK를 직접 가진다.
    - 따라서 확정 API는 후보의 날짜/시간/장소를 복제하지 않고, 선택된 후보 FK를 그대로 `meetings`에 저장한다.
    - room당 meeting은 하나만 존재해야 하므로 `room_id UNIQUE` 제약을 그대로 따른다.
    - verify: `meetings.room_id`는 한 번만 생성되고, 이후 재호출은 상태 검증으로 차단된다.
6. 상태 전이와 저장 순서를 정리한다.
    - 하나의 트랜잭션 안에서
        - 선택 후보 검증
        - `meetings` row 생성
        - `rooms.status = CONFIRMED`
          순서로 처리한다.
    - meeting 생성에 실패하면 room 상태를 바꾸지 않는다.
    - verify: meeting 생성 실패 시 partial update가 남지 않는다.
7. 응답과 문서를 정리한다.
    - 성공 응답은 현재 요구사항대로 `data: null`을 유지한다.
    - 성공 메시지는 `약속이 확정되었습니다.`
    - `400/401/403/404/409/500` 문서화
    - verify: Swagger example과 실제 응답 shape가 일치함

## Risks

- `collectOrigin=false`인 room은 `place_options`가 비어 있을 수 있으므로, 확정 시 `placeCandidateId`를 어떻게 다룰지 정책이 불명확하면 API 계약이 흔들릴 수 있다.
- 현재 `meetings`는 후보 FK만 저장하므로, 이후 후보를 다시 생성하거나 삭제하는 흐름이 생기면 확정 meeting 정합성 정책을 다시 정해야 한다.
- room 식별자가 이후 `slug`로 통일되면 confirm/candidates/ready 경로와 Swagger 문서를 함께 조정해야 한다.
- 프론트 기본 선택값이 rank 1이라도, 백엔드는 rank가 아니라 id 검증만 하므로 id/rank 불일치 상태를 허용할지 확인이 필요하다.

## Validation

- Tests:
    - 방장이 `READY` 상태 room에서 후보를 선택해 약속을 확정할 수 있음
    - 비방장이 호출하면 403
    - 존재하지 않는 room이면 404
    - `READY`가 아닌 room이면 409
    - 다른 room의 `timeCandidateId` 또는 `placeCandidateId`를 보내면 400
    - 성공 시 `meetings` row가 생성되고 room 상태가 `CONFIRMED`로 변경됨
    - 한 트랜잭션 안에서 meeting 생성과 상태 전이가 같이 처리됨
- Manual checks:
    - 후보 화면에서 기본 선택값 그대로 보내도 정상 확정되는지 확인
    - 다른 후보를 선택해 보냈을 때 해당 FK로 meeting이 저장되는지 확인
    - 확정 후 같은 room에 confirm 재호출 시 409가 나는지 확인
- Observability:
    - 실패 시 roomId, requesterId, room status, selected candidate id를 로그로 확인할 수 있어야 함

## Decision Log

- 2026-05-09: room ready는 시간/장소 후보를 이미 생성해 저장하므로, confirm API는 후보를 다시 계산하지 않고 선택된 후보 FK만 검증해 meeting을 생성한다.
- 2026-05-09: 프론트 기본 선택값이 rank 1이더라도, confirm API는 rank가 아니라 `timeCandidateId`, `placeCandidateId`의 room 소속 여부만 검증한다.
- 2026-05-09: `time_options`는 `date + start_at + end_at` 구조로 저장되지만, `meetings`는 해당 후보 FK를 직접 참조하므로 confirm API에서 별도 날짜/시간 조합은 만들지 않는다.

## Outcome

- Status: active
- Follow-up:
    - 확정 meeting 조회 API 구현
    - room 식별자 `slug` 통일 여부 결정
