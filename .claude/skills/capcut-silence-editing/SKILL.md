---
name: capcut-silence-editing
description: CapCut draft나 오디오 파일에서 무음, 숨소리, 들숨·날숨, 발음 꼬임 뒤 재발화, 반복 발화를 발음 보존 우선으로 분석·편집·검증하고 자막을 의미 단위로 수동 재배치한다. 사용자가 무음편집, 숨소리/호흡 제거, silence cut, breath-aware editing, 같은 말 반복 제거, 특정 CapCut timecode의 흡기음 제거, 자막 의미단위 줄바꿈이나 앞뒤 자막 병합을 요청할 때 사용한다. 사용자의 최신 가편집과 수동 자막을 보존하고 전체 threshold 재생성 또는 표적 2차 패스를 안전하게 선택한다.
---

# CapCut 무음·호흡 편집

발음을 자르지 않으면서 실제 오디오의 무음·호흡·실패 발화를 제거한다. CapCut draft 작업일 때만 타임라인과 자막을 함께 리타이밍한다.

## 필수 지침

작업 전에 관련 파일을 처음부터 끝까지 읽는다.

- CapCut draft: `docs/agent-rules/capcut-draft-editing-workflow.md`와 `docs/agent-rules/audio-breath-aware-silence-editing.md`
- 오디오 파일만 편집: `docs/agent-rules/audio-breath-aware-silence-editing.md`

지침과 이 스킬이 충돌하면 더 보수적인 발음 보호 규칙을 따른다.

자막을 의미 단위로 줄바꿈하거나 인접 cue로 재배치할 때는 `references/manual-semantic-caption-reflow.md`를 읽는다. 일반 CapCut 자막은 어절 시각 기반 DP로 경계를 다시 잡은 뒤 결과를 전량 읽고 끊기/붙이기를 확정한다. 사용자 수정 SRT의 cue·타임코드 보존 모드는 별도로 유지한다.

## 경로 선택

1. **미편집 원본 또는 전체 무음편집**
   - 기본 후보는 `auto-editor --margin 0.06s,0.08s --edit audio:-28dB`지만 **적용 전에** 임계별 추가 삭제 구간의 30ms 음성대역 RMS 최대값을 전수 측정해 고른다. dB는 파일 피크 기준이다. 고립 트랜지언트가 피크인 1021에서는 발화 RMS −45~−32dBFS인데 `-28dB`가 34:36을 9:25로 줄였다. 상세는 draft 워크플로 §3.3.
   - `--export premiere`의 `clipitem in/out`을 silence-only 기준선으로 사용한다. 숨소리·공백 추가 컷은 아래 세 근거·재전사·쉼 보존 게이트를 모두 적용하며 XML 공백만으로 최종 컷을 확정하지 않는다.
   - `ffmpeg silencedetect` 직접 컷은 XML을 만들 수 없을 때만 fallback으로 사용한다.
   - 클로더즈 단일 미디어 트랙 draft라면 `.claude/skills/clauders-lecture-pipeline/scripts/silence-edit.py`를 재사용한다.
   - 동일 화자·시리즈에서 사용자가 이미 승인한 `-30dB/60ms,100ms` 기준선이나 가편집본이 있으면 그 결과 자체를 새 기준선으로 보존한다. `-30dB`를 다른 녹음의 기본값으로 승격하지 않는다.
2. **사용자가 가편집했거나 현재 결과를 승인한 draft**
   - 현재 draft를 새 기준선으로 고정한다. CapCut을 열면 md5·소재 수·자막 시각이 바뀔 수 있으므로 해시만으로 사용자 편집이라 단정하지 않고 구조·텍스트 diff와 ±1프레임 스냅을 확인한다.
   - 과거 threshold 결과로 되돌리지 않는다.
   - `현재 source keep range - 확정 표적 컷`만 적용한다.
3. **특정 timecode 또는 남은 호흡 신고**
   - 신고 지점을 먼저 분석하고, 같은 특성이 여러 곳에 있다는 피드백이면 전체 타임라인을 동일 프로파일로 전수 스캔한다.
4. **오디오 파일 묶음**
   - 원본을 덮어쓰지 않는다.
   - 결과 파일, `report.json`, `summary.md`를 별도 결과 폴더에 만든다.

