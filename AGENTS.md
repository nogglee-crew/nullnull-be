# AGENTS.md

이 저장소는 에이전트가 읽고 작업하기 쉬운 문서 구조를 우선한다.

## Start Here

1. 현재 작업 목표를 확인한다.
2. [ARCHITECTURE.md](ARCHITECTURE.md)를 읽고 시스템 경계를 파악한다.
3. 아래 `docs/` 색인에서 필요한 문서만 펼쳐 읽는다.
4. 구현 선택이 필요한 경우 요구사항 문서와 설계 문서를 먼저 확인하고, 미정 사항은 실행 계획에 남긴다.

## Source Of Truth

- 제품 요구사항과 설계 기준: `docs/specs/`
- 실행 중인 작업과 의사결정 로그: `docs/exec-plans/`
- 보안 기준: `docs/SECURITY.md`

## Working Rules

- 구현 전 요구사항과 제약을 먼저 확인한다.
- 기술 스택이 미확정이면 프레임워크 고유 패턴 대신 계층 책임과 계약을 먼저 설계한다.
- 변경 중 새 규칙이 생기면 코드만 수정하지 말고 관련 문서도 함께 갱신한다.
- 복잡한 작업은 `docs/exec-plans/active/` 아래 계획 파일을 만들고 진행한다.
- 완료된 계획은 `docs/exec-plans/completed/`로 이동한다.

## Docs Index

- [docs/README.md](docs/README.md)
- [docs/conventions.md](docs/conventions.md)
- [docs/specs/index.md](docs/specs/index.md)
- [docs/exec-plans/README.md](docs/exec-plans/README.md)
- [docs/SECURITY.md](docs/SECURITY.md)

## When Information Is Missing

- 사람의 머릿속이나 외부 채팅에만 있는 정보는 없는 것으로 취급한다.
- 문서와 코드가 충돌하면 실행 계획에 충돌 사실을 먼저 기록한 뒤 해결한다.
