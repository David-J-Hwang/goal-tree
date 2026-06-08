# Goal Tree

## 프로젝트 소개

삶에서 이룰 큰 목표를 `Goal -> Plan -> Task` 구조로 나누고, 오늘의 TODO, 내가 해낸 일, 타임라인으로 진행 상황을 관리하는 개인 목표 관리 앱 프로젝트다.

자세한 기획 메모는 [README_CODEX.md](README_CODEX.md)를 참고한다.

---

## 기술스택

```txt
Frontend/Fullstack: Next.js
Language: TypeScript
Styling: Tailwind CSS
UI Components: shadcn/ui
Database: Supabase PostgreSQL
Auth: Supabase Auth
Deployment: Vercel
Drag & Drop: dnd-kit
Date: date-fns
```

선택사항:

```txt
State: 처음에는 React state 사용, 필요하면 Zustand 검토
```

---

## 프로젝트 핵심구조

프로젝트는 로그인 기능을 포함하고, 로그인 후 첫 화면은 `/dashboard`로 구성한다.

루트 페이지(`/`)는 `/dashboard`로 리디렉션한다.

주요 페이지:

```txt
/login
/dashboard
/workspace
/whativedone
/timeline
/trash
```

### /login

- 유저가 로그인하는 페이지다.
- MVP에서는 이메일 로그인만 사용한다.
- 유저별로 Goal, Plan, Task, TODO 데이터를 분리해서 저장한다.

### /dashboard

- 로그인 후 첫 화면이다.
- 오늘의 TODO 목록을 보여준다.
- TODO 완료 처리를 할 수 있다.
- TODO를 완료하면 연결된 Task도 완료 처리한다.
- TODO 항목을 클릭하면 `/workspace`로 이동하고, 해당 Task가 선택된 상태로 열린다.
- 최근 완료한 일, 막힌 일, 이번 주 핵심 항목은 필요하면 요약 컴포넌트로 추가한다.

### /workspace

- 이 프로젝트의 핵심 페이지다.
- macOS Finder의 계층별 보기처럼 `Goal`, `Plan`, `Task`를 3단 카드 구조로 보여준다.

```txt
[Goal Cards] [Plan Cards] [Task Cards] | [Detail Panel]
```

- 처음 진입하면 Goal 카드 목록만 보인다.
- Goal 카드를 클릭하면 해당 Goal에 속한 Plan 카드들이 나타난다.
- Plan 카드를 클릭하면 해당 Plan에 속한 Task 카드들이 나타난다.
- Goal, Plan, Task 카드는 같은 섹션 안에서만 드래그 앤 드롭으로 순서를 바꿀 수 있다.
- 카드 순서가 우선순위를 나타낸다.
- 카드를 다른 섹션으로 이동하는 기능은 금지한다.
- 검색 기능은 별도 페이지가 아니라 `/workspace` 안에 통합한다.
- Detail Panel은 3단 구조와 분리해서 오른쪽에 표시한다.

### /workspace Detail Panel

선택한 카드 종류에 따라 상세 내용을 다르게 보여준다.

Goal 상세:

- 제목
- 왜 중요한지
- 성공기준
- 예정기간
- 실제 진행기간
- 상태: 시작전 / 진행중 / 완료 / 보류 / 막힘
- 진행률
- 메모

Plan 상세:

- 제목
- 연결된 Goal
- 카테고리
- 상태: 시작전 / 진행중 / 완료 / 보류 / 막힘
- 예정기간
- 실제 진행기간
- 진행률
- 메모

Task 상세:

- 제목
- 연결된 Plan
- 상태: 시작전 / 진행중 / 완료 / 보류 / 막힘
- 예정기간
- 실제 진행기간
- 오늘의 TODO 목록에 추가 / 제거
- 메모

### /whativedone

- 내가 해낸 일을 확인하는 기록 페이지다.
- 완료한 Task를 날짜별, 월별, 연별로 확인한다.
- 어떤 Goal / Plan에 기여했는지 확인할 수 있도록 만든다.

### /timeline

- 내가 한 일과 앞으로 할 일을 시간 흐름으로 보는 페이지다.
- 해낸 일 / 할 일 토글을 제공한다.
- 월간 / 주간 / 연간 보기 형태를 고려한다.
- 이틀 이상 이어지는 작업 기간을 표시할 수 있어야 한다.

### /trash

- 휴지통에 들어간 Goal, Plan, Task를 관리하는 페이지다.
- 삭제 버튼을 누르면 바로 영구 삭제하지 않고 휴지통으로 이동한다.
- 휴지통에서는 복원하거나 영구 삭제할 수 있다.
- 상위 항목이 휴지통에 있으면 하위 항목도 일반 화면에서 숨긴다.
- MVP에서는 상위 항목이 휴지통에 있는 하위 항목을 단독 복원하지 않는다.