## 표적 2차 패스

### 1. 기준선 고정

- CapCut이 완전히 종료됐는지 확인한다. 실행 중이면 draft를 쓰지 않는다.
- 존재하는 timeline mirror를 열거하고 해시가 같은지 확인한다.
- draft root 밖에 `draft_info` mirror, `draft_meta_info.json`, `root_meta_info.json`을 백업한다.
- duration, FPS, audio/caption segment 수와 draft SHA-256을 기록한다.
- 최신 audio segment마다 target frame ↔ source frame map을 만든다.

### 2. 실제 오디오 재구성

- 원본 미디어를 mono PCM s16 WAV로 한 번 디코드한다.
- 현재 audio segment의 source range를 target 순서대로 이어 붙인다.
- 각 source/target 경계를 프로젝트 FPS frame으로 맞춘다.
- CapCut 자막 timing을 무음·호흡 탐지 근거로 사용하지 않는다.
- 번들 분석 스크립트 입력은 mono PCM s16 WAV로 고정한다. frame map은 target frame 기준 오름차순·비중첩 JSON 배열이어야 한다.

### 3. 후보 탐지

현재 기준(2026-10-22): “숨소리·답답함 제거 / 더 강하게”는 임계 강화가 아니다(사용자: "너무 강하게 라고 해버리면 분량이 다 날아가잖아"). 숨소리·공백 컷은 **auto-editor 공백 ∩ Silero VAD 비발화 ∩ 남길 어절∩실제 소리 밖**의 교집합만 허용한다. 임계는 위 사전 측정으로 고른다. 아래 0803·0905 수치는 당시 실측·후보 탐색 근거이며 이 게이트를 대체하지 않는다.

- **무음 게이트는 광대역이 아니라 음성 대역(250~3800Hz) RMS로 잰다.** 저주파 럼블이 있는 녹음은 광대역 RMS가 잡음으로 들려 있어 어떤 임계도 안 걸리고, 결과적으로 숨소리 구간이 통째로 살아남는다. 0905 실측: 문제 구간은 에너지의 **69%가 300Hz 아래**(38%는 120Hz 아래)라 광대역 `-46.9 dBFS` 였지만 음성 대역으로는 `-57.5 dBFS` 였다. 같은 필터에서 **발화는 4.7dB만 떨어지는데 이 잡음은 10.6dB 떨어진다** — 그 차이가 곧 분리도다. 구간 단위로 보면 자막 cue 사이 중앙 `-74.6` vs 어절 안 중앙 `-51.6 dBFS`.
  진단: 사용자가 "숨소리가 안 잘린다"고 하면 **먼저 대역별 에너지 비중을 본다.** 300Hz 아래가 절반을 넘으면 게이트가 잡음을 재고 있는 것이다. `highpass=f=75`(출력 마스터링용)로는 부족하다 — 탐지용 신호를 따로 만든다.
