# Room Candidates API Plan

## Summary

- Goal: 방장이 `READY` 상태의 방에서 확정할 시간 후보와 장소 후보를 조회하는 API를 구현한다.
- Owner: Codex + nogglee
- Date: 2026-05-08

## Context

- Relevant specs:
    - 사용자 제공 "약속 후보 조회 API" 요구사항
    - `docs/specs/room-lifecycle.md`
    - `docs/specs/domain-map.md`
- Relevant design docs:
    - `ARCHITECTURE.md`
    - `docs/SECURITY.md`
    - `docs/exec-plans/active/room-ready-api-plan.md`
- Open decisions:
    - room 식별자를 현재 구현 기준대로 `roomId`로 유지할지, 이후 room API 전체를 `slug`로 통일할지 확인 필요

## Scope

- In:
    - `GET /rooms/:roomId/candidates` 또는 동등한 후보 조회 API
    - access token 기반 방장 권한 검증
    - room 상태 `READY` 검증
    - 저장된 `time_options`, `place_options` 조회
    - 후보 선택 화면에 필요한 응답 shape 정리
    - 성공/실패 Swagger 문서화
- Out:
    - 후보 생성 로직 변경
    - 최종 확정 API
    - 후보 재계산 API
    - 자동 마감 스케줄러

## Plan

1. 식별자와 권한 기준을 확정한다.
    - 요청은 인증 필수 API로 두고 `JwtAuthGuard`를 사용한다.
    - path parameter는 우선 `roomId`를 사용한다.
    - 요청 사용자가 `room.hostId`와 일치하는지 검증한다.
    - verify: 비방장 호출 시 `403 FORBIDDEN`, 인증 누락 시 `401 UNAUTHORIZED`
2. 조회 가능 상태를 검증한다.
    - room 존재 여부 확인
    - room 상태가 `READY`인지 확인
    - verify: `ROOM_NOT_FOUND`, `INVALID_ROOM_STATUS` 분기가 서비스에 직접 매핑될 수 있음
3. 응답 기준을 확정한다.
    - 시간 후보는 저장된 `time_options`를 `rank ASC`로 조회한다.
    - 장소 후보는 저장된 `place_options`를 `rank ASC`로 조회한다.
    - 프론트가 `전원 가능 / n명 가능` 문구를 판단할 수 있도록 `submittedParticipantCount`와 각 시간 후보의 `availableCount`를 함께 내려준다.
    - place 후보는 카드/지도 렌더링에 필요한 `id`, `name`, `address`, `latitude`, `longitude`, `rank`를 포함한다.
    - verify: room ready 시점에 이미 계산된 rank/availableCount를 그대로 읽는 조회 API로 끝난다.
    - verify: 후보 선택 화면에 필요한 필드가 응답에서 모두 충족됨
4. 시간 후보 응답 shape를 구현한다.
    - `time_options`는 현재 `date`(`DATE`), `start_at`(`TIME`), `end_at`(`TIME`) 구조로 저장된다.
    - 응답은 `id`, `date`, `startAt`, `endAt`, `availableCount`, `durationMinutes`, `rank`를 반환한다.
    - 프론트 렌더링 혼동을 줄이기 위해 `date`, `startAt`, `endAt`는 KST 기준으로 그대로 해석 가능한 값으로 내려준다.
    - `availableRatio`는 현재 저장값이 없으므로, 필요하면 `submittedParticipantCount` 기준으로 API에서 계산하거나 프론트에서 계산할 수 있게 결정한다.
    - verify: 현재 `time_options` 저장 구조와 응답 구조가 직접 대응됨
5. 장소 후보 응답 shape를 구현한다.
    - `id`, `name`, `address`, `latitude`, `longitude`, `rank`를 반환한다.
    - `collectOrigin=false`인 room은 `placeCandidates: []`로 반환한다.
    - verify: 현재 `place_options` 저장 구조와 응답 구조가 직접 대응됨
6. 조회 쿼리와 정렬을 구현한다.
    - room 기본 정보와 함께 `SUBMITTED` participant 수를 조회한다.
    - `time_options`, `place_options`를 rank 오름차순으로 조회한다.
    - path parameter는 room ready와 동일하게 `ParseBigIntPipe`로 검증한다.
    - verify: 별도 계산 없이 저장된 후보를 그대로 읽는 조회 유스케이스로 끝남
7. 응답과 문서를 정리한다.
    - 성공 메시지는 `확정 후보 조회에 성공했습니다.`
    - 401/403/404/409/500 문서화
    - verify: Swagger 예시와 실제 응답 shape가 일치함

## Risks

- `submittedParticipantCount`를 조회 시점에 다시 계산할지, room ready 시점 기준 스냅샷처럼 다룰지 결정하지 않으면 `availableRatio` 계산 기준이 흔들릴 수 있다.
- `collectOrigin=false`인 room에서 place 후보 섹션 노출 정책이 프론트와 맞지 않으면 빈 배열 처리 후 UI가 어색할 수 있다.
- room 식별자가 이후 `slug`로 통일되면 경로와 Swagger 문서를 함께 조정해야 한다.
- `time_options`가 `date + time + time`으로 저장되므로, 응답에서 이를 어떻게 KST 기준 문자열/필드로 노출할지 미리 고정하지 않으면 프론트 포맷팅이 흔들릴 수 있다.

## Validation

- Tests:
    - 방장이 `READY` 상태 room의 후보를 조회할 수 있음
    - 비방장이 호출하면 403
    - 존재하지 않는 room이면 404
    - `READY`가 아닌 room이면 409
    - `time_options`, `place_options`가 rank 오름차순으로 반환됨
    - `collectOrigin=false`인 room이면 `placeCandidates`가 빈 배열로 반환됨
- Manual checks:
    - 후보 선택 화면이 응답 데이터만으로 렌더링되는지 확인
    - `availableCount === submittedParticipantCount`일 때 프론트에서 `전원 가능`으로 표시 가능한지 확인
    - place 후보 좌표로 지도 핀 렌더링이 가능한지 확인
- Observability:
    - 실패 시 roomId, host 여부, room status, candidate count를 로그로 확인할 수 있어야 함

## Decision Log

- 2026-05-08: 후보 조회 API는 room ready 시점에 이미 계산/저장된 `time_options`, `place_options`를 그대로 조회한다.
- 2026-05-08: 시간 후보 화면의 `전원 가능 / n명 가능` 표시는 `submittedParticipantCount`와 `availableCount`를 함께 내려 프론트에서 표현한다.
- 2026-05-08: 장소 후보는 지도 렌더링을 위해 `latitude`, `longitude`를 응답에 포함한다.
- 2026-05-08: `collectOrigin=false`인 room은 장소 후보를 생성하지 않으므로 `placeCandidates`는 빈 배열로 반환한다.
- 2026-05-09: room ready는 시간 후보를 `date`(`DATE`) + `start_at/end_at`(`TIME`)으로 저장하므로, 후보 조회는 timestamp 재조합 대신 저장된 로컬 날짜/시간 의미를 그대로 반환한다.
- 2026-05-09: 장소 후보 생성 실패는 room ready 단계에서 전체 실패 처리되므로, 후보 조회 API는 외부 API 재호출 없이 저장된 `place_options`만 읽는다.

## Outcome

- Status: active
- Follow-up:
    - 결과 확정 API 구현
    - room 식별자 `slug` 통일 여부 결정
