# Goaltree - Codex Context

이 문서는 새로운 Codex 세션이 이 저장소를 처음 읽어도 프로젝트의 목적, 결정된 설계, 페이지 구조, 데이터 모델, MVP 범위를 바로 이해할 수 있도록 작성한 인수인계 문서다.

개발 진행 체크리스트와 완료 여부는 [README.md](README.md)를 기준으로 관리한다. 이 문서는 상세 기획과 구현 판단의 근거를 보존하는 용도다.

---

## 1. 프로젝트 요약

Goaltree는 개인의 큰 목표를 실행 가능한 계획과 행동으로 쪼개고, 오늘 할 일과 완료 기록, 타임라인으로 관리하는 목표 관리 웹 앱이다.

핵심 흐름:

```txt
Goal을 정한다
-> Goal을 이루기 위한 Plan을 만든다
-> Plan을 실행 가능한 Task로 나눈다
-> 오늘 할 Task를 Dashboard에서 처리한다
-> 완료한 일은 What I've Done과 Timeline에서 확인한다
```

이 프로젝트는 단순한 TODO 앱이 아니다. 큰 목표, 세부 계획, 실제 행동, 실행 기록을 하나의 구조로 연결하는 개인 실행 관리 도구를 목표로 한다.

---

## 2. 핵심 제품 원칙

### 2.1 앱의 중심은 `/workspace`

이 앱의 핵심 화면은 `/workspace`다.

`/workspace`는 macOS Finder의 계층별 보기처럼 동작한다.

```txt
[Goal Cards] [Plan Cards] [Task Cards] | [Detail Panel]
```

사용자는 왼쪽에서 큰 목표를 고르고, 가운데에서 해당 목표의 계획을 고르고, 오른쪽에서 실제 행동을 관리한다.

### 2.2 페이지를 많이 만들기보다 핵심 화면에 통합한다

초기에는 페이지를 많이 나누지 않는다.

채택된 방향:

```txt
Actions 페이지
-> 만들지 않는다. /workspace의 Task 상태와 진행률로 대체한다.

Projects 페이지
-> 만들지 않는다. 프로젝트성 항목은 Plan으로 관리한다.

Search / All Nodes 페이지
-> 만들지 않는다. 검색은 /workspace에 통합한다.

Reviews / Skills 페이지
-> MVP 이후 필요할 때 추가한다.
```

### 2.3 Goal / Plan / Task만 사용자에게 노출한다

초기 기획에는 하위목표, 프로젝트, 전략, 행동계획, 기술, 회고 등이 있었지만 MVP에서는 너무 복잡하다고 판단했다.

최종 MVP 구조는 다음 세 타입이다.

```txt
Goal
-> 큰 목표

Plan
-> Goal을 이루기 위한 세부 계획, 프로젝트성 항목, 학습 계획, 외부활동

Task
-> Plan을 실행하기 위한 실제 행동
```

---

## 3. 용어 정의

### Goal

Goal은 가장 큰 단위의 목표다.

예시:

```txt
경제적 자유
건강한 몸 만들기
개발자로 성장하기
```

Goal에는 “왜 중요한지”, “성공기준”, “기간”, “진행률” 같은 정보가 붙는다.

### Plan

Plan은 Goal을 이루기 위한 세부 목표나 실행 계획이다.

초기에는 하위목표, 프로젝트, 전략을 따로 나눌지 고민했지만, 사용자 입장에서는 구분이 애매할 수 있어 Plan 하나로 통합했다.

예시:

```txt
수익형 웹서비스 만들기
목표관리 앱 MVP 만들기
Next.js 공부하기
사용자 피드백 받기
```

Plan은 여러 단계로 중첩하지 않는다. 더 작게 나눌 필요가 있으면 Task를 여러 개 만든다.

### Task

Task는 실제로 실행 가능한 행동이다.

예시:

```txt
DB 구조 설계하기
Goal 카드 UI 만들기
오늘 TODO 컴포넌트 만들기
1시간 유산소 운동하기
```

Task는 오늘 TODO에 추가할 수 있고, 완료되면 `/whativedone`과 `/timeline`에서 기록으로 확인할 수 있다.

---

## 4. 확정된 페이지 구조

MVP에 포함하는 페이지:

```txt
/login
/dashboard
/workspace
/whativedone
/timeline
/trash
```

로그인 후 첫 화면은 `/dashboard`다.

루트 페이지(`/`)는 `/dashboard`로 리디렉션한다.

---

## 5. 기술스택

채택된 핵심 기술스택:

```txt
Frontend/Fullstack: Next.js
Language: TypeScript
Styling: Tailwind CSS
UI Components: shadcn/ui
Icons: Heroicons
Database: Supabase PostgreSQL
Auth: Supabase Auth
Deployment: Vercel
Drag & Drop: dnd-kit
Date: date-fns
```

상태 관리는 처음에는 React 기본 state로 시작하고, 전역 상태가 복잡해지면 Zustand를 검토한다.

Supabase 프로젝트 메모:

```txt
Supabase account: yelcrys4610@naver.com
Project name: goal-tree
Recommended region if the primary user is in Korea/Asia: Northeast Asia (Seoul)
```

주의:

