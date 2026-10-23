# 에이전트 규칙 (글로벌 설정 복사본)

`~/.claude` 의 **글로벌 에이전트 설정을 이 fork 로 복사**한 것입니다. 원본은 글로벌에 그대로 유지됩니다. 이 fork의 현재 작업에서는 로컬 `capcut-draft-editing-workflow.md`가 우선하며, 글로벌 옛 사본으로 대체하지 않습니다.

## 배경

실제 CapCut 프로젝트(`0531`, 23분 강의 녹취 자막 ~1,150줄)를 `capcut-cli` 로 다듬는 작업에서 정립된 규칙입니다. 작업 내용:

- STT 군말 제거(어/음/네/그/뭐) + 명백한 오인식 교정(예: `어묵 메뉴얼→업무 매뉴얼`, `자동 아파트→자동화`, `1 년의→일련의`, `안목지→암묵지`)
- 표기 통일 — 약어 소문자(`ai/seo/llm/mz/ppt`), 고유명사(`VS Code/Claude/Claude Code`), 기능어 영어(`agent/commands/hooks/skill/workflow`), `.claude`
- 이음새 반복 정리(`그래서 그래서` → 앞엣것 제거)
- 1초 이하 자막 인접 병합(0531 당시 규칙). 현재는 workflow §4의 어절 시각 기반 DP 재분할·전량 정독으로 대체
- **의미 단위 줄바꿈**(접속사 앞/종결·연결어미 뒤 우선, 의존명사·영어 복합어·조사 뒤 회피)

이 사본은 위 규칙을 이 fork 안에서 **코드나 프로젝트 rules(AGENTS.md / 스킬 등)로 발전**시키기 위한 참고 자료입니다.

## 파일

- **`capcut-cli.md`** — 글로벌 `~/.claude/capcut-cli.md` 전문. capcut-cli 작업 절차(앱 종료 확인·백업·id 기준·set-text/batch·draft 직접 편집·검증), 자막 퇴고 컨벤션, 표기 규칙, 짧은 자막 병합, 의미 단위 줄바꿈.

- **`capcut-draft-editing-workflow.md`** — 현재 Codex/agent용 CapCut draft 생성·편집 표준 워크플로. 새 프로젝트 등록(`root_meta_info.json`), 미디어 내부화(`assets/video`), 무음편집, 자동캡션 리타이밍, 검증, 작업 후 퇴고 패스를 포함한다.
- **`audio-breath-aware-silence-editing.md`** — `~/Desktop/음성녹음` 같은 폴더의 오디오 파일을 파일별로 무음편집할 때 쓰는 전용 워크플로. `-28dB/60ms·80ms`는 사전 레벨 측정 후 채택하는 비교 시작값이며, 숨소리는 workflow §3.3 교집합으로 판정한다. 직접 만든 dB threshold 컷은 fallback으로만 사용한다.
- **`claude-md-entry.md`** — 글로벌 `~/.claude/CLAUDE.md` 에 있던 진입점 섹션. "CapCut CLI 자막 작업 시 위 규칙을 먼저 읽어라"는 포인터 + 핵심 요약.

## 코드화 힌트 (참고)

- 병합/줄바꿈 로직은 작업 중 `merge_subs.py` · `merge2.py` · `wrap_meaning.py` 로 구현했음 — `caption`/자막 정리 서브커맨드나 `lint --fix` 류로 흡수 가능.
- 표기 통일·군말 제거는 사전(dictionary) + 문맥 규칙. `lint` 의 새 룰이나 `clean`/`tidy` 커맨드 후보.
- 자막은 CapCut 앱 자동 자막으로 만든다. whisper는 컷 거부권·재발화 경계 실측·join 재전사 검증에 사용한다(workflow §3·§3.3). 자막 생성용 옛 `caption` + whisper 경로는 폐기됐다.
- **`capcut-shorts-workflow.md`** — 긴 강의/녹화 프로젝트에서 주요 구간을 여러 쇼츠 CapCut 프로젝트로 추출하는 워크플로. 후보 선정, range trimming, root 등록, 내부 media path, 자막/style 보존, 쇼츠별 검증/퇴고 패스를 포함한다.

## 현재 규칙 빠른 진입 (2026-10-22)

- [draft workflow](capcut-draft-editing-workflow.md) §1: 앱 자동 재저장과 사용자 편집 구분, 실행 중 쓰기 금지.
- 같은 문서 §2.7: 상호상관 + audio start_time 싱크, 로컬 빌드 원형 마스크, 슬라이드/코딩 화면 배치.
- 같은 문서 §3·§3.3: 임계별 30ms 음성대역 RMS 전수 측정 → 교집합 컷·재전사 거부권, 군말 오디오 삭제·재발화 실측.
- 같은 문서 §4·§5·§8: 대본은 용어 근거, 화면으로 표기 확인·뜻 보존, 공백 포함 15자 어절 재분할·전량 정독, 검은 박스, 전후 합성 프레임·청감 사용자 확인.
