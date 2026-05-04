# Specs

이 디렉터리는 `nullnull` 백엔드의 기능 요구사항, 도메인 계약, 설계 기준을 관리한다.
구현은 프레임워크 편의보다 이 문서에 정의된 도메인 규칙과 계약을 우선한다.

## Read Guide

- 전체 도메인 객체와 핵심 정책은 [domain-map.md](domain-map.md)를 먼저 읽는다.
- 방 생성부터 종료까지의 상태 전이와 주요 쓰기/읽기 경로는 [room-lifecycle.md](room-lifecycle.md)를 따른다.
- 시간 입력, 불가 시간 처리, 공통 가능 시간 계산은 [availability.md](availability.md)를 따른다.
- 장소 후보, 위치 기반 계산, 외부 공급자 장애 처리는 [recommendation.md](recommendation.md)를 따른다.

## Source Of Truth

- 도메인 객체 이름과 관계는 [domain-map.md](domain-map.md)를 기준으로 한다.
- 방 상태와 상태 전이는 [room-lifecycle.md](room-lifecycle.md)를 기준으로 한다.
- 시간 계산 규칙은 [availability.md](availability.md)를 기준으로 한다.
- 장소 추천 규칙은 [recommendation.md](recommendation.md)를 기준으로 한다.

## Update Rules

- API 계약, 상태 전이, 계산 규칙이 바뀌면 관련 spec을 함께 갱신한다.
- 구현 중 새 도메인 규칙이 생기면 코드에만 남기지 않고 spec에 기록한다.
- 미정 결정은 구현으로 숨기지 않고 실행 계획의 `Open decisions` 또는 `Decision Log`에 남긴다.
