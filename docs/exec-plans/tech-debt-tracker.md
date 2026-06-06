# Tech Debt Tracker

## Current Debt

- 시간 계산 규칙의 버전 전략 미정
    - 근거: `docs/specs/availability.md`는 같은 입력에 대한 재현 가능성을 요구하지만, 계산 규칙 변경 시 기존 결과를 어떻게 해석할지 아직 정의하지 않았다.
- 위치 추천 외부 공급자 추상화 미정
    - 근거: `docs/specs/recommendation.md`는 외부 공급자 장애 시 대체 응답 전략을 요구하지만, 공급자 계약과 fallback 경계가 아직 없다.
- API 에러 코드 카탈로그 미작성
    - 근거: 공통 에러 응답 체계는 도입됐지만, 도메인별 에러 코드 목록과 사용 기준은 아직 문서화되지 않았다.
- 실시간 이벤트 명세 미작성
    - 근거: `docs/specs/domain-map.md`에 REST only vs REST + WebSocket 경계가 열려 있지만, 이벤트가 필요한 경우의 계약이 아직 없다.
- Supabase/Render 환경 분리 정책 미정
    - 근거: `README.md`와 활성 실행 계획은 현재 local/dev/prod가 같은 Supabase 프로젝트를 바라본다고 기록한다.