### 앱 설정

- 별도 설정 페이지는 MVP 초반에 만들지 않는다.
- 상단 앱바에서 설정 모달을 여는 방향으로 시작한다.
- 상태 변경 시 실제 진행기간 자동입력 기능은 기본 ON으로 둔다.

---

## 프로젝트 데이터구조

### Node

`Goal`, `Plan`, `Task`는 공통 Node 구조로 관리한다.

```ts
type Node = {
  id: string;
  userId: string;

  type: "goal" | "plan" | "task";
  parentId: string | null;

  title: string;
  memo?: string | null;

  status:
    | "not_started"
    | "in_progress"
    | "blocked"
    | "done"
    | "paused";

  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;

  importanceReason?: string | null;
  successCriteriaText?: string | null;
  categoryId?: string | null;

  sortOrder: number;

  createdAt: string;
  updatedAt: string;
  trashedAt?: string | null;
};
```

사용 방식:

```txt
Goal
-> parentId: null
-> importanceReason, successCriteriaText 사용

Plan
-> parentId: Goal id
-> categoryId 사용

Task
-> parentId: Plan id
```

### PlanCategory

Plan은 유저가 직접 만든 카테고리로 분류한다.

```ts
type PlanCategory = {
  id: string;
  userId: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};
```

예시:

```txt
웹개발
공부
외부활동
콘텐츠
사업
건강
기타
```

### TodayTodo

오늘의 TODO는 Task와 연결한다.