```txt
Supabase account email은 프로젝트 운영 메모로 남긴다.
Database password, service role key, anon key 같은 secret은 README에 기록하지 않는다.
환경변수는 .env.local에만 저장한다.
```

현재 사용하는 Supabase 공개 환경변수:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### 5.1 shadcn/ui

`shadcn/ui`는 UI 컴포넌트 기반을 빠르게 만들기 위해 채택했다.

사용 예상 지점:

```txt
Button
Card
Dialog
Sheet
Select
Tooltip
Progress
Tabs
Calendar / Date Picker
Dropdown Menu
```

채택 이유:

```txt
Next.js와 Tailwind CSS 조합에 잘 맞는다.
Material UI보다 프로젝트 디자인을 직접 조정하기 쉽다.
컴포넌트 코드가 프로젝트 안에 들어와서 수정하기 쉽다.
```

dnd-kit과 함께 쓸 때 주의:

```txt
shadcn Card를 드래그 가능한 카드 UI로 사용할 수 있다.
단, 카드 전체를 드래그 영역으로 쓰면 카드 클릭 / 버튼 클릭 / 메뉴 클릭과 충돌할 수 있다.
따라서 카드 내부에 별도 drag handle을 두고, 그 핸들에만 dnd-kit listeners를 연결하는 방식을 권장한다.
```

### 5.2 dnd-kit

`dnd-kit`은 `/workspace`의 카드 정렬을 구현하기 위해 채택했다.

사용 목적:

```txt
Goal 카드 순서 변경
Plan 카드 순서 변경
Task 카드 순서 변경
```

주의:

```txt
dnd-kit은 드래그 UI를 도와주는 라이브러리다.
드래그 후 sortOrder를 어떻게 바꿀지는 앱 코드에서 직접 처리해야 한다.
컬럼 간 이동은 금지하고, 같은 섹션 안에서만 정렬을 허용한다.
```

### 5.3 date-fns

`date-fns`는 날짜 계산과 표시를 위해 채택했다.

사용 예상 지점:

```txt
오늘 날짜 계산
예정기간 / 실제 진행기간 표시
/whativedone의 날짜별 / 월별 / 연별 그룹화
/timeline의 기간 표시
```

### 5.4 Heroicons

Heroicons는 상단 앱바의 설정 버튼처럼 명확한 UI 아이콘이 필요한 곳에 사용한다.

현재 구현된 사용처:

```txt
상단 앱바 설정 버튼
설정 모달 내부 light / dark theme 버튼
```

lucide-react도 기존 `/workspace` mock UI에서 일부 사용 중이다. 새 아이콘은 사용 목적에 따라 정하되, 사용자가 Heroicons를 명시한 공통 앱 UI에는 Heroicons를 우선 사용한다.

---

## 6. `/login`

로그인 페이지다.

목적:

```txt
사용자별 데이터 분리
개인 목표와 실행 기록 보호
로그인 후 /dashboard로 이동
```

구현 방향:

```txt
Auth는 Supabase Auth를 사용한다.
MVP에서는 이메일 로그인만 사용한다.
Google 로그인은 향후 개발방향으로 남긴다.
비밀번호 재설정 / 수정은 MVP 로그인 화면에서 제외하고 v2에서 별도 페이지로 관리한다.
모든 주요 데이터에는 userId를 둔다.
```

현재 구현:

```txt
@supabase/ssr 기반 browser / server client helper를 추가했다.
Next.js 16의 proxy.ts에서 Supabase 세션을 갱신하고 라우트를 보호한다.
/login은 실제 Supabase 이메일 로그인 / 회원가입 submit을 호출한다.
로그인 또는 회원가입 성공 후 /dashboard로 이동한다.
로그인한 사용자가 /login에 접근하면 /dashboard로 이동한다.
로그인하지 않은 사용자가 주요 페이지에 접근하면 /login으로 이동한다.
상단 앱바의 Sign out 버튼은 Supabase signOut 후 /login으로 이동한다.
```

---

## 7. `/dashboard`

로그인 후 처음 보이는 화면이다.

Dashboard는 깊게 편집하는 페이지가 아니라, 오늘 무엇을 해야 하는지 빠르게 확인하는 입구다.

핵심 기능:

```txt
오늘의 TODO 목록 보기
오늘의 TODO 완료 처리
오늘의 TODO 정렬
TODO 클릭 시 /workspace로 이동
선택된 Task의 Goal / Plan 맥락 복원
막힌 Task 요약
최근 완료한 Task 요약
이번 주 핵심 항목 요약
```

중요한 UX:

```txt
Dashboard에서 TODO를 클릭한다
-> /workspace로 이동한다
-> 해당 Task가 선택된다
-> 관련 Plan과 Goal도 함께 선택된 상태로 보인다
```

---

## 8. `/workspace`

이 프로젝트의 핵심 작업 화면이다.

### 8.1 기본 구조

```txt
[Goal Cards] [Plan Cards] [Task Cards] | [Detail Panel]
```

처음 진입:

```txt
Goal 카드 목록만 보인다.
Plan 영역은 Goal 선택 전 상태를 보여준다.
Task 영역은 Plan 선택 전 상태를 보여준다.
```

Goal 클릭:

```txt
선택한 Goal에 속한 Plan 카드 목록을 표시한다.
```

Plan 클릭:

```txt
선택한 Plan에 속한 Task 카드 목록을 표시한다.
```

