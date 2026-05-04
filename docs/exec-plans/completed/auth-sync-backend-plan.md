# Auth Sync Backend Plan

## Summary

- Goal: Supabase access token을 검증하고 서비스 사용자/참여자 이력을 동기화하는 `/auth/sync` API를 구현한다.
- Owner: Eunji LEE
- Date: 2026-05-02

## Context

- Relevant specs:
    - 사용자 제공 `/auth/sync` API 스펙
    - [docs/specs/domain-map.md](../../specs/domain-map.md)
    - [docs/specs/room-lifecycle.md](../../specs/room-lifecycle.md)
- Relevant design docs:
    - [ARCHITECTURE.md](../../../ARCHITECTURE.md)
    - [docs/SECURITY.md](../../SECURITY.md)
- Open decisions:
    - 현재 local/dev/prod가 같은 Supabase 프로젝트를 사용하므로 migration 자동 반영은 하지 않는다.
    - Supabase 토큰 검증은 서버 신뢰도가 중요한 경로라 `auth.getUser(token)`을 사용한다.

## Scope

- In:
    - `/auth/sync` 엔드포인트 구현
    - `/auth/consent` 엔드포인트 구현
    - Supabase access token 검증
    - 서비스 사용자 조회/생성
    - 최신 약관/개인정보처리방침 동의 여부 계산
    - `participant_uuid_*` 쿠키 기반 participant 연결
- Out:
    - 소셜 로그인 시작/콜백 라우트
    - 약관 동의 저장 API
    - RLS 정책 설계

## Plan

1. Auth 모듈, 컨트롤러, 서비스 골격을 추가한다.
2. Supabase 토큰 검증과 사용자 upsert 로직을 구현한다.
3. 최신 약관 동의 여부 계산과 participant 연결 로직을 트랜잭션으로 묶는다.
4. 동의 버튼 클릭 시 최신 약관 버전을 기준으로 `user_consents`를 저장하는 `/auth/consent`를 구현한다.
5. 응답 포맷을 스펙에 맞게 정리하고 타입체크/빌드로 검증한다.

## Risks

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`가 누락되면 런타임에서 토큰 검증이 실패한다.
- 현재 shared DB에서는 participant 연결 테스트가 실제 데이터에 영향을 줄 수 있다.

## Validation

- Tests:
    - `pnpm typecheck`
    - `pnpm build`
- Manual checks:
    - 유효한 access token으로 `/auth/sync` 200 응답 확인
    - 잘못된 token으로 401 응답 확인
    - `participant_uuid_*` 쿠키 전달 시 `user_id IS NULL` participant만 연결되는지 확인
    - `/auth/consent` 호출 시 최신 약관 버전 기준 `user_consents`가 생성되는지 확인

## Decision Log

- 2026-05-02: 토큰 검증은 Supabase 공식 문서 기준 `auth.getUser(token)`으로 시작한다. `getClaims()`는 빠를 수 있지만 현재는 신뢰 가능한 서버 검증과 단순 구현이 우선이다.
- 2026-05-02: API 응답 포맷은 컨트롤러에서 직접 조립하지 않고, 성공 응답은 글로벌 interceptor, 실패 응답은 글로벌 exception filter로 통일한다.

## Outcome

- Status: Completed
- Follow-up:
    - production Supabase/Render 분리 시 auth redirect URI와 환경변수 정책을 다시 정리한다.
