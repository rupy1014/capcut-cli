# AGENTS.md — Taesup CapCut Editing Rules

이 레포에서 CapCut draft를 편집할 때의 사용자 작업 방식 지침이다. 이 문서는 레포 루트와 하위 디렉터리에 적용된다.

## Upstream 동기화 (renezander030/capcut-cli)

이 레포는 `renezander030/capcut-cli`의 fork다. 리모트 구성:

- `upstream` = `https://github.com/renezander030/capcut-cli.git` — 원본, 최신을 여기서 받는다.
- `origin` = `https://github.com/rupy1014/capcut-cli.git` — 내 fork, 개인 변경 백업처.

**사용자가 "git pull 해줘"라고 하면 origin이 아니라 upstream 최신을 받는다:**

```bash
git fetch upstream && git merge --ff-only upstream/master
```

- `--ff-only`로 fast-forward만 허용 — 깨끗하게 따라가고, 내 개인 커밋과 갈라지면 멈춰서 알린다(자동 merge/rebase 금지).
- 개인 파일(AGENTS.md, docs/agent-rules/, skills/ 등)은 master에 커밋해도 upstream 경로와 겹치지 않아 FF가 막히지 않는다. FF가 막히면 사용자에게 보고하고 `git merge upstream/master`(또는 rebase) 여부를 묻는다.
- 스크래치/생성물(`temp/ outputs/ images/ .omj/ .DS_Store`)은 `.gitignore`라 동기화에 영향 없다.

## 기본 태도

- 사용자는 적극적인 편집을 선호한다. 단순 자막 교정이 아니라 영상 컷, 무음 삭제, 반복 발화 정리를 함께 수행한다.
- “무음편집”은 무음 구간을 짧게 남기거나 압축하는 것이 아니다. **음성 없는 구간은 컷으로 완전히 삭제한다.**
- 발음이 꼬여 같은 내용/비슷한 내용을 다시 말한 경우, **앞 실패 발화는 삭제하고 뒷부분 성공 발화만 살린다.**
- 작업 완료 주장은 `capcut lint`만으로 하지 않는다. 실제 무음 잔존 검증과 자막 품질 검사를 같이 해야 한다.

## CapCut 작업 전 필수

1. CapCut 앱 종료 확인:
   ```bash
   pgrep -x CapCut || true
   ```
   - CapCut이 실행 중이면 draft 파일을 쓰지 않는다.
   - 실행 중인 상태에서 수정하면 CapCut이 메모리의 이전 상태로 다시 덮어써 변경이 유실될 수 있다.
   - 강제 종료하지 말고 사용자에게 닫았는지 확인하거나, 닫힐 때까지 감시한다.

2. 현재 draft 백업:
   ```bash
   cp draft_info.json draft_info.json.bak_codex_<task>_<timestamp>
   cp Timelines/<timeline-id>/draft_info.json Timelines/<timeline-id>/draft_info.json.bak_codex_<task>_<timestamp>
   ```

3. top-level draft와 Timeline draft 둘 다 수정하고, 마지막에 동기화한다:
   ```bash
   cp draft_info.json Timelines/<timeline-id>/draft_info.json
   cmp -s draft_info.json Timelines/<timeline-id>/draft_info.json
   ```

## 무음편집 기준

- ffmpeg `silencedetect`로 원본 미디어의 무음 구간을 산출한다.
- 기본 엄격 기준:
  ```bash
  ffmpeg -hide_banner -i "$media" \
    -af silencedetect=noise=-35dB:d=0.12 \
    -f null - 2> silencedetect.log
  ```
- `0.12초 이상` 음성 없는 구간은 삭제 대상이다.
- 삭제 후에는 비디오 target timeline을 gap/overlap 없이 재패킹한다.
- 편집 후 원본 source silence interval을 현재 video source ranges에 다시 매핑해서 검증한다.
- 성공 기준:
  - `remaining_strict_silence_ge_120ms_count == 0`
  - `remaining_strict_silence_ge_120ms_total_s == 0`
  - video target gap/overlap `0`
  - video end가 project duration과 일치

## 반복/말꼬임 컷 기준

- 같은 의미를 더듬거나 다시 말한 경우 앞부분을 삭제한다.
- “앞 실패 발화 + 뒤 성공 발화” 구조면 뒤 발화만 살린다.
- 단순히 자막만 비우지 말고, 실제 영상/음성 구간도 함께 컷 삭제한다.
- 예시:
  - `가볍 가볍게` → 앞 실패 발화 삭제, 뒤 `가볍게` 보존
  - `린스타... 린스타터...` → 앞 말꼬임 삭제, 최종 의미만 보존
  - `이게 이게 이게 차별점이` → 앞 반복 삭제, `차별점이...` 보존

## 자막 교정 기준

- 전체 자막을 시간순으로 읽고 앞뒤 2~3줄 문맥으로 교정한다.
- 독립 추임새 제거: `어`, `음`, `네`, `그`, `뭐`, `자`
  - 단어 일부는 건드리지 않는다. 예: `어떤`, `없어`, `그다음에`.