Goal / Plan / Task 클릭:

```txt
오른쪽 Detail Panel에 해당 항목의 상세 정보를 표시한다.
```

### 8.2 Finder식 계층 탐색

`/workspace`는 macOS Finder의 계층별 보기와 비슷한 탐색 경험을 제공한다.

```txt
Goal을 선택해야 Plan이 의미를 가진다.
Plan을 선택해야 Task가 의미를 가진다.
Task는 최종 실행 단위다.
```

예시:

```txt
Goal: 경제적 자유
-> Plan: 목표관리 앱 MVP 만들기
-> Task: DB 구조 설계하기
```

### 8.3 카드 정렬 규칙

Goal, Plan, Task는 모두 카드로 관리한다.

모든 카드 섹션은 Trello처럼 드래그 앤 드롭으로 순서를 바꿀 수 있다.

단, 드래그는 같은 섹션 안에서만 허용한다.

허용:

```txt
Goal 카드끼리 정렬
Plan 카드끼리 정렬
Task 카드끼리 정렬
```

금지:

```txt
Goal -> Plan 이동
Plan -> Task 이동
Task -> Plan 이동
Task -> Goal 이동
```

이유:

```txt
Trello의 컬럼은 상태를 의미하지만, 이 앱의 컬럼은 계층을 의미한다.
따라서 컬럼 간 이동은 구조를 흐리게 만든다.
```

카드 순서는 우선순위를 나타낸다.

```txt
Goal 순서
-> 전체 Goal 우선순위

Plan 순서
-> 선택한 Goal 안에서 Plan 우선순위

Task 순서
-> 선택한 Plan 안에서 Task 우선순위
```

### 8.4 검색

별도의 검색 페이지는 만들지 않는다.

검색은 `/workspace` 안에 통합한다.

검색 결과를 클릭하면:

```txt
해당 Node를 선택한다.
필요하면 연결된 Goal / Plan 맥락도 함께 선택한다.
Detail Panel에 상세 정보를 표시한다.
```

---

## 9. Detail Panel

Detail Panel은 `/workspace`의 3단 구조와 분리해서 오른쪽에 표시한다.

목적:

```txt
카드 목록은 가볍게 유지한다.
깊은 편집은 Detail Panel에서 처리한다.
```

### 9.1 Goal 상세

Goal 상세패널 필드:

```txt
제목
왜 중요한지
성공기준
예정기간
실제 진행기간
상태: 시작전 / 진행중 / 완료 / 보류 / 막힘
진행률
메모
```

성공기준은 MVP에서는 텍스트로 관리한다.

나중에 필요하면 체크리스트로 확장할 수 있다.

### 9.2 Plan 상세

Plan 상세패널 필드:

```txt
제목
연결된 Goal
카테고리
상태: 시작전 / 진행중 / 완료 / 보류 / 막힘
예정기간
실제 진행기간
진행률
메모
```

Plan의 설명 / 목적 필드는 MVP에서는 제외한다.

필요하면 나중에 추가할 수 있다.

### 9.3 Task 상세

Task 상세패널 필드:

```txt
제목
연결된 Plan
상태: 시작전 / 진행중 / 완료 / 보류 / 막힘
예정기간
실제 진행기간
오늘의 TODO 목록에 추가 / 제거
메모
```

Task 세부 체크리스트는 MVP에서는 제외한다.

작업을 더 잘게 쪼개야 할 경우, 체크리스트를 만들지 않고 Task를 여러 개 만드는 방향으로 시작한다.

---

## 10. Plan 카테고리

Plan은 사용자 정의 카테고리로 분류한다.

초기에는 하위목표 / 프로젝트 / 전략 같은 개념적 분류를 고려했지만, 사용자가 실제 활동 유형으로 분류하는 편이 더 직관적이라고 판단했다.

신규 유저에게는 기본 카테고리를 먼저 생성한다. 이후 유저가 직접 카테고리를 추가, 수정, 삭제할 수 있게 만든다.

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

요구사항:

```txt
신규 유저 기본 카테고리 자동 생성
유저가 카테고리를 직접 추가할 수 있어야 한다.
유저가 카테고리를 수정 / 삭제할 수 있어야 한다.
카테고리 이름과 색상을 가질 수 있다.
Plan에 카테고리를 연결할 수 있어야 한다.
카테고리별 Plan 필터링은 있으면 좋다.
```

---

## 11. `/whativedone`

내가 해낸 일을 확인하는 기록 페이지다.

페이지 이름은 우선 `/whativedone`으로 결정했다. 더 좋은 이름이 떠오르면 개발 중 바꿀 수 있다.

역할:

```txt
완료한 Task를 날짜별로 확인
완료한 Task를 월별로 확인
완료한 Task를 연별로 확인
어떤 Goal / Plan에 기여했는지 확인
```

이 페이지는 회고 페이지가 아니다. 회고보다 “완료 기록”과 “내가 해낸 일”에 초점을 둔다.

항목 클릭 시:

```txt
/workspace로 이동
해당 Task 선택
연결된 Plan / Goal 복원
```

---

## 12. `/timeline`

내가 한 일과 앞으로 할 일을 시간 흐름으로 보는 페이지다.

역할:

