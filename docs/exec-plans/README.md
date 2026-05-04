# Exec Plans

실행 계획은 복잡한 작업의 작업지시서이자 결정 로그다.
요구사항, 설계 판단, 구현 범위, 검증 결과가 한 작업 안에서 추적되도록 유지한다.

## Layout

- `active/`: 현재 진행 중인 계획
- `completed/`: 완료된 계획
- `templates/`: 새 계획 작성 템플릿
- `tech-debt-tracker.md`: 아직 처리하지 않은 부채

## When To Write

- 기능 축이 하나 이상 생기거나 한 PR로 추적할 작업이면 계획을 만든다.
- 요구사항, 설계, 보안 기준 중 하나라도 선택이 필요한 작업이면 계획을 만든다.
- 단순 문구 수정, 오타 수정, 작은 설정 변경은 계획 없이 진행할 수 있다.

## Rules

- 한 PR 또는 한 기능 축마다 하나의 계획 파일을 둔다.
- 복잡한 작업은 `docs/exec-plans/active/` 아래 계획 파일을 만들고 진행한다.
- 새 계획은 `templates/backend-feature-plan.md`를 복사해 시작한다.
- 관련 spec, 설계 문서, 보안 문서를 `Context`에 링크한다.
- 구현 범위는 `Scope`의 In/Out에 명시한다.
- 진행 중 결정 변경은 `Decision Log`에 날짜와 함께 남긴다.
- 검증한 명령과 수동 확인 결과는 `Validation`에 기록한다.
- 완료 시 `Outcome`에 결과와 후속 작업을 적고 `docs/exec-plans/completed/`로 이동한다.
