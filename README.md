# Goaltree

## 현재 작업 버전

현재 루트 `README.md`는 **지금 진행 중인 버전의 개발 체크리스트**로 사용한다.

```txt
Current: v1.0.1 patch
Base version: v1.0.0
Next planned version: v1.1.0
```

버전 스냅샷:

- v1.0.0 완료 스냅샷: [docs/README_v1_0_0.md](docs/README_v1_0_0.md)
- v1.1.0 계획 스냅샷: [docs/README_v1_1_0.md](docs/README_v1_1_0.md)

자세한 프로젝트 맥락과 구현 인수인계는 [README_CODEX.md](README_CODEX.md)를 참고한다.

---

## 문서 관리 워크플로우

버전별 문서는 다음 역할로 관리한다.

```txt
README.md
-> 현재 작업 중인 버전의 진행판

docs/README_vX_Y_Z.md
-> 완료된 버전 또는 보관할 계획의 스냅샷

README_CODEX.md
-> Codex 인수인계용 현재 전체 맥락
```

작업 흐름:

1. 현재 작업할 버전의 목표와 체크리스트를 `README.md`에 작성한다.
2. 개발 중에는 `README.md`만 계속 업데이트한다.
3. 버전이 완료되면 현재 `README.md`를 `docs/README_vX_Y_Z.md`로 복사해 보관한다.
4. 다음 버전을 시작할 때 `README.md`를 다음 버전 진행판으로 정리한다.
5. `README_CODEX.md`는 버전별 일지보다 현재 구조, 핵심 결정, 구현 상태 중심으로 최신화한다.

---

## v1.0.1 패치 목표

v1.0.1은 v1.0.0의 안정화 패치 버전이다.

범위:

- v1.0.0 테스트 중 발견한 버그 수정
- 작은 UI/UX 개선
- 문구 / 레이아웃 정리
- 기존 기능 안정화

범위 밖:

- `/brainstorm` 새 기능 구현
- 새 데이터 모델의 큰 변경
- v1.1.0 기능 개발

v1.1.0의 `/brainstorm` 계획은 [docs/README_v1_1_0.md](docs/README_v1_1_0.md)에 보관한다.

---

## v1.0.1 패치 항목

테스트하면서 발견한 패치 항목을 이곳에 추가한다.

### 버그

- [ ] 패치할 버그 항목 추가

### UI / UX

- [ ] 개선할 UI / UX 항목 추가

### 문서

- [x] `docs/README_v1_0.md`를 `docs/README_v1_0_0.md`로 rename
- [x] v1.1.0 계획을 `docs/README_v1_1_0.md`로 보관
- [x] 루트 `README.md`를 v1.0.1 패치 작업판으로 전환
- [x] `README_CODEX.md` 문서 관리 워크플로우 업데이트

---

## v1.0.1 개발 체크리스트

### 0. 패치 준비

- [x] v1.0.0 완료 스냅샷 경로 정리
- [x] v1.1.0 계획 스냅샷 보관
- [x] v1.0.1 패치 작업판 생성
- [ ] 패치 대상 목록 확정

### 1. 패치 구현

- [ ] 버그 수정
- [ ] UI / UX 개선
- [ ] 문구 / 문서 정리

### 2. 검증

- [ ] `npm run typecheck`
- [ ] `git diff --check`
- [ ] 데스크탑 UI 확인
- [ ] 모바일 UI 확인
- [ ] 주요 플로우 수동 테스트

### 3. 패치 완료 후

- [ ] `README.md`를 `docs/README_v1_0_1.md`로 복사
- [ ] `README.md`를 v1.1.0 진행판으로 전환
- [ ] 필요하면 `README_CODEX.md` 현재 구현 상태 업데이트

---

## 다음 버전: v1.1.0

v1.1.0에서는 `/brainstorm` 페이지를 추가하는 방향을 검토한다.

핵심 아이디어:

- 트리구조에 넣기 전 자유 카드 작성
- 괜찮은 카드를 `/workspace`의 Goal / Plan / Task로 전환
- 구조화되지 않은 생각을 빠르게 보관하고 나중에 정리

v1.1.0 계획 상세는 [docs/README_v1_1_0.md](docs/README_v1_1_0.md)를 참고한다.