- `MM:SS:FF`의 마지막 필드는 frame이다. 30fps의 `05:28:27`은 `328.9초`다.
- 신고 target frame을 현재 source map으로 역매핑하고 앞뒤 최소 1초의 파형과 인접 segment를 본다.
- `scripts/analyze-breath.py`로 frame별 RMS, peak, ZCR, spectral centroid, flatness, periodicity를 기록한다.
- auto-editor clip 사이 gap은 앞 발화 뒤 `80ms`, 다음 발화 앞 `60ms`를 남긴 가운데만 후보로 잡는다.
- clip 안 들숨의 낮은 RMS·큰 peak·주기성·centroid·flatness는 진단용이다. 이 특성만으로 클립 내부를 자르지 않는다(1021 후보의 절반이 실제 단어였다).
- 같은 화자/녹음의 0803 전수 스캔 시작값은 독립 audio segment `4–15프레임`, RMS `-32dB` 이하, peak `-18dB` 이하, centroid `2500Hz` 이상, flatness `0.065` 이상이다. 바로 이웃한 `2프레임 이하`·RMS `-40dB` 이하 조각은 합친다.
- 사용자가 `0.03초`급 근접무음까지 줄이라고 명시하면 `scripts/scan-near-silence.py`를 별도 micro cleanup으로 사용한다. 0803 시작값은 독립 segment `1–3프레임`, RMS `-45dB` 이하, peak `-35dB` 이하이며, 인접 seed를 합친 뒤에도 최대 `3프레임`만 허용한다. 당시에는 제거 후 두 speech 사이에 최소 `2프레임` quiet를 남겼다. 현재는 명시적 micro 요청이어도 세 근거 교집합과 쉼 ≥0.20초 보존을 우선한다.
- 위 수치를 다른 화자·마이크의 전역 상수로 승격하지 않는다.
- 재발화는 자막 전체를 직접 읽고 어절 인덱스로 표시한다. 앞 실패 source interval을 오디오에서 제거하고 뒤 성공 발화를 보존한다. 읽기속도 >13자/초인 눌린 cue는 에너지 골짜기 후보마다 그 지점부터 잘라 whisper로 전사해 경계를 실측한다.
- 군말(어/음/아/응)도 문맥으로 확정해 오디오에서 지운다. 자막에서만 지우면 FAIL이다. 경계는 앞뒤 어절 사이 음성대역 최소점으로 검증한다.
- 즉흥 강의의 대본은 용어·표기 근거로만 쓴다. 대본 구조대로 강의 내용을 잘라내지 않는다.

분석 예시:

```bash
python .claude/skills/capcut-silence-editing/scripts/analyze-breath.py \
  outputs/work/baseline-current.wav \
  --timecode 05:28:27 --fps 30 --radius-frames 18 \
  --cut 328.733333:329.100000 \
  --out outputs/work/breath-analysis.json

python .claude/skills/capcut-silence-editing/scripts/scan-near-silence.py \
  outputs/work/baseline-current.wav outputs/work/baseline-frame-map.json \
  --fps 30 --preview outputs/work/near-silence-preview.wav \
  --out outputs/work/near-silence-plan.json
```

### 4. 발음 보호 게이트

- 확정 컷의 peak가 `-18dB`를 넘으면 제외한다.
- 새 join 양쪽 바깥 `15ms` RMS가 동시에 `-18dB`를 넘으면 발화 중간 절단 위험으로 제외한다.
- 다음 발화 앞 padding을 최소 `60ms`, 앞 발화 뒤 padding을 기본 `80ms` 남기되, 컷 뒤 쉼은 합계 ≥0.20초 남긴다. 화면 조작 중 공백에는 모션 가드를 적용한다(draft 워크플로 §3.3).
- 한쪽만 큰 경우는 정상 speech onset일 수 있으므로 자동 실패로 세지 않는다.
- 공백·숨소리 컷 `0.3초 이상`은 하나씩 whisper로 재전사한다. 실제 단어가 있으면 거부한다. `감사합니다`·`한글자막 by…` 등은 음성대역 레벨·VAD로 무음 환각임을 확인한 경우에만 통과한다. 음성 인식 단독으로 무음 경계를 정하지 않는다.
- **자막 어절 구간을 그대로 보호 마스크로 쓰지 않는다.** CapCut 어절 `end`는 다음 어절까지 늘어나 있어 **어절 안에도 무음이 들어 있다.** 그대로 지키면 컷이 통째로 취소된다 — 0905 실측: 컷 51개가 취소되고 길이가 **32초 늘었다.** 어절 구간 **∩ 실제로 소리가 있는 곳**(음성 대역이 임계 위인 구간)만 지킨다. 어절 커버리지 자체도 믿을 게 못 된다(타임라인의 78%만 덮고 그 '빈틈'의 RMS p90이 `-15 dBFS`).
- 수치가 통과해도 사용자 청취 전에는 청감 PASS라고 쓰지 않는다.

검증된 0803 사례: `05:28:27` 신고 지점에서 target `328.733–329.100초` 11프레임 들숨을 찾았다. RMS `-39.12dB`, peak `-22.73dB`, join 바깥 15ms RMS `-48.59/-47.82dB`였고 다음 발화 앞 `66.7ms`를 남겼다. 후보가 두 audio segment 경계를 걸쳤으므로 첫 segment tail과 다음 segment head의 source range를 각각 trim하고 전체 segment를 삭제하지 않았다.

