# Goaltree

## 현재 작업 버전

현재 루트 `README.md`는 **지금 진행 중인 버전의 개발 체크리스트**로 사용한다.

```txt
Current: v1.1.2
Base version: v1.1.1
```

버전 스냅샷:

- v1.0.0 완료 스냅샷: [docs/README_v1_0_0.md](docs/README_v1_0_0.md)
- v1.0.1 완료 스냅샷: [docs/README_v1_0_1.md](docs/README_v1_0_1.md)
- v1.1.0 완료 스냅샷: [docs/README_v1_1_0.md](docs/README_v1_1_0.md)
- v1.1.1 완료 스냅샷: [docs/README_v1_1_1.md](docs/README_v1_1_1.md)

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

## v1.1.2 목표

v1.1.2에서는 v1.1.1 이후 남아있는 개발 후보를 다시 검토하고, 다음에 실제로 진행할 작은 개선 범위를 확정한다.

현재 v1.1.1까지는 `/dashboard`, `/workspace`, `/inbox`, `/whativedone`, `/timeline`, `/trash`의 핵심 기능과 데스크탑 / 패드 / 모바일 UI 안정화가 완료된 상태다. v1.1.2는 아래 후보 중 우선순위가 높은 항목을 골라 진행한다.

---

## v1.1.2 체크리스트

### 0. 문서 / 버전 관리

- [x] v1.1.1 완료 상태를 `docs/README_v1_1_1.md`로 보관
- [x] 루트 `README.md`를 v1.1.2 진행판으로 전환
- [ ] v1.1.2 포함 후보 확정
- [ ] v1.1.2 목표와 범위 확정

### 1. v1.1.2 포함 여부 검토

아래 항목 중 v1.1.2에 포함할 작업을 고른다.

- [ ] Google 로그인 추가
- [ ] 비밀번호 재설정 / 수정 페이지 추가
- [ ] 카테고리별 Plan 필터링
- [ ] 보류 항목을 Workspace에서 필터로 다시 볼 수 있게 하기
- [ ] Goal 성공기준 체크리스트
- [ ] Plan 설명 / 목적 필드
- [ ] Task 세부 체크리스트
- [ ] Inbox 카드 태그 추가
- [ ] Inbox 카드 간단 분류 기능
- [ ] Workspace에 있는 Task 카드를 Inbox로 이동시키는 기능
- [ ] Reviews 페이지
- [ ] Skills 페이지
- [ ] Projects 페이지 필요성 재검토
- [ ] Actions 페이지 필요성 재검토
- [ ] Search / All Nodes 전용 페이지 필요성 재검토
- [ ] 마인드맵 / 그래프 시각화
- [ ] 알림
- [ ] 캘린더 연동
- [ ] 협업 기능
- [ ] 결제

### 2. v1.1.2 포함 작업

아직 확정된 작업 없음.

### 3. 보류 / 제외

현재 사용 흐름상 필요성이 낮아 제외한다.

- [ ] 미완료 TODO 자동 이월 설정
- [ ] 어제 미완료 TODO 가져오기 같은 수동 이월 기능
