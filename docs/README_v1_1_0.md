# Goaltree

## 현재 작업 버전

현재 루트 `README.md`는 **진행 중인 버전의 개발 체크리스트**로 사용한다.

```txt
Current: v1.1.0
Base version: v1.0.0
```

v1.0.0 완료 스냅샷은 [README_v1_0_0.md](README_v1_0_0.md)에 보관한다.

자세한 프로젝트 맥락과 구현 인수인계는 [README_CODEX.md](../README_CODEX.md)를 참고한다.

---

## 문서 관리 워크플로우

버전별 문서는 다음 역할로 관리한다.

```txt
README.md
-> 현재 작업 중인 버전의 진행판

docs/README_vX_Y_Z.md
-> 완료된 버전의 스냅샷

README_CODEX.md
-> Codex 인수인계용 현재 전체 맥락
```

작업 흐름:

1. 버전 개발을 시작하면 `README.md`에 해당 버전의 목표와 체크리스트를 작성한다.
2. 개발 중에는 `README.md`만 계속 업데이트한다.
3. 버전이 완료되면 현재 `README.md`를 `docs/README_vX_Y_Z.md`로 복사해 보관한다.
4. 다음 버전을 시작할 때 `README.md`를 새 버전 진행판으로 정리한다.
5. `README_CODEX.md`는 버전별 일지보다 현재 구조, 핵심 결정, 구현 상태 중심으로 최신화한다.

---

## v1.1.0 목표

v1.1.0의 핵심 후보는 `/workspace`에 넣기 전의 생각을 자유롭게 모으는 공간이다.

현재 v1.0.0은 `Goal -> Plan -> Task` 구조가 잘 정리된 상태에서 사용하기 좋다. v1.1.0에서는 아직 구조화되지 않은 아이디어, 할 일, 메모를 빠르게 적고, 필요할 때 `/workspace`의 Goal / Plan / Task로 전환하는 흐름을 검토한다.

---

## 라우트 후보

### 1. `/inbox`

추천 후보.

이유:

- 아직 정리되지 않은 생각의 수집함이라는 의미가 넓다.
- 아이디어, 임시 할 일, 메모를 함께 담기 좋다.
- 나중에 Brainstorm 외의 빠른 캡처 기능으로 확장하기 쉽다.

### 2. `/brainstorm`

대안 후보.

이유:

- 사용자가 새 아이디어를 떠올리고 정리하는 페이지라는 의미가 직관적이다.
- 다만 기능 범위가 아이디어 발상으로 좁게 느껴질 수 있다.

현재 판단:

```txt
Route candidate: /inbox
Page title candidate: Brainstorm 또는 Idea Inbox
```

---

## v1.1.0 기능 초안

### Inbox / Brainstorm 카드

- 자유 아이디어 카드 생성
- 카드 제목 수정
- 카드 메모 수정
- 카드 삭제 또는 보관
- 카드 상태 관리 검토
- 태그 또는 간단한 분류 검토

### Workspace 전환

- 아이디어 카드를 Goal로 전환
- 아이디어 카드를 특정 Goal 아래 Plan으로 전환
- 아이디어 카드를 특정 Plan 아래 Task로 전환
- 전환 후 원본 아이디어를 유지할지, 숨길지, 삭제할지 결정

### 데이터 구조 검토

검토 후보:

```txt
Option A: 별도 inbox_cards 테이블
Option B: nodes 테이블에 inbox 타입 추가
```

현재 판단:

```txt
별도 inbox_cards 테이블이 더 안전해 보인다.
이유: Goal / Plan / Task 트리와 독립된 자유 카드 성격이 강하고, 전환 전 데이터와 전환 후 Node 데이터를 분리하기 쉽다.
```

---

## v1.1.0 개발 체크리스트

### 0. 문서 / 버전 관리

- [x] v1.0.0 완료 상태를 `docs/README_v1_0_0.md`로 보관
- [x] 루트 `README.md`를 v1.1.0 진행판으로 전환
- [x] 문서 관리 워크플로우 정리
- [ ] v1.1.0 완료 시 `docs/README_v1_1_0.md`를 완료 스냅샷으로 갱신

### 1. 기획

- [ ] 최종 라우트명 확정: `/inbox` 또는 `/brainstorm`
- [ ] 페이지 제목 확정: `Inbox`, `Brainstorm`, `Idea Inbox` 중 선택
- [ ] 카드 필드 확정
- [ ] 전환 후 원본 아이디어 처리 방식 결정

### 2. 데이터 모델

- [ ] `inbox_cards` 테이블 사용 여부 결정
- [ ] Supabase migration 작성
- [ ] RLS 정책 작성
- [ ] TypeScript 타입 작성
- [ ] row mapper 작성

### 3. UI / UX

- [ ] `/inbox` 또는 `/brainstorm` 라우트 생성
- [ ] 상단 앱바 링크 추가 여부 결정
- [ ] 자유 카드 목록 UI 구현
- [ ] 카드 생성 UI 구현
- [ ] 카드 상세 / 편집 UI 구현
- [ ] 빈 상태 UI 구현
- [ ] 모바일 레이아웃 확인
- [ ] 다크모드 색상 확인

### 4. 기능 연결

- [ ] 자유 카드 Supabase 읽기 연결
- [ ] 자유 카드 생성 연결
- [ ] 자유 카드 수정 연결
- [ ] 자유 카드 삭제 / 보관 연결
- [ ] Goal로 전환 기능 구현
- [ ] Plan으로 전환 기능 구현
- [ ] Task로 전환 기능 구현
- [ ] 전환 후 `/workspace` 선택 상태 복원 연결

### 5. 검증

- [ ] `npm run typecheck`
- [ ] `git diff --check`
- [ ] 데스크탑 UI 확인
- [ ] 모바일 UI 확인
- [ ] Supabase RLS 동작 확인
