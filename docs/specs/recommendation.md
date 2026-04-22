# Recommendation

## Recommendation Inputs

- 공통 가능 시간 계산 결과
- 참여자 위치 정보
- 외부 장소 또는 지리 정보 공급자 응답

## Recommendation Responsibilities

- 위치 수집 시 중심점 계산
- 미팅 포인트 또는 후보 장소 계산
- 결과 순위화
- 외부 공급자 장애 시 대체 응답 전략 정의

## Stability Rules

- 추천 결과는 입력 스냅샷 기준으로 추적 가능해야 한다.
- 위치 기반 추천 규칙이 바뀌면 관련 스펙 문서를 함께 갱신한다.
- 추천 실패가 시간 결과 조회를 막아서는 안 된다.
