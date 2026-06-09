# 에이전트 규칙 (글로벌 설정 복사본)

`~/.claude` 의 **글로벌 에이전트 설정을 이 fork 로 복사**한 것입니다. 원본은 글로벌에 그대로 유지되며, 여기 있는 건 사본입니다.

## 배경

실제 CapCut 프로젝트(`0531`, 23분 강의 녹취 자막 ~1,150줄)를 `capcut-cli` 로 다듬는 작업에서 정립된 규칙입니다. 작업 내용:

- STT 군말 제거(어/음/네/그/뭐) + 명백한 오인식 교정(예: `어묵 메뉴얼→업무 매뉴얼`, `자동 아파트→자동화`, `1 년의→일련의`, `안목지→암묵지`)
- 표기 통일 — 약어 소문자(`ai/seo/llm/mz/ppt`), 고유명사(`VS Code/Claude/Claude Code`), 기능어 영어(`agent/commands/hooks/skill/workflow`), `.claude`
- 이음새 반복 정리(`그래서 그래서` → 앞엣것 제거)
- 1초 이하 자막을 인접과 **병합**(리세그멘테이션, 두 텍스트 트랙 통합, 실제 타이밍 사용)
- **의미 단위 줄바꿈**(접속사 앞/종결·연결어미 뒤 우선, 의존명사·영어 복합어·조사 뒤 회피)

이 사본은 위 규칙을 이 fork 안에서 **코드나 프로젝트 rules(AGENTS.md / 스킬 등)로 발전**시키기 위한 참고 자료입니다.

## 파일

- **`capcut-cli.md`** — 글로벌 `~/.claude/capcut-cli.md` 전문. capcut-cli 작업 절차(앱 종료 확인·백업·id 기준·set-text/batch·draft 직접 편집·검증), 자막 퇴고 컨벤션, 표기 규칙, 짧은 자막 병합, 의미 단위 줄바꿈.
- **`claude-md-entry.md`** — 글로벌 `~/.claude/CLAUDE.md` 에 있던 진입점 섹션. "CapCut CLI 자막 작업 시 위 규칙을 먼저 읽어라"는 포인터 + 핵심 요약.

## 코드화 힌트 (참고)

- 병합/줄바꿈 로직은 작업 중 `merge_subs.py` · `merge2.py` · `wrap_meaning.py` 로 구현했음 — `caption`/자막 정리 서브커맨드나 `lint --fix` 류로 흡수 가능.
- 표기 통일·군말 제거는 사전(dictionary) + 문맥 규칙. `lint` 의 새 룰이나 `clean`/`tidy` 커맨드 후보.
- whisper 기반 `caption` 의 한국어 정확도는 `--whisper-model` 을 `base` 대신 `medium` 이상으로 올리면 오인식이 크게 줄어듦(위 교정 사례 다수가 base 모델 한계).
