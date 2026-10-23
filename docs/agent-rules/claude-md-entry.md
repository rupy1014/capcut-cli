## CapCut CLI 자막/draft 편집

CapCut draft(자막·세그먼트)를 `capcut-cli`로 편집하는 작업(자막 퇴고, 오탈자·표기 통일, 군말 제거 등)을 할 때는 **먼저 이 repo의 `docs/agent-rules/capcut-draft-editing-workflow.md`와 `capcut-cli.md`를 읽는다.** 글로벌 `~/.claude/capcut-cli.md`는 옛 사본일 수 있어 로컬 현재 규칙을 우선한다. 핵심만:

- **작업 전**: CapCut 앱 종료 확인(`pgrep -x CapCut` — 열려 있으면 닫게 요청, 강제 종료 금지) → `draft_info.json` 타임스탬프 백업 → `capcut texts` 재추출(사용자가 직접 편집했을 수 있으니 현재 상태 기준, **id로 작업**).
- **편집**: 일괄은 `capcut batch <proj>` ← JSONL(`{"cmd":"set-text","id":"<id>","text":"..."}`). 대량 변환은 `jq gsub` 체인으로 생성하고 **적용 전 before→after 전체 검토**. 검증은 `texts` 재추출 + `jq empty draft_info.json`.
- **표기 컨벤션(확정)**: 약어 소문자(`ai seo llm mz ppt md esc html`), 단일 알파벳 대문자(`A B`), 고유명사(`VS Code Claude "Claude Code"`), 기능어 영어 소문자(`agent sub-agent commands hooks skill workflow context working`). `메뉴얼`(매뉴얼 아님)·`컨텐츠`·`메모리`·`터미널`·`폴더`·리서치·레퍼런스 등은 한글 유지. 화면 UI "메뉴"는 안 바꿈.
- 경로: `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<프로젝트명>`.

- **현재 규칙**: workflow §1(앱 재저장 구조 diff), §2.7(2소스 싱크·PiP·화면 배치), §3.3(임계 사전 측정·교집합 컷), §3 5항(재발화), §4(뜻 보존·어절 재분할·공백 포함 15자), §5(흰 슬라이드 검은 박스), §8(전후 합성 프레임·청감 사용자 확인)을 따른다. 군말은 오디오에서도 삭제하고, 즉흥 강의 대본은 용어·표기 근거로만 쓴다.
