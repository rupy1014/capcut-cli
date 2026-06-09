## CapCut CLI 자막/draft 편집

CapCut draft(자막·세그먼트)를 `capcut-cli`로 편집하는 작업(자막 퇴고, 오탈자·표기 통일, 군말 제거 등)을 할 때는 **먼저 `~/.claude/capcut-cli.md` 를 읽어 rules로 따른다.** 핵심만:

- **작업 전**: CapCut 앱 종료 확인(`pgrep -x CapCut` — 열려 있으면 닫게 요청, 강제 종료 금지) → `draft_info.json` 타임스탬프 백업 → `capcut texts` 재추출(사용자가 직접 편집했을 수 있으니 현재 상태 기준, **id로 작업**).
- **편집**: 일괄은 `capcut batch <proj>` ← JSONL(`{"cmd":"set-text","id":"<id>","text":"..."}`). 대량 변환은 `jq gsub` 체인으로 생성하고 **적용 전 before→after 전체 검토**. 검증은 `texts` 재추출 + `jq empty draft_info.json`.
- **표기 컨벤션(확정)**: 약어 소문자(`ai seo llm mz ppt md esc html`), 단일 알파벳 대문자(`A B`), 고유명사(`VS Code Claude "Claude Code"`), 기능어 영어 소문자(`agent sub-agent commands hooks skill workflow context working`). `메뉴얼`(매뉴얼 아님)·`컨텐츠`·`메모리`·`터미널`·`폴더`·리서치·레퍼런스 등은 한글 유지. 화면 UI "메뉴"는 안 바꿈.
- 경로: `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<프로젝트명>`.