```txt
앞으로 할 일 보기
이미 해낸 일 보기
해낸 일 / 할 일 토글
주간 / 월간 / 연간 보기
이틀 이상 이어지는 작업 기간 표시
```

중요한 데이터 요구:

```txt
plannedStartDate
plannedEndDate
actualStartDate
actualEndDate
```

단일 날짜만으로는 이틀 이상 이어지는 작업을 표현하기 어렵기 때문에, 기간형 날짜 구조를 채택했다.

예시:

```txt
6월 8일
완료: 프로젝트 방향 정리

6월 9일 - 6월 11일
예정: Goal / Plan / Task 카드 UI 구현

6월 15일
마감: Dashboard 오늘 TODO 구현
```

---

## 13. `/trash`

휴지통 페이지다.

삭제 버튼을 눌렀을 때 항목을 바로 영구 삭제하지 않고, 중간 단계로 휴지통에 보낸다.

역할:

```txt
휴지통에 들어간 Goal / Plan / Task 보기
복원
영구 삭제
```

기본 규칙:

```txt
Goal을 휴지통으로 이동
-> 해당 Goal 아래 Plan / Task도 일반 화면에서 숨긴다.

Plan을 휴지통으로 이동
-> 해당 Plan 아래 Task도 일반 화면에서 숨긴다.

Task를 휴지통으로 이동
-> 해당 Task만 일반 화면에서 숨긴다.
```

복원 규칙:

```txt
Goal 복원
-> 하위 Plan / Task도 다시 일반 화면에서 보일 수 있다.

Plan 복원
-> 상위 Goal이 휴지통에 있으면 MVP에서는 단독 복원하지 않는다.

Task 복원
-> 상위 Plan이 휴지통에 있으면 MVP에서는 단독 복원하지 않는다.
```

영구 삭제:

```txt
휴지통 페이지에서만 최종 삭제할 수 있다.
영구 삭제된 항목은 DB에서 삭제하거나, 별도 deletedAt 정책을 추후 정할 수 있다.
MVP에서는 trashedAt을 휴지통 이동 여부로 사용한다.
```

보류와 휴지통은 의미가 다르다.

```txt
보류(paused)
-> 언젠가 다시 활성화할 수 있는 살아있는 항목

휴지통(trashed)
-> 삭제 예정이라 일반 화면에서 숨기는 항목
```

---

## 14. 앱 설정

별도 `/settings` 페이지는 MVP 초반에 만들지 않는다.

큰 방향:

```txt
상단 앱바에서 설정 진입점을 제공한다.
앱바를 누르거나 설정 버튼을 누르면 모달 형태로 설정을 연다.
구체적인 UI는 실제 구현 과정에서 조정한다.
```

우선 고려하는 설정:

```txt
상태 변경 시 실제 진행기간 자동입력 ON / OFF
라이트모드 / 다크모드 토글
```

기본값:

```txt
autoFillActualDatesOnStatusChange = true
```

현재 구현:

```txt
전역 상단 앱바를 만들었다.
앱바 오른쪽에 Heroicons 기반 설정 버튼을 배치했다.
설정 버튼을 누르면 오른쪽 설정 모달이 열린다.
설정 모달에서 light / dark theme을 전환한다.
설정 모달에서 Plan category를 추가 / 수정 / 삭제한다.
설정 모달에서 autoFillActualDatesOnStatusChange 값을 변경한다.
테마 선택은 localStorage의 goaltree-theme에 저장한다.
저장된 테마가 없으면 시스템 prefers-color-scheme 값을 따른다.
Tailwind darkMode는 class 전략을 사용한다.
html.dark 클래스와 CSS 변수 토큰으로 전체 색상을 전환한다.
Plan category 변경과 automation 변경 후 router.refresh()로 현재 페이지 데이터를 갱신한다.
```

브랜드 / 색상 방향:

```txt
앱에 표시되는 프로젝트 이름은 Goaltree로 통일한다.
primary color는 성장과 나무 이미지를 주는 초록색을 사용한다.
secondary color는 나무줄기 느낌의 갈색을 사용하되, UI가 무거워지지 않도록 muted tone으로 사용한다.
```

---

## 15. 날짜 / 시간 정책

날짜 정보는 date와 timestamp를 나눠서 관리한다.

Date 필드:

```txt
plannedStartDate
plannedEndDate
actualStartDate
actualEndDate
```

용도:

```txt
사용자가 보는 예정기간 / 실제 진행기간
Timeline에서 기간 막대 또는 달력 표시
```

Timestamp 필드:

```txt
createdAt
updatedAt
trashedAt
```

용도:

```txt
시스템 기록
생성 / 수정 / 휴지통 이동 시점 추적
```

상태 변경 시 실제 날짜 자동입력 규칙:

```txt
not_started -> in_progress
-> actualStartDate가 비어 있으면 오늘 날짜를 입력한다.

in_progress / blocked -> done
-> actualEndDate를 오늘 날짜로 입력한다.

done -> in_progress
-> actualEndDate를 비운다.
```

위 자동입력은 유저 설정으로 ON / OFF 할 수 있게 확장한다. MVP 기본값은 ON이다.

---

## 16. Today TODO 완료 규칙

Dashboard의 오늘 TODO는 Task와 연결된다.

확정된 규칙:

