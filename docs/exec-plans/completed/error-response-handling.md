# Error Response Handling

## Summary

- Goal: NestJS 전역 성공/실패 응답 포맷을 공통화하고, 도메인 예외 코드 체계를 도입한다.
- Owner: Eunji LEE
- Date: 2026-05-02

## Context

- Relevant specs:
    - 사용자 제공 `/auth/sync` API 스펙
- Relevant design docs:
    - [ARCHITECTURE.md](../../../ARCHITECTURE.md)
    - [docs/conventions/README.md](../../conventions/README.md)
- Open decisions:
    - 도메인별 세부 예외 클래스는 각 모듈 구현 시점에 추가한다.

## Scope

- In:
    - 성공 응답 인터셉터 추가
    - 실패 응답 글로벌 필터 추가
    - 공통 `AppException` 도입
    - 공통 `ErrorCode` enum 도입
    - auth 모듈의 400/401/500 예외를 공통 체계에 연결
- Out:
    - room / participant 도메인 예외 상세 구현
    - ValidationPipe 커스텀 exceptionFactory 적용

## Plan

1. 성공 응답을 `{ message, data }` 계약으로 고정한다.
2. 글로벌 `SuccessResponseInterceptor`로 성공 응답 포맷을 통일한다.
3. 글로벌 `HttpExceptionFilter`로 실패 응답 포맷을 통일한다.
4. `AppException`과 `ErrorCode`로 커스텀 예외 체계를 연결한다.

## Risks

- 컨트롤러가 `{ message, data }` 형식을 지키지 않으면 인터셉터에서 런타임 오류가 발생한다.
- Nest 기본 예외는 `message`가 배열일 수 있어 필터에서 최소 정규화가 필요하다.

## Validation

- Tests:
    - `pnpm typecheck`
    - `pnpm build`
- Manual checks:
    - `/auth/sync` 성공 응답이 공통 포맷으로 감싸지는지 확인
    - 잘못된 토큰 요청 시 401 응답이 공통 포맷으로 내려오는지 확인
    - 예기치 않은 예외 발생 시 500 응답이 공통 포맷으로 내려오는지 확인
- Observability:
    - 현재는 별도 에러 로깅/트레이싱 추가 전

## Decision Log

- 2026-05-02: 성공 응답은 컨트롤러가 `{ message, data }`만 반환하고, 공통 필드는 인터셉터가 채운다.
- 2026-05-02: 실패 응답은 서비스/컨트롤러가 예외만 던지고, 공통 필드는 글로벌 필터가 채운다.
- 2026-05-02: `error` 값은 `ErrorCode` enum으로 관리하고, Nest 기본 예외는 상태코드 기반 fallback만 사용한다.

## Outcome

- Status: Completed
- Follow-up:
    - room / participant 도메인 구현 시 `ROOM_NOT_FOUND`, `PARTICIPANT_NOT_FOUND` 등 세부 예외 클래스를 추가한다.
    - 필요 시 ValidationPipe 예외 메시지 포맷을 별도 규칙으로 정리한다.