```ts
type TodayTodo = {
  id: string;
  userId: string;
  taskId: string;
  date: string;
  sortOrder: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### UserSettings

유저별 앱 설정은 추후 설정 모달에서 관리한다.

```ts
type UserSettings = {
  userId: string;
  autoFillActualDatesOnStatusChange: boolean;
};
```

---

## 진행률 계산

- Goal 진행률: 해당 Goal에 속한 계산 대상 Task 중 완료된 Task 비율
- Plan 진행률: 해당 Plan에 속한 계산 대상 Task 중 완료된 Task 비율
- Task 진행률: MVP에서는 상태 기준으로 표시
- 분모 포함: 시작전, 진행중, 막힘, 완료
- 분모 제외: 보류, 휴지통
- 분자 포함: 완료

진행률은 직접 저장하기보다 Task 상태를 기준으로 계산한다.

---

## 날짜 / 상태 정책

- 예정기간과 실제 진행기간은 날짜 단위로 관리한다.
- 생성일, 수정일, 휴지통 이동일은 timestamp로 관리한다.
- 시작전 -> 진행중: 실제 시작일이 비어 있으면 오늘 날짜 자동입력
- 진행중 / 막힘 -> 완료: 실제 종료일을 오늘 날짜로 자동입력
- 완료 -> 진행중: 실제 종료일을 비운다.
- 오늘 TODO 완료: 연결된 Task도 완료 처리한다.
- 보류는 언젠가 다시 활성화할 항목이고, 휴지통은 삭제 예정 항목이다.

---

## 향후 개발방향

- Google 로그인 추가

---

## 개발 체크리스트

### 0. 기획 / 문서

- [x] 프로젝트 핵심 방향 정리
- [x] `Goal -> Plan -> Task` 구조 채택
- [x] `/dashboard`, `/workspace`, `/whativedone`, `/timeline`, `/trash` 페이지 구조 채택
- [x] 루트 페이지(`/`)를 `/dashboard`로 리디렉션하는 방향 채택
- [x] 로그인 기능 추가 방향 채택
- [x] MVP 로그인 provider를 이메일 로그인으로 채택
- [x] 핵심 기술스택 채택
- [x] shadcn/ui 채택
- [x] 오늘 TODO 완료 시 Task 완료 처리 채택
- [x] 휴지통 페이지와 복원 / 영구삭제 규칙 채택
- [x] 보류와 휴지통의 의미 구분 채택
- [x] 상태 변경 시 실제 날짜 자동입력 기본 ON 채택
- [x] 상단 앱바 설정 모달 방향 채택
- [x] `README_CODEX.md`에 상세 기획 정리
- [x] `README.md`를 개발 체크리스트용 문서로 정리

### 1. 프로젝트 초기 세팅

- [ ] 프로젝트 생성
- [ ] shadcn/ui 초기 설정
- [ ] 기본 shadcn/ui 컴포넌트 추가
- [ ] 기본 라우팅 구조 생성
- [ ] 공통 레이아웃 생성
- [ ] 네비게이션 구성
- [ ] 기본 스타일 시스템 구성

### 2. 인증 / 사용자 데이터

- [x] 로그인 provider 확정
- [ ] `/login` 페이지 구현
- [ ] 로그인 후 `/dashboard`로 이동
- [ ] 로그아웃 기능 구현
- [ ] 주요 데이터에 `userId` 연결
- [ ] 유저별 데이터 접근 제한 처리

### 3. 데이터 모델

- [ ] Node 모델 구현
- [ ] PlanCategory 모델 구현
- [ ] TodayTodo 모델 구현
- [ ] 상태값 구현: 시작전 / 진행중 / 막힘 / 완료 / 보류
- [ ] 예정기간 필드 구현
- [ ] 실제 진행기간 필드 구현
- [ ] 휴지통 이동 시간 필드 구현
- [ ] `sortOrder` 기반 정렬 구현
- [ ] UserSettings 모델 구현

### 4. /workspace

- [ ] Goal 카드 섹션 구현
- [ ] Plan 카드 섹션 구현
- [ ] Task 카드 섹션 구현
- [ ] Goal 클릭 시 연결된 Plan 표시
- [ ] Plan 클릭 시 연결된 Task 표시
- [ ] 선택된 카드 UI 표시
- [ ] 같은 섹션 안에서 카드 드래그 정렬 구현
- [ ] 다른 섹션으로 카드 이동 금지
- [ ] Goal 생성 / 수정 / 삭제 구현
- [ ] Plan 생성 / 수정 / 삭제 구현
- [ ] Task 생성 / 수정 / 삭제 구현
- [ ] `/workspace` 검색 기능 구현

### 5. Detail Panel

- [ ] Goal 상세패널 구현
- [ ] Plan 상세패널 구현
- [ ] Task 상세패널 구현
- [ ] Goal 진행률 표시
- [ ] Plan 진행률 표시
- [ ] Task 상태 변경 기능 구현
- [ ] Task를 오늘의 TODO에 추가 / 제거
- [ ] 메모 입력 / 수정 기능 구현

### 6. Plan 카테고리

- [ ] 기본 카테고리 표시
- [ ] 유저 직접 카테고리 추가
- [ ] 카테고리 수정 / 삭제
- [ ] Plan에 카테고리 연결
- [ ] 카테고리별 Plan 필터링

### 7. /dashboard

- [ ] 오늘의 TODO 목록 표시
- [ ] 오늘의 TODO 정렬
- [ ] 오늘의 TODO 완료 처리
- [ ] TODO 클릭 시 `/workspace`로 이동
- [ ] TODO 클릭 시 해당 Goal / Plan / Task 선택 상태 복원
- [ ] 막힌 Task 요약
- [ ] 최근 완료한 Task 요약
- [ ] 이번 주 핵심 항목 요약

### 8. /whativedone

- [ ] 완료한 Task 목록 표시
- [ ] 날짜별 완료 기록 표시
- [ ] 월별 완료 기록 표시
- [ ] 연별 완료 기록 표시
- [ ] 완료 기록에서 연결된 Goal / Plan 표시
- [ ] 완료 기록 클릭 시 `/workspace`로 이동

### 9. /timeline

- [ ] 예정된 Task 표시
- [ ] 완료된 Task 표시
- [ ] 해낸 일 / 할 일 토글
- [ ] 주간 보기
- [ ] 월간 보기
- [ ] 연간 보기
- [ ] 이틀 이상 이어지는 작업 기간 표시
- [ ] 타임라인 항목 클릭 시 `/workspace`로 이동

### 10. /trash

- [ ] 휴지통 목록 표시
- [ ] Goal / Plan / Task 휴지통 이동
- [ ] 휴지통 항목 복원
- [ ] 휴지통 항목 영구 삭제
- [ ] 상위 항목이 휴지통에 있을 때 하위 항목 숨김
- [ ] 상위 항목이 휴지통에 있는 하위 항목 단독 복원 방지

### 11. 앱 설정 모달

- [ ] 상단 앱바 설정 진입점 구현
- [ ] 설정 모달 구현
- [ ] 실제 날짜 자동입력 ON / OFF 설정

### 12. MVP 이후 보류 기능

- [ ] Reviews 페이지
- [ ] Skills 페이지
- [ ] Projects 페이지
- [ ] Actions 페이지
- [ ] Search / All Nodes 페이지
- [ ] Goal 성공기준 체크리스트
- [ ] Plan 설명 / 목적 필드
- [ ] Task 세부 체크리스트
- [ ] 마인드맵 / 그래프 시각화
- [ ] 알림
- [ ] 캘린더 연동
- [ ] 협업 기능
- [ ] 결제