```txt
오늘 TODO는 date 기준으로 분리한다.
날짜가 바뀌면 오늘 목록은 새 빈 목록으로 시작한다.
이전 날짜의 TODO는 DB에 기록으로 남는다.

오늘 TODO를 완료 처리한다
-> 연결된 Task도 done 상태로 변경한다.
-> 상태 변경 자동입력이 켜져 있으면 actualEndDate도 오늘 날짜로 입력한다.
-> /whativedone에 완료 기록으로 나타난다.
-> /timeline에서도 완료된 일로 나타난다.
```

이틀 이상 진행되는 Task라도 오늘 TODO 완료 시 Task 자체를 완료 처리한다.

긴 작업은 완료 전까지 `in_progress` 상태로 유지하면 충분하다고 판단했다.

이월 정책:

```txt
MVP 기본값은 자동 이월 OFF다.
미완료 TODO 자동 이월은 추후 user_settings에 carryOverIncompleteTodos 같은 값을 추가해서 설정으로 제공할 수 있다.
초기에는 Dashboard에서 "어제 미완료 TODO 가져오기" 같은 수동 버튼 방식이 더 안전하다.
```

---

## 17. 데이터 모델 초안

### 17.1 Node

Goal, Plan, Task는 공통 Node 구조로 관리한다.

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

필드 사용 방식:

```txt
Goal
-> parentId: null
-> importanceReason 사용
-> successCriteriaText 사용

Plan
-> parentId: Goal id
-> categoryId 사용

Task
-> parentId: Plan id
```

### 17.2 PlanCategory

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

### 17.3 TodayTodo

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

### 17.4 UserSettings

유저별 설정이다.

```ts
type UserSettings = {
  userId: string;
  autoFillActualDatesOnStatusChange: boolean;
};
```

---

## 18. 상태값

공통 상태:

```txt
not_started
in_progress
blocked
done
paused
```

UI 표시:

```txt
시작전
진행중
막힘
완료
보류
```

`blocked`는 채택된 상태다. 특히 Task에서 중요하게 표시해야 한다.

---

## 19. 진행률 계산

진행률은 저장하지 않고 계산한다.

```txt
Goal 진행률
-> 해당 Goal 아래 계산 대상 Task 중 done 상태인 Task 비율

Plan 진행률
-> 해당 Plan 아래 계산 대상 Task 중 done 상태인 Task 비율

Task 진행률
-> MVP에서는 상태 기준으로 표시
```

분자:

```txt
done Task
```

분모 포함:

```txt
not_started
in_progress
blocked
done
```

분모 제외:

```txt
paused
trashed
```

주의:

```txt
Goal / Plan 자체의 상태와 진행률은 별개다.
진행률은 Task 완료 비율을 기준으로 계산한다.
blocked는 진행률 분모에 포함한다.
paused는 진행률 분모에서 제외한다.
trashedAt이 있는 항목은 진행률 계산에서 제외한다.
```

---

## 20. MVP에서 제외된 기능

다음 기능은 MVP 이후 필요할 때 추가한다.

```txt
Google 로그인
비밀번호 재설정 / 수정 페이지
Reviews 페이지
Skills 페이지
Projects 페이지
Actions 페이지
Search / All Nodes 페이지
Goal 성공기준 체크리스트
Plan 설명 / 목적 필드
Task 세부 체크리스트
마인드맵 / 그래프 시각화
알림
캘린더 연동
협업 기능
결제
```

보류 이유:

```txt
초기 MVP는 /workspace와 /dashboard 중심으로 단순하게 만든다.
페이지가 많아지면 핵심 UX가 흐려진다.
```

---

## 21. 구현 시 주의할 점

### 21.1 `/workspace`는 상태 보드가 아니다

`/workspace`의 세 컬럼은 상태가 아니라 계층이다.

```txt
Goal -> Plan -> Task
```

따라서 Trello식 컬럼 간 이동을 구현하면 안 된다.

### 21.2 Plan은 중첩하지 않는다

Plan 안에 Plan을 넣지 않는다.

복잡한 계획은 Task를 더 많이 만드는 방식으로 처리한다.

### 21.3 Task는 오늘 TODO와 연결될 수 있다

Task 자체가 오늘 TODO인 것은 아니다.

Task를 특정 날짜의 TodayTodo에 연결하면 Dashboard에 나타난다.

### 21.4 완료 기록은 Task 중심이다

`/whativedone`과 `/timeline`에서 가장 중요한 기록 단위는 Task다.

Goal이나 Plan 완료도 표시할 수 있지만, MVP에서는 Task 완료 기록을 중심으로 보는 것이 자연스럽다.

### 21.5 보류와 휴지통을 혼동하지 않는다

```txt
paused
-> 살아있지만 당분간 집중 대상에서 제외한 항목

trashedAt 있음
-> 삭제 예정이라 일반 화면에서 숨기는 항목
```

보류 항목은 Workspace에서 필터로 다시 볼 수 있게 할 수 있다.

휴지통 항목은 `/trash`에서만 복원하거나 영구 삭제한다.

### 21.6 README 역할 분리

```txt
README.md
-> 개발 체크리스트와 진행 상황 관리

README_CODEX.md
-> 프로젝트 맥락과 상세 설계 인수인계
```

