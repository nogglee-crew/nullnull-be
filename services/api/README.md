# API Service

외부 요청 진입점이다.

## Responsibilities

- HTTP/WebSocket transport
- session/auth context resolution
- input validation
- application use case 호출
- response/event mapping

## Do Not Put Here

- 핵심 비즈니스 규칙
- DB 쿼리 상세
- 외부 공급자 SDK 직접 호출 로직
