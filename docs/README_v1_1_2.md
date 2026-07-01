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
- v1.1.2 완료 스냅샷: [docs/README_v1_1_2.md](docs/README_v1_1_2.md)

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

v1.1.2에서는 날짜 / 시간 기준을 안정화하고, `/timeline`과 `/whativedone`에서 완료 기록과 기간 정보가 더 명확하게 읽히도록 개선한다.

현재 v1.1.1까지는 `/dashboard`, `/workspace`, `/inbox`, `/whativedone`, `/timeline`, `/trash`의 핵심 기능과 데스크탑 / 패드 / 모바일 UI 안정화가 완료된 상태다. v1.1.2는 기록 조회 화면의 계산 기준과 표시 방식을 다듬는 마이너 업데이트로 진행한다.

---

## v1.1.2 체크리스트

### 0. 문서 / 버전 관리

- [x] v1.1.1 완료 상태를 `docs/README_v1_1_1.md`로 보관
- [x] 루트 `README.md`를 v1.1.2 진행판으로 전환
- [x] v1.1.2 목표와 범위 확정
- [x] v1.1.2 완료 내용을 `docs/README_v1_1_2.md`로 보관
- [x] `README_CODEX.md`에 v1.1.2 변경 내용 반영

### 1. 날짜 / 시간 기준 안정화

- [x] 서버 실행 시간대에 따라 오늘 날짜가 어긋나지 않도록 앱 날짜 계산 기준 정리
- [x] `/dashboard`의 오늘 날짜와 Daily TODO 조회 날짜가 한국 기준 날짜로 안정적으로 표시되도록 수정
- [x] 날짜 문자열을 다룰 때 UTC 변환으로 하루가 밀리지 않도록 로컬 날짜 유틸 사용

### 2. `/timeline` 표시 방식 개선

- [x] 날짜 범위 정보를 progress bar 대신 텍스트로 표시
- [x] 날짜 범위 텍스트를 `2026.06.10 - 2026.06.17, 8 days` 형식으로 표시
- [x] 2일 이상 이어지는 카드도 별도 하이라이트 없이 일반 카드 스타일로 표시
- [x] `Done` 탭의 완료 카드에서 progress bar 제거
- [x] `Upcoming` 탭 카드에는 진행률 progress bar 표시
- [x] Goal / Plan / Task 카드 모두 동일한 기간 표시 규칙 적용

### 3. `/whativedone` 집계 기준 개선

- [x] `Completion Log`의 `Day / Week / Month / Year` 선택 기준으로 완료 Task 목록 필터링
- [x] `Goal Contribution`을 현재 선택된 기간의 완료 Task 기준으로 집계
- [x] `Plan Contribution`을 현재 선택된 기간의 완료 Task 기준으로 집계
- [x] 전체 기간 기준 Contribution 때문에 현재 탭과 집계 내용이 어긋나는 문제 수정

### 4. v1.1.2 이후 후보

v1.1.2에서는 제외하고 이후 업데이트에서 다시 검토한다.

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
- [ ] 미완료 TODO 자동 이월 설정
- [ ] 어제 미완료 TODO 가져오기 같은 수동 이월 기능
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