검증된 0803 근접무음 사례: `05:41:16`의 target `341.500–341.533초` 1프레임 segment는 RMS `-49.07dB`, peak `-37.15dB`였다. 같은 micro profile을 전수 검사해 31그룹/48프레임(`1.6초`)을 제거했고, 각 join에는 최소 2프레임 quiet를 남겼다. 이 모드는 사용자가 초미세 근접무음 제거를 명시한 경우에만 켠다.

### 5. 미리보기와 적용

- 기준선 PCM에서 후보 frame만 뺀 미리보기를 먼저 만든다. 적용 전에 미리보기를 재전사해 재발화·군말을 포함한 모든 join 앞뒤 문장을 전부 읽는다.
- dry-run에서 컷 frame, source interval, 영향받는 segment, 최종 duration, 자막 수를 확인한다.
- 오디오 segment의 source range를 실제로 trim/split하고 이후 target을 당긴다.
- 자막은 같은 삭제 함수를 이용해 리타이밍한다. 자막만 숨기고 오디오를 남기지 않는다.
- 현재 존재하는 모든 timeline mirror에 같은 blob을 쓴다.
- `draft_meta_info.json`과 `root_meta_info.json`의 duration을 함께 갱신한다.

### 6. 검증

다음을 모두 확인한다.

- 최종 draft에서 재구성한 PCM이 사전 미리보기 PCM과 동일하다.
- audio gap/overlap `0/0`, 마지막 audio end와 draft duration이 같다.
- caption overlap `0`, 기존 가편집과 caption 수가 의도 없이 바뀌지 않았다.
- timeline mirror 해시가 모두 같다.
- draft/meta/root duration이 같다.
- `capcut lint` errors/warnings가 `0/0`이다. placeholder `missing-file`은 프로젝트 내부 실재 경로를 확인한 오탐만 별도 기록한다.
- 확정 컷이 반영됐고 세 근거·재전사·쉼 보존에 따라 제외한 후보가 보존됐는지 확인한다. 진단 프로파일 후보 0을 만들려고 추가로 자르지 않는다.
- `-28dB/0.08초`, `-35dB/0.12초` 잔존 수는 참고값으로만 기록한다. 0을 만들려고 발음을 자르지 않는다.
- CapCut open→close round-trip은 기본값으로 실행하지 않는다.
- 전·후 비교 샘플과 외부 백업 경로를 남기고 작업 후 퇴고 패스 PASS/FAIL을 기록한다. 레이아웃 변경이 동반되면 전/후 합성 프레임을 먼저 확인한다.
- 사용자 실제 청취가 끝나기 전에는 `사용자 청감 확인 필요`로 보고한다. 사용자 판단이 필요한 항목은 모아서 한 번에 보고한다.

## 금지

- 사용자 가편집 뒤 전체 threshold 타임라인으로 교체하지 않는다.
- `-24dB` 직접 컷이나 초미세 margin을 자동 승격하지 않는다.
- `-35dB` 비교본을 편집 없는 최종본처럼 채택하지 않는다.
- CapCut 자동자막을 speech proxy로 사용하지 않는다.
- 재녹음·실패 발화를 threshold 변경 과정에서 되살리지 않는다.
- CapCut 실행 중 draft를 쓰거나 원본 오디오를 덮어쓰지 않는다.

## 결과물

경로에 해당하는 산출물만 남긴다. 사용하지 않은 분석 단계를 맞추려고 빈 파일을 만들지 않는다.

**오디오 파일 편집:**

```text
<원본stem>_breath03cut.m4a
report.json
summary.md
_logs/
```

**CapCut 전체/표적 재편집:**

```text
baseline-state.json
baseline-frame-map.json
apply-plan.json
capcut-draft-backups/
final-structural.json
final-lint.txt
report.json
summary.md
polish-pass.md
```

특정 호흡이나 근접무음을 분석했으면 `breath-analysis.json`, `near-silence-plan.json`, `preview.wav`를 추가한다. 자막만 수동 재배치했으면 사용자 원본을 덮어쓰지 않은 별도 SRT와 보존 검증 결과를 남긴다.