새로운 Codex 세션은 우선 `README.md`와 `README_CODEX.md`를 함께 읽고, 실제 개발 상태는 파일 구조와 코드에서 확인해야 한다.

---

## 22. 현재 구현 상태

2026-06-17 기준, 이 저장소의 핵심 MVP를 v1로 둔다.

v1은 로그인, Supabase 데이터 연결, `Goal -> Plan -> Task` Workspace, Daily TODO Dashboard, What I've Done, Timeline, Trash, Settings, 데스크탑 / 모바일 주요 UI/UX 정리를 포함한다.

구현된 것:

```txt
루트 페이지(/) -> /dashboard 리디렉션
기본 라우트 생성: /login, /dashboard, /workspace, /whativedone, /timeline, /trash
공통 상단 앱바
상단 앱바 Sign out 버튼
상단 앱바 Settings 버튼
설정 모달 내 라이트모드 / 다크모드 전환
페이지 표시 이름 Goaltree 통일
Goaltree 테마 색상 적용
다크모드 상태 배지 색상 조정
@supabase/ssr 설치
Supabase browser / server client helper
proxy.ts 기반 Supabase 세션 갱신과 보호 라우팅
/login 실제 이메일 로그인 / 회원가입 연결
supabase/migrations/001_initial_schema.sql 초기 DB 스키마 파일
Supabase SQL Editor 초기 스키마 실행 완료
Supabase DB 테이블 생성 완료: nodes, plan_categories, today_todos, user_settings
Supabase DB 관계 / 제약 / RLS 정책 설정 완료
supabase/migrations/002_grant_authenticated_permissions.sql 권한 grant 파일 작성
Supabase SQL Editor authenticated role 권한 grant 실행 완료
Goal / Plan / Task TypeScript 타입 초안
PlanCategory, TodayTodo, UserSettings TypeScript 타입 초안
/workspace Supabase 데이터 읽기 연결
/workspace Goal / Plan / Task 카드 생성 Supabase insert 연결
/workspace Detail Panel 제목 / 메모 / 상태 Supabase update 연결
/workspace Detail Panel 날짜 필드 Supabase update 연결
/workspace Goal Detail Panel 왜 중요한지 / 성공기준 Supabase update 연결
/workspace Plan Detail Panel 카테고리 변경 Supabase update 연결
/workspace 상태 변경 시 실제 진행기간 자동입력 규칙 연결
/workspace 상태 변경 시 실제 진행기간 자동입력 ON / OFF 설정값 반영
/workspace Goal / Plan / Task 휴지통 이동 연결
/workspace 상위 항목이 휴지통에 있을 때 하위 항목 일반 화면 숨김 처리
/workspace Task를 오늘 TODO에 추가 / 제거 연결
/workspace 진입 시 오늘 날짜의 TodayTodo 로드
/dashboard Supabase TodayTodo 데이터 읽기 연결
/dashboard TodayTodo 완료 시 연결 Task done 처리 연결
/dashboard TodayTodo 드래그 정렬과 sort_order 저장 연결
/dashboard Blocked / Recent Done / This Week Focus를 실제 Node 상태 기반으로 표시
/whativedone Supabase 완료 Task 데이터 읽기 연결
/whativedone Goal / Plan Contribution 실제 Node 상태 기반 계산
/timeline Supabase Goal / Plan / Task 데이터 읽기 연결
/timeline planned date / actual date 기반 기간 표시 연결
/settings 모달 구현
/settings light / dark theme 전환 연결
/settings Plan category 추가 / 수정 / 삭제 Supabase 연결
/settings autoFillActualDatesOnStatusChange Supabase 연결
/workspace URL nodeId 선택 복원 연결
/dashboard TODO / Blocked / Recent Done 클릭 시 /workspace Goal / Plan / Task 맥락 복원 연결
/trash Supabase 데이터 읽기 연결
/trash 실제 복원 기능 연결
/trash 실제 영구 삭제 기능 연결
/workspace 진입 시 신규 유저 user_settings 기본값 생성
/workspace 진입 시 신규 유저 기본 Plan 카테고리 생성
/workspace 3단 카드 UI
Goal 선택 시 Plan 필터링
Plan 선택 시 Task 필터링
오른쪽 Detail Panel
Goal / Plan / Task 진행률 표시
Plan 카테고리 표시
같은 섹션 안에서만 카드 드래그 정렬
드래그 정렬 결과 Supabase 저장
드래그 핸들 방식 적용
드래그 카드 좌우 이동 제한
드래그 카드 상하 경계 제한
드래그 경계 soft clamp 적용
목록 카드의 기간 텍스트 제거
/workspace 검색 기능
/workspace 검색 결과 Goal / Plan / Task 유형별 표시
/workspace 검색 결과 클릭 시 선택 상태와 Detail Panel 복원
/dashboard 최근 7일 Daily TODO 조회
/dashboard Daily TODO 날짜 이동 UI
/dashboard 과거 TODO를 오늘 TODO로 다시 추가
/dashboard 7일보다 오래된 TodayTodo row 앱 진입 시 정리
/dashboard TodayTodo 카드 / 보조 패널 모바일 스크롤 처리
/dashboard This Week Focus 카드 정보 정리: Plan 제목 + 연결 Goal
/whativedone Day / Week / Month / Year segmented control
/whativedone 오늘이 속한 일 / 주 / 월 / 연 기준 Completion Log 표시
/whativedone Completion Log 날짜 라벨 포맷 정리
/whativedone Goal / Plan Contribution 모바일 스크롤 처리
/timeline Week / Month / Year 기간 이동 UI
/timeline 상태별 요약 카드: Not Started / In Progress / Blocked / Done
/timeline Range Tasks / Timeline Legend 아이콘 정리
/timeline 항목 카드는 직접 /workspace 링크로 동작
/trash All / Goal / Plan / Task 필터
/trash Confirm delete 외부 클릭 초기화
/settings Plan Categories 아코디언 UI
/settings Plan Categories 모바일 한 줄 편집 레이아웃
상단 앱바 현재 페이지 active 표시
모바일 앱바 햄버거 메뉴
공통 페이지 로딩 UI
Goaltree favicon
데스크탑 / 모바일 주요 페이지 반응형 레이아웃 정리
```