- 명백한 STT 오류는 적극 교정한다.
- 이 사용자의 표기 선호:
  - `ai`, `api`, `llm`, `seo`, `css`, `html`, `mvp` 등 약어는 소문자 우선
  - 영어 제품명/도구명은 발음식 한글로 쓰지 않는다. 예: `클로드코드`/`클로드 코드` 금지, `Claude Code`로 표기
  - 고유명사: `Claude`, `Claude Code`, `VS Code`
  - 개발/제품 용어: `mvp`, `DevOps`, `DB`, `JavaScript`, `UX`
  - `도매인 → 도메인`, `구연 → 구현`, `피디백 → 피드백`, `베포 → 배포`, `디버킹 → 디버깅`
  - `린스타터업/린스타첩/린스타터 → 린 스타트업`
- 확실하지 않은 고유명사/서비스명은 추정으로 바꾸지 않는다. 후보로 보고한다.

## 자막 길이·병합·줄바꿈 처리

### 짧은 자막 병합

- 엄격 컷 이후 너무 짧은 자막이 생기면 인접 자막과 병합한다.
- 기본 기준: `0.35초 이하`는 반드시 병합 대상이다. `0.5초 이하`도 읽기 흐름상 어색하면 병합한다.
- 병합은 의미 단위로 한다. 단순 글자수 반반 분할 금지.
- 자막 시간을 임의로 새로 만들지 않는다. 현재 draft의 구조적 배치를 존중한다.
  - 병합 시 대표 자막의 시간은 병합 대상 segment들의 실제 `start`부터 `end`까지로 잡는다.
  - 주변 자막과 겹치지 않게 하고, 기존 인접 segment의 경계를 기준으로 처리한다.
  - 짧은 자막만 빈 문자열로 남기지 말고, 실제 text segment를 제거하거나 인접 segment에 흡수한다.

### 긴 자막 줄바꿈

- 한 자막이 30글자 이상이면 화면에서 3줄 이상으로 넘어갈 수 있으므로 최대 2줄이 되도록 줄바꿈을 넣는다.
- 줄바꿈은 `\n`으로 넣고, 어휘/의미 단위에서 끊는다.
- 끊기 좋은 위치:
  - 접속사 앞: `그리고`, `그래서`, `근데`, `하지만`, `예를 들면`
  - 의미 덩어리 뒤: 목적어/서술어가 자연스럽게 닫히는 지점
  - 영어 복합어는 붙여 둔다: `Claude Code`, `VS Code`, `JavaScript` 사이에서 끊지 않는다.
- 끊으면 안 되는 위치:
  - 조사만 다음 줄로 보내기
  - `할 수`, `하는 것`, `그런 거`, `이런 식` 같은 의존 표현 사이
  - 영어 단어/제품명 중간
- 문장이 너무 길면 내용을 새로 늘리지 말고, 군더더기를 줄이거나 어휘 단위로 2줄 배치한다.

### 성공 기준

- `caption_le_350ms == 0`
- `caption_gt_7s == 0`
- 30글자 이상 자막은 최대 2줄
- 3줄 이상 자막 없음
- text overlap `0`

## 필수 검증 체크리스트

작업 완료 전 아래를 모두 확인한다.

```bash
python3 -m json.tool draft_info.json >/dev/null
python3 -m json.tool Timelines/<timeline-id>/draft_info.json >/dev/null
cmp -s draft_info.json Timelines/<timeline-id>/draft_info.json
capcut lint <project>
capcut info <project> -H
capcut texts <project> > texts-after.json
capcut segments <project> --track video > video-after.json
```

최종 보고에는 최소한 아래 수치를 포함한다.

- 원본 길이 → 편집 후 길이
- 삭제된 총 시간
- 영상 컷 수
- 자막 수
- `capcut lint` errors/warnings
- video gap/overlap 수
- `remaining_strict_silence_ge_120ms_count`
- 독립 추임새 잔존 수
- 0.35초 이하 / 7초 초과 자막 수
- 30글자 이상 자막 중 줄바꿈 처리 여부, 3줄 이상 자막 수
- 주요 오탈자 패턴 잔존 수

## 완료 기준

완료라고 말하려면 다음이 모두 참이어야 한다.

- CapCut 앱이 닫힌 상태에서 저장 완료
- top-level / Timeline draft 동기화 완료
- JSON 정상
- `capcut lint` errors 0, warnings 0
- 0.12초 이상 무음 잔존 0
- 영상 gap/overlap 0
- 반복/실패 발화는 앞부분 삭제, 뒷부분 성공 발화 보존
- 독립 추임새 0
- 너무 짧거나 너무 긴 자막 없음
- 30글자 이상 자막은 최대 2줄로 줄바꿈 처리
- 영어 제품명/개발 용어는 `Claude Code`, `mvp`처럼 선호 표기로 정리
