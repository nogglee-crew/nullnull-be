# Exec Plans

실행 계획은 복잡한 작업의 작업지시서이자 결정 로그다.

## Layout

- `active/`: 현재 진행 중인 계획
- `completed/`: 완료된 계획
- `templates/`: 새 계획 작성 템플릿
- `tech-debt-tracker.md`: 아직 처리하지 않은 부채

## Rules

- 한 PR 또는 한 기능 축마다 하나의 계획 파일을 둔다.
- 진행 중 결정 변경은 계획 파일에 남긴다.
- 구현이 끝나면 결과와 남은 리스크를 적고 `completed/`로 이동한다.