v1 범위 밖이거나 후속 개선 후보:

```txt
카테고리별 Plan 필터링
Reviews 페이지
Skills 페이지
비밀번호 재설정 / 수정 페이지
Google 로그인
Inbox / Brainstorm 아이디어 수집 페이지
```

Login / Auth UI:

```txt
/login은 src/app/login/login-board.tsx에 구현되어 있다.
MVP 방향에 맞게 이메일 로그인만 UI에 포함했다.
Sign in / Create account segmented control로 로그인과 회원가입 화면을 전환한다.
Email, Password UI를 배치했다.
Sign in은 supabase.auth.signInWithPassword를 호출한다.
Create account는 supabase.auth.signUp을 호출한다.
성공하면 /dashboard로 이동한다.
Remember me 체크박스는 실제 기능과 UI가 어긋나지 않도록 제거했다.
Reset password 버튼은 MVP에서 제거했다. 비밀번호 재설정 / 수정은 v2에서 별도 페이지로 구현한다.
세션 유지는 Supabase SSR 세션 쿠키 기본 동작을 사용한다.
인증 전 주요 페이지 이동을 피하기 위해 /login에서는 상단 앱바를 숨긴다.
```

Dashboard UI:

```txt
/dashboard는 src/app/dashboard/dashboard-board.tsx에 구현되어 있다.
Daily TODO를 가장 큰 패널로 배치했다.
This Week Focus를 핵심 보조 패널로 배치했다.
Blocked / Recent Done은 OptionalDashboardPanels 컴포넌트로 분리했다.
showOptionalPanels 값을 통해 선택 패널을 쉽게 숨길 수 있다.
Today TODO는 Supabase today_todos 데이터를 사용한다.
TODO 체크는 today_todos.done을 업데이트하고, 연결된 Task status도 done으로 바꾼다.
Today TODO는 왼쪽 drag handle로 순서를 바꿀 수 있고, 변경된 순서는 today_todos.sort_order에 저장한다.
TODO 링크는 /workspace?nodeId=task-id로 이동하고, 해당 Goal / Plan / Task 선택 상태를 복원한다.
Dashboard는 todayDate 기준 최근 7일의 today_todos를 읽는다.
날짜 이동 UI로 오늘과 최근 6일의 TODO 기록을 확인할 수 있다.
오늘이 아닌 날짜의 TODO는 체크 완료를 막고, Add to Today 버튼으로 오늘 목록에 다시 추가할 수 있다.
7일보다 오래된 today_todos row는 getWorkspaceData 호출 시 lazy cleanup한다.
This Week Focus는 현재 active Plan 상위 항목을 보여주며, 카드 제목은 Plan 제목, 보조 텍스트는 연결 Goal 제목만 표시한다.
```

What I've Done UI:

```txt
/whativedone은 src/app/whativedone/what-ive-done-board.tsx에 구현되어 있다.
완료한 Task 기록을 보는 기록장 페이지로 만들었다.
Day / Week / Month / Year segmented control로 완료 기록 기준을 전환한다.
Completion Log는 날짜 이동 기능 없이 오늘이 속한 일 / 주 / 월 / 연 기준 완료 기록을 표시한다.
Day 라벨은 yyyy.MM.dd 형식이다.
Week 라벨은 yyyy.MM.dd - yyyy.MM.dd 형식이다.
완료 Task 카드에는 완료일, 카테고리, Goal / Plan breadcrumb, 메모를 표시한다.
완료 카드 클릭 시 /workspace?nodeId=task-id로 이동하고, 해당 Task 선택 상태를 복원한다.
오른쪽에는 Goal Contribution과 Plan Contribution 패널을 배치했다.
Contribution 패널은 완료한 일이 어떤 Goal / Plan에 쌓였는지 비율과 개수로 보여주는 보조 요약이다.
현재는 Supabase nodes 데이터를 읽어서 status=done이고 actualEndDate가 있는 Task를 표시한다.
```

Timeline UI:

```txt
/timeline은 src/app/timeline/timeline-board.tsx에 구현되어 있다.
Done / Upcoming segmented control로 실제 진행기간과 예정기간 보기를 전환한다.
Goal / Plan / Task segmented control로 표시할 Node 타입을 전환한다.
Week / Month / Year segmented control로 타임라인 그룹 기준을 전환한다.
Week / Month / Year 기준으로 이전 / 다음 기간 이동 버튼을 제공한다.
상단 요약 카드는 Not Started / In Progress / Blocked / Done 상태별 개수를 보여준다.
본문은 세로 타임라인 형태로 구성했다.
각 항목에는 제목, Goal / Plan breadcrumb, 상태, 날짜 범위를 표시한다.
각 항목 카드 자체가 /workspace?nodeId=node-id 링크로 동작한다.
Goal / Plan 항목에는 하위 Task 기준으로 계산될 진행률을 표현할 수 있도록 progress bar를 표시한다.
이틀 이상 이어지는 항목은 RangeBar와 Range 패널에서 별도로 눈에 띄게 표시한다.
Done 모드는 actualStartDate / actualEndDate를 사용한다.
Upcoming 모드는 plannedStartDate / plannedEndDate를 사용한다.
현재는 Supabase nodes 데이터를 읽어서 Goal / Plan / Task를 표시한다.
타임라인 항목 클릭 시 /workspace?nodeId=node-id로 이동하고 선택 상태를 복원한다.
```

Trash UI:

```txt
/trash는 src/app/trash/trash-board.tsx에 구현되어 있다.
상단 앱바에 Trash 링크를 추가했다.
All / Goal / Plan / Task 필터로 휴지통 항목을 볼 수 있다.
각 항목에는 type, status, 원래 Goal / Plan breadcrumb, trashedAt을 표시한다.
Restore 버튼과 Delete 버튼을 표시한다.
Delete는 1차 클릭 후 Confirm delete로 바뀌며, 외부 클릭 시 다시 Delete로 초기화된다.
상위 Goal 또는 Plan이 휴지통에 있는 하위 항목은 Restore 버튼을 disabled 처리한다.
복원 제한 이유는 카드 안의 안내 박스로 보여준다.
오른쪽에는 Restore Rules와 Permanent Delete 안내 패널을 배치했다.
현재는 Supabase nodes 데이터를 읽어서 trashedAt이 있는 항목을 표시한다.
Restore는 trashed_at을 null로 되돌린다.
Delete는 nodes row를 실제 삭제하며 DB cascade로 하위 Node와 연결된 TodayTodo도 함께 정리된다.
```

검증:

```txt
npm run typecheck 통과
```

---

## 23. 현재 결정 요약

확정:

```txt
Goal / Plan / Task 구조
/dashboard를 로그인 후 첫 화면으로 사용
/를 /dashboard로 리디렉션
/workspace를 핵심 작업 화면으로 사용
/whativedone 페이지 추가
/timeline 페이지 추가
로그인 기능 추가
MVP 로그인 provider는 이메일 로그인
Next.js / TypeScript / Tailwind CSS 채택
shadcn/ui 채택
Supabase PostgreSQL / Supabase Auth 채택
Vercel 배포 채택
dnd-kit 채택
date-fns 채택
Heroicons 채택
Plan 사용자 정의 카테고리 추가
Task에 blocked 상태 추가
Goal / Plan / Task 카드 드래그 정렬
컬럼 간 카드 이동 금지
/trash 페이지 추가
휴지통 복원 / 영구삭제 규칙
보류와 휴지통 의미 구분
오늘 TODO 완료 시 Task 완료 처리
상태 변경 시 실제 날짜 자동입력 기본 ON
상단 앱바 설정 모달 방향
설정 모달 내 라이트모드 / 다크모드 전환
페이지 표시 이름 Goaltree 통일
초록 primary / 나무줄기 갈색 secondary 색상 방향
v1 완료 기준: 2026-06-17
```

미정:

```txt
현재 본격 개발을 막는 큰 미정 사항은 없음
```

---

## 24. v1.1 후보: Inbox / Brainstorm

v1 이후 첫 후속 기능 후보는 자유 아이디어 수집 페이지다.

배경:

```txt
현재 /workspace는 Goal -> Plan -> Task 계층이 정리된 상태에서 쓰기 좋다.
하지만 아직 Goal / Plan / Task로 분류하기 전의 생각, 아이디어, 할 일을 빠르게 적어두는 공간은 없다.
```

후보 라우트:

```txt
/inbox
/brainstorm
```

현재 판단:

```txt
/inbox를 더 추천한다.
이유는 특정 브레인스토밍보다 "아직 정리되지 않은 생각의 수집함"이라는 의미가 넓고, 향후 할 일 / 아이디어 / 메모를 함께 담기 좋기 때문이다.
페이지 제목이나 섹션명은 Brainstorm 또는 Idea Inbox로 정할 수 있다.
```

v1.1에서 검토할 기능:

```txt
자유 아이디어 카드 생성
아이디어 카드 제목 / 메모 수정
아이디어 카드 삭제 또는 보관
아이디어 카드 태그 또는 간단한 상태
괜찮은 아이디어를 /workspace의 Goal / Plan / Task로 전환
전환 시 연결할 parent 선택: Goal로 만들기, 특정 Goal 아래 Plan으로 만들기, 특정 Plan 아래 Task로 만들기
전환된 아이디어를 converted 상태로 남길지, 숨길지 결정
```

아직 미정:

```txt
최종 라우트명
별도 DB 테이블을 만들지, nodes와 분리된 idea/inbox 테이블을 만들지
전환 후 원본 아이디어를 보관할지 삭제할지
```
