# Audio Breath-aware Silence Editing Workflow

이 문서는 `~/Desktop/음성녹음` 같은 원본 음성 파일 폴더에서 파일별 무음편집을 요청받았을 때 따르는 오디오 전용 지침이다.

CapCut draft를 직접 만들거나 수정하는 작업이 아니면 draft JSON은 쓰지 않는다. 원본 음성은 덮어쓰지 않고, 별도 결과 폴더에 편집본과 리포트를 만든다.

## 1. 기본 원칙

- 원본 파일은 절대 덮어쓰지 않는다.
- 파일별로 독립 편집본을 만든다.
- "무음편집"은 무음/저음량 구간 압축이 아니라 실제 삭제다.
- 직접 만든 dB threshold 로직을 기본값으로 쓰지 않는다. 먼저 검증된 오픈소스 도구를 사용한다.
- 사용자가 "숨소리도", "호흡도", "중간중간 숨쉬는 것도", "아까보다 강하게"라고 말하면 말 사이 흡기음·숨 고르는 소리·룸톤성 저음량 구간도 삭제 대상이다. 그래도 발음 보존을 우선하며, 호흡 제거 때문에 자음/모음 경계를 잘라서는 안 된다.
- 사용자가 특정 편집본을 괜찮다고 확인한 뒤 추가 정리를 요청하면 그 편집본이 새 기준선이다. 원본부터 다른 threshold로 전체 재생성하지 말고, 기준선에서 새로 확인한 호흡·실패 발화만 표적 제거한다.
- 사용자가 "방어적으로"라고 말하면 말소리 경계 padding을 넉넉히 둔다.
- CapCut 앱이 실행 중이면 draft 작업은 하지 않는다. 오디오 파일 생성만 하는 것은 가능하다.

## 2. 대상 파일 선택

기본 입력 폴더:

```text
~/Desktop/음성녹음
```

사용자가 "오늘 오후 4시 이후", "방금 추가된 것", "새로 생긴 파일"처럼 범위를 말하면 다음 기준으로 대상 파일을 확정한다.

- macOS `st_birthtime`와 `mtime` 중 더 늦은 시간이 기준 시각 이후인 파일
- 확장자: `.m4a`, `.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`, `.aif`, `.aiff`
- 기존 결과 폴더 안 파일은 재입력으로 쓰지 않는다.

대상 확인 예:

```bash
python3 - <<'PY'
from pathlib import Path
from datetime import datetime
base = Path.home() / "Desktop" / "음성녹음"
cutoff = datetime(2026, 6, 24, 16, 0, 0).timestamp()
exts = {".m4a", ".mp3", ".wav", ".aac", ".flac", ".ogg", ".aif", ".aiff"}
for p in sorted(base.iterdir()):
    if not p.is_file() or p.suffix.lower() not in exts:
        continue
    st = p.stat()
    birth = getattr(st, "st_birthtime", st.st_mtime)
    if max(st.st_mtime, birth) >= cutoff:
        print(p)
PY
```

상대 시각을 해석할 때는 현재 날짜와 타임존을 명시적으로 반영한다. 예: `2026-06-24 16:00:00 KST`.

## 3. 오픈소스 엔진 선택

### 3.1 기본 선택: Auto-Editor confirmed profile

일반적인 무음 제거, 숨소리/호흡 제거, 파일별 결과 생성은 `auto-editor`로 분석한다. **적용 전 임계별 추가 삭제 구간의 30ms 음성대역 RMS 최대값을 전수 측정**한다. dB는 파일 피크 기준이므로 고립 트랜지언트가 있으면 `-28dB`도 발화를 지운다. 현재 판정은 [draft workflow](capcut-draft-editing-workflow.md) §3.3을 먼저 따른다.

- 장점: silence removal 목적의 CLI, audio/video 모두 지원, margin/padding 옵션이 있음
- 핵심: `--margin`으로 말 앞뒤를 충분히 보존해 발음 뭉개짐을 줄인다.
- 2026-06-24 확인 옵션(2026-10-22부터 사전 측정 후 채택하는 비교 시작값): `auto-editor --margin 0.06s,0.08s --edit audio:-28dB`
- 이 값은 `0.3초` 정도의 숨/호흡/공백 제거에 안정적으로 동작하도록 총 margin을 `0.14초`로 둔 프로파일이다.
- 사전 측정에서 채택한 경우의 명령(다른 임계를 골랐다면 바꾼다):

```bash
auto-editor "$input" --margin 0.06s,0.08s --edit audio:-28dB -o "$output"
```

기본 출력 suffix:

```text
<원본stem>_breath03cut.m4a
```

운영 규칙:

- 0.3초 숨소리/호흡 제거 요청도 임계를 강화하지 않는다. workflow §3.3의 auto-editor 공백 ∩ Silero 비발화 ∩ 남길 어절·실제 소리 밖 교집합만 자른다. 0.3초 이상 후보는 하나씩 재전사하고 실제 단어면 거부한다. 쉼 ≥0.2초, 영상은 화면 조작 모션 가드를 적용한다. 이 요청은 단순 strict silence가 아니라 breath-aware 작업으로 간주한다.
- 0.03초 요청의 옛 초미세 모드는 §3.1.2를 보되, 현재는 위 발화 보호 게이트와 쉼 ≥0.2초가 우선한다.
- `-28dB` 편집 후에도 특정 숨소리가 남으면 프로젝트 전체 threshold를 높이지 않는다. 해당 source interval을 청취·파형 확인하고 교집합·재전사 게이트로 표적 컷한다.
- **`-24dB`/`-23dB` 전체 자동 승격은 금지한다.** 2026-07-27에 `-24dB` + 짧은 padding이 약한 종성·비음을 잘라 코맹맹이처럼 들리는 실패를 만들었다. 이 값은 사용자가 명시적으로 강한 A/B 비교본을 요청한 경우에만 쓰며 최종본으로 자동 채택하지 않는다.
- 발음이 뭉개지거나 말 중간의 작은 소리/끝음절이 삭제되면 먼저 해당 녹음에서 발음 보존이 검증된 기준선으로 복구한다. `-28dB/0.06s,0.08s`도 사전 측정 없이 복구값으로 쓰지 않는다. 그래도 손상이 의심될 때만 발음보존 비교 프로파일(하단 3.1.3)이나 Silero VAD를 만든다.
- `-28dB/80ms`, `-35dB/120ms` 잔존 수는 참고 지표로만 보고한다. 발음 보존을 해치면서까지 0개로 만들지 않는다.
- 최종 보고에서 사용 엔진과 옵션을 그대로 적는다.

### 3.1.1 2026-08-04 승인된 표적 호흡 2차 패스

기본 auto-editor 결과나 사용자가 가편집한 결과의 발음은 괜찮지만 숨소리·호흡이 일부 남았을 때 적용한다. 이 패스는 기준선을 다른 전체 threshold로 교체하는 절차가 아니다. 아래 0803 수치·clip 내부 후보·2프레임 쉼은 과거 사례다. 현재 적용은 workflow §3.3의 사전 측정·교집합·재전사·쉼 ≥0.2초가 우선한다.

0803 화자/녹음에서는 `-28dB/60ms,80ms`가 코맹맹이처럼 들렸고 `-35dB/60ms,100ms`는 너무 보수적이었다. `-30dB/60ms,100ms`가 1차 기준선으로 승인된 뒤 아래 표적 패스를 추가했다. 이 `-30dB` 값도 같은 화자·시리즈에서 사전 레벨 측정 후 비교하는 보정값이며, 다른 녹음의 전역 기본값으로 승격하지 않는다.

```bash
auto-editor "$input" --margin 0.06s,0.10s --edit audio:-30dB -o "$output"
```

1. **승인된 기준선 보존**
   - 기준선 파일의 해시·duration을 기록하고 복사본에서 작업한다.
   - CapCut draft면 현재 audio source↔target frame map을 기준선으로 저장한다.
   - 최종 keep range는 `기준선 keep range - 이번 표적 컷`이어야 한다. 이전에 삭제된 구간을 되살리지 않는다.

2. **실제 기준선 오디오 분석**
   - 기준선을 mono s16 WAV로 디코드한다.
   - **auto-editor clip/gap은 후보로만 쓴다.** 재구성한 기준선에서 XML을 만들고 workflow §3.3의 VAD·남길 어절·실제 소리와 교차 확인한다.
   - **자막 생성은 CapCut 앱이 전담한다.** 검증용 whisper는 0.3초 이상 컷 거부권·재발화 경계 실측·모든 join 앞뒤 문장 대조에 사용한다(workflow §3·§3.3). auto-editor clip은 발화 확정값이 아니라 후보이며 VAD·어절·실제 소리와 교차 확인한다.
   - 자막·대본은 문맥 보조 자료다. 자막 timing을 무음/호흡 경계로 사용하지 않는다.

3. **후보 규칙**
   - auto-editor clip 사이 non-speech gap `0.24초 이상`에서 앞 clip 뒤 `80ms`, 다음 clip 앞 `60ms`를 남기고 가운데를 호흡 후보로 잡는다.
   - 앞에서 발음이 꼬여 다시 말한 구간은 앞 실패 발화의 source interval만 별도 후보로 잡고 뒤 성공 발화를 보존한다.
   - `0.5초 이하` 짧은 고립음은 auto-editor가 speech clip으로 잡지 않았고 파형에 발화 주기성이 없을 때 후보로 잡는다. CapCut 자막은 긴 cue 안에 호흡을 포함할 수 있으므로 caption overlap만으로 후보를 제외하지 않는다.
   - **clip gap이 0이어도 큰 흡기음이 clip 안에 흡수될 수 있다.** 흡기음은 RMS가 낮은데 peak만 크다 — dB 무음 탐지와 auto-editor 가 동시에 놓치는 지점이다. 구간 RMS가 `-30dB` 이하인데 peak가 `-25dB` 이상이면 clip 내부라도 후보로 검사한다. 사용자 timecode 신고나 짧은 독립 audio segment 도 같은 신호다.
   - 사용자가 호흡이 여러 곳에 남았다고 하면 신고 timecode만 자르지 않고 짧은 독립 segment를 전수 스캔한다. 0803에서 검증한 시작값은 길이 `4–15프레임`, RMS `-32dB` 이하, peak `-18dB` 이하, spectral centroid `2500Hz` 이상, flatness `0.065` 이상이다. 인접한 `2프레임 이하`·RMS `-40dB` 이하 조각은 같은 후보로 합친다. 다른 화자/마이크에는 이 수치를 고정값으로 쓰지 않는다.
   - 사용자가 `0.03초`급 근접무음까지 줄이라고 명시하면 독립 segment `1–3프레임`, RMS `-45dB` 이하, peak `-35dB` 이하를 micro cleanup 후보로 잡는다. 인접 seed 그룹은 최대 `3프레임`, 제거 뒤 남는 quiet padding은 최소 `2프레임`이어야 한다. 이 0803 보정값은 기본 호흡 패스에 자동 승격하지 않는다.
   - 위 값은 0803 사용자 승인 사례의 시작점이다. 다른 화자·마이크에는 파형과 청취로 재검증한다.

   CapCut timecode는 `MM:SS:FF`로 해석한다. 예를 들어 30fps의 `03:20:15`는 `200.5초`다. 마지막 `15`를 소수 `0.15초`로 해석하지 않는다. 신고 지점을 현재 target→source map으로 역매핑하고 앞뒤 최소 1초의 파형·인접 segment를 확인한다.

4. **경계 게이트**
   - 새 join의 양쪽 바깥 `15ms` RMS를 측정한다.
   - 양쪽이 동시에 `-18dB`를 넘으면 speech 중간 절단 위험으로 제외한다.
   - 한쪽만 큰 speech onset은 word boundary와 `80ms/60ms` padding 근거가 있으면 허용할 수 있다.

5. **의미 보존 게이트**
   - 파형·청취와 workflow §3.3 재전사 거부권을 함께 확인한다. 무음 환각은 대역 레벨·VAD로 확인하고 실제 단어가 있는 컷은 거부한다. 군말(어/음/아/응)은 오디오에서도 삭제하고 미리보기의 모든 join 앞뒤 문장을 전량 읽는다.
   - 확정 컷마다 구간 peak 가 `-18dB`를 넘지 않는지 확인한다. 넘으면 발화를 지우는 것이므로 후보에서 뺀다. RMS 만 보면 흡기음과 약한 발화를 구분하지 못한다.
   - 수치 PASS여도 청감은 **사용자 확인 필요**로 보고한다. 확인할 지점은 모아서 한 번에 보고하고 수치만으로 청감 통과를 주장하지 않는다.
   - 전체 디코드, 최종 duration, 컷 수, 제외한 경계 위험 수, peak 초과로 뺀 후보 수를 기록한다.

0803 승인 회귀값: 기준선 `752.467초`에서 `13.267초`를 표적 제거해 `739.2초`; 호흡 gap 44개, 앞 실패 발화 그룹 24개, 발화 근거 없는 고립음 14개, 경계 위험 제외 5개. 이 숫자는 목표량이 아니라 회귀 검증 사례다.

0803 추가 회귀값: `03:20:15` 신고 지점의 target `200.600–201.033초`/source `361.500–361.933초` 13프레임 호흡은 RMS `-39.06dB`인데 peak가 `-19.45dB`였다. peak 가 커서 dB 무음 탐지가 놓쳤고 auto-editor clip 안에도 흡수됐다. join 좌우 15ms 가 `-50.72/-47.02dB`(=양쪽 다 무음)인 것을 확인한 뒤 해당 조각만 삭제했다. 따라서 **큰 호흡은 silence threshold 한 종류로만 찾지 말고, peak/RMS 괴리 + 짧은 독립 segment + 사용자 timecode 를 결합**한다.

0803 전수 스캔 회귀값: 사용자 신고 약 `04:03`의 target `243.167–243.367초` 6프레임 조각은 RMS `-45.3dB`, peak `-23.0dB`였다. 같은 짧은 독립-segment 특성을 전체 타임라인에서 검사해 11개/94프레임(`3.133초`)을 제거했고, peak `-17.12dB`인 후보 1개는 발음 보호를 위해 제외했다. 최종 strict residual은 0개였다. **호흡이 많다는 피드백에는 동일 특성 전수 스캔을 적용하되, `-18dB` peak 게이트를 넘는 후보까지 강제로 지우지 않는다.**

0803 근접무음 회귀값: `05:41:16`의 target `341.500–341.533초` 1프레임 segment는 RMS `-49.07dB`, peak `-37.15dB`였다. 명시적으로 요청된 micro cleanup에서 같은 특성 31그룹/48프레임(`1.6초`)을 제거하고 각 join에 최소 2프레임 quiet를 남겼다. 최종 `722.2초 → 720.6초`, 동일 strict seed 잔존은 0개였다.

2026-10-22 1021 추가: 기본값 `-28dB`는 **파일 피크 기준**이라 피크가 고립 트랜지언트인 녹음(1021: 피크 −4.5dBFS, 발화 대역 RMS −45~−32)에서는 발화를 대량으로 지운다(34:36 → 9:25). "숨소리 제거·더 강하게" 요청이어도 임계를 올리지 말고, auto-editor 공백 ∩ Silero VAD 비발화 ∩ 어절·소리 밖의 교집합만 자르고, 0.3초 이상 컷은 재전사로 거부권을 준다. 군말 어절은 오디오에서도 지운다. 절차는 `capcut-draft-editing-workflow.md` §3.3.

### 3.1.2 초미세 무음컷(요청: `0.03초` 단위)

2026-06-26의 요청 한정 비교 프로파일이다. 2026-10-22부터는 자동 채택하지 않고 §3.1 사전 측정·교집합·쉼 ≥0.2초를 우선한다. 짧은 margin만으로 클립 내부 발음을 자르지 않는다.

```bash
auto-editor "$input" --margin 0.015s,0.015s --edit audio:-28dB -o "$output"
```

- 초미세 모드는 총 margin이 `0.03초`라 삭제 강도가 높다.
- 0.3초급 숨소리도 더 과감하게 제거되지만, `-28dB` threshold 때문에 말 중간의 작은 발음/끝음절까지 삭제될 수 있다.
- 사용자가 “말이 중간중간 잘린다”, “발음이 뭉개진다”, “코맹맹이처럼 들린다”고 하면 이 모드를 중단하고 발음보존 프로파일로 재생성한다.

### 3.1.3 발음보존 프로파일(약한 발음 삭제 방지)

2026-06-26 확인: `audio:-28dB` 초미세 컷은 숨/무음 제거량은 좋지만, 말하는 중간에 소리가 작아지는 음절을 잘라 발음이 뭉개질 수 있다. 해당 녹음에서 검증된 기준선으로 복구한 뒤에도 증상이 의심될 때 아래 프로파일을 **비교본**으로 사용한다.

```bash
auto-editor "$input" --margin 0.06s,0.10s --edit audio:-35dB -o "$output"
```

- `-35dB`는 더 작은 말소리까지 speech로 남겨 약한 발음/끝음절 삭제를 줄인다.
- 앞/뒤 margin 합 `0.16초`로 말 경계를 조금 더 보존한다.
- 초미세 `-28dB, 0.015s/0.015s` 대비 삭제량은 줄어들고, 숨/무음이 일부 남을 수 있다. 이 tradeoff를 최종 보고에 명시한다.
- CapCut draft 재작업에서는 이전에 확정한 재촬영/실패 발화 source cut을 반드시 다시 합성한다. `-35dB` 재생성으로 앞 실패 발화를 되살리거나 결과가 사실상 원본 길이로 돌아가면 최종본으로 채택하지 않는다.
- 출력 suffix 예: `<원본stem>_speechsafe35cut.m4a`

### 3.1.4 보수적 비교 프로파일

발음 손상이 계속 의심될 때는 아래 더 보수적인 프로파일을 비교본으로 만든다. 단, 이 값은 앞/뒤 margin 합이 `0.30초`라 0.3초 호흡이 거의 삭제되지 않을 수 있다.

```bash
auto-editor "$input" --margin 0.12s,0.18s --edit audio:-35dB -o "$output"
```

### 3.2 발음 보존 우선: Silero VAD

`Silero VAD`는 숨소리·공백 교집합 컷의 필수 근거다(workflow §3.3). 단독 발음보존 비교본도 만들 수 있다. 단, 2026-06-24 테스트에서는 너무 보수적으로 잘려 최종본은 `auto-editor`를 채택했다.

- dB 기준이 아니라 speech/non-speech를 모델로 판정한다.
- keep range는 "speech segment + 넉넉한 speech padding"으로 만든다.
- 권장 시작점:
  - speech padding: 앞 `120ms`, 뒤 `180ms`
  - 최소 삭제 gap: `180ms` 이상
  - 인접 speech gap이 `250ms` 이하이면 병합
- 숨소리는 말과 분리된 non-speech gap 안에 있을 때만 삭제한다.
- 말과 겹친 숨소리는 컷이 아니라 별도 denoise/source separation 영역이므로 자동 삭제하지 않는다.

### 3.3 fallback: FFmpeg dB threshold

`auto-editor`나 `Silero VAD`를 쓸 수 없을 때만 fallback으로 쓴다. 이 방식은 약한 발음, 비음, 종성, 작은 모음 끝을 숨소리/무음으로 오인할 수 있다.

fallback을 쓰는 경우에도 검증 목표를 "저음량 0개"로 두지 않는다. 발음 보존을 위해 약한 저음량 구간 일부가 남는 것을 허용한다.

## 4. 기존 dB 프로파일은 fallback 전용

CapCut draft에 이미 import된 원본 오디오를 source range로 재패킹할 때는 출력 미디어를 교체할 필요가 없다. `auto-editor --export premiere`로 XML을 만들고 첫 audio track `clipitem`의 `in/out`을 source keep range로 사용한다. 단일 auto-editor 컷의 silence-only draft는 preview/export와 1프레임 이내로 맞춘다. 교집합 컷은 원시 XML 길이에 억지로 맞추지 않고 최종 확정 컷 계획·PCM preview·draft를 대조한다.

Premiere XML을 만들 수 없는 경우에만 `ffmpeg silencedetect` 기반 range로 재현한다. 이 fallback 결과가 auto-editor preview 길이와 1프레임 넘게 다르면 같은 편집으로 간주하지 않는다.

같은 내용을 다시 말한 구간은 무음 컷과 별도로 처리한다. 앞 실패 발화의 source interval을 오디오에서 삭제하고 뒤 성공 발화를 남긴다. 자막만 숨기는 것은 재촬영 제거가 아니다. threshold 변경으로 다시 만들 때도 이 source cut 목록을 재적용한다.

CapCut에 반영할 source/target 경계는 프로젝트 timebase 프레임에 맞춘다. 앱을 열었다 닫는 round-trip 검증은 선택사항이며 기본값은 실행하지 않는다. 사용자가 요청했거나 CapCut의 자동 스냅·재작성 문제를 진단할 때만 segment 수·caption 수·duration을 전후 비교하고, 구조·텍스트 diff로 실제 발화·keep range 손실을 검사한다. md5 변경·material 복제·자막 ±1프레임 스냅만으로 FAIL이나 사용자 편집으로 단정하지 않는다(draft workflow §1).

### 4.1 일반 방어적 무음편집

오픈소스 엔진을 사용할 수 없고, 말소리 경계 보존을 더 중시할 때만 사용한다.

- `silencedetect=noise=-35dB:d=0.12`
- 무음 경계 양쪽 `0.04초` 보존
- `-35dB / 0.12초` 잔존 무음 수를 보고하되, 발음 보존을 해치면서까지 0개를 강제하지 않는다.

### 4.2 숨소리 포함 강한 dB 프로파일

2026-06-24에는 "지금 정도가 적당"하다고 확인됐지만, 이후 직접 threshold 재현이 auto-editor 결과와 달라지고 발음이 뭉개지는 문제가 확인됐다. 따라서 이 프로파일은 Premiere XML을 만들 수 없을 때만 쓰는 fallback이다.

- `silencedetect=noise=-28dB:d=0.08`
- 사용자가 숨소리/호흡 삭제를 명시해도 auto-editor Premiere XML이 우선이다.
- 경계 padding은 auto-editor 기본 margin과 같은 앞 `0.06초`, 뒤 `0.08초`에서 시작한다. `0.025초` 고정 padding은 약한 종성·비음 손상 사례가 있어 금지한다.
- 인접 저음량 interval은 약 `0.035초` 이내면 병합
- `0.012초` 미만 keep island 삭제는 2026-06-24 옛 규칙이다. 현재는 길이만으로 삭제하지 않고 §3.1 발화 보호 게이트를 통과해야 한다.
- 출력 코덱: AAC `.m4a`, `192k`
- 검증 기준:
  - `-28dB / 0.08초` 잔존 저음량 수 보고
  - `-35dB / 0.12초` strict 잔존 무음 수 보고
  - 두 값을 0개로 강제하지 않음

주의:

- 말과 완전히 겹친 숨소리는 컷 편집만으로 분리할 수 없다.
- 위 dB 프로파일은 후보 생성용이다. 말 사이 흡기음·룸톤도 §3.1 교집합·재전사 게이트를 통과한 구간만 제거한다.
- 발음이 뭉개지면 즉시 중단하고 Auto-Editor margin 확대 또는 Silero VAD로 전환한다.

### 4.3 2026-07-27 실패 방지 게이트

다음 중 하나라도 해당하면 완료가 아니다.

- 사용자가 승인·가편집한 기준선이 있는데 원본부터 전체 threshold를 다시 적용해 기존 편집을 되살리거나 없앴다.
- 채택한 단일 auto-editor 컷의 preview/export와 silence-only draft가 1프레임 넘게 다르다. 교집합 컷은 최종 확정 계획·PCM preview와 draft가 불일치한다.
- 재작업 뒤 앞 실패 발화가 다시 살아났다.
- 반복 발화의 앞 자막만 숨기고 오디오는 남겼다.
- 저음량/strict 잔존 수 0을 만들려고 전체 threshold를 높였다.
- 표적 2차 패스의 확정 컷 구간 peak 가 `-18dB`를 넘는데도 후보에서 빼지 않았다.
- 새 표적 join의 양쪽 바깥 15ms가 동시에 `-18dB`를 넘는데 해당 컷을 제외하지 않았다.
- `speech_clip_boundary_hits == 0` 같은 수치만으로 코맹맹이·끝음절 손상까지 없다고 주장했다.
- 선택한 CapCut open → close 진단에서 구조·텍스트 diff로 실제 발화·keep range 손실이 확인됐다. 정상 material 복제·±1프레임 스냅은 별도 판정한다.

자동 검사는 큰 경계 절단 후보와 구조 오류를 찾는 용도다. 최종 렌더에서 여러 컷 경계를 실제로 청취하지 못했다면 청감 PASS라고 쓰지 말고 `사용자 청감 확인 필요`로 명시한다.

## 5. 출력 구조

결과는 입력 폴더 아래 새 폴더에 둔다.

```text
~/Desktop/음성녹음/AutoEditor_무음편집_YYYYMMDD_HHMMSS/
  <원본stem>_breath03cut.m4a
  report.json
  summary.md
  _logs/
    <원본stem>.auto_editor.log
    <원본stem>.auto_editor_preview.log
    <원본stem>.quiet_-28dB_after_reference.log
    <원본stem>.strict_-35dB_after.log
```

Silero 비교본을 만들면 다음처럼 별도 폴더에 둔다.

```text
SileroVAD_무음편집_YYYYMMDD_HHMMSS/
<원본stem>_silero_vadcut.m4a
```

## 6. 구현 요령

1. `ffprobe`로 원본 duration을 기록한다.
2. §3.1 사전 측정 후 auto-editor 옵션을 선택한다. 아래 수치는 채택 전 비교 후보이며 그대로 적용하지 않는다.
   - 2026-06-24 기본 후보: `--margin 0.06s,0.08s --edit audio:-28dB`
   - 2026-06-26 초미세 비교 후보(현재 쉼 ≥0.2초 우선): `--margin 0.015s,0.015s --edit audio:-28dB`
   - 정확한 기본 결과에서도 발음 손상이 의심될 때 비교본: `--margin 0.06s,0.10s --edit audio:-35dB`
3. 가능하면 같은 옵션으로 `--preview` 로그를 남긴다.
4. 사용자가 승인한 기준선에서 호흡만 더 정리하는 재작업이면 전체 threshold 재생성 대신 §3.1.1 표적 2차 패스를 수행한다.
5. 편집본을 `silencedetect`로 검사해 참고 지표를 만든다.
6. 전체 파일을 `ffmpeg -v error -i <out> -f null -`로 디코드 검증한다.
7. 표적 2차 패스면 기준선-최종 keep range 차이, 경계 위험 제외 수, 구간 peak `-18dB` 초과 컷 0을 검증한다.
8. 사용자가 발음 손상을 지적하면 margin을 늘린 버전 또는 Silero VAD 비교본을 만든다.

직접 concat이 필요한 경우 필터 구조:

```text
[0:a]atrim=start=<s>:end=<e>,asetpts=PTS-STARTPTS[a0];
[0:a]atrim=start=<s>:end=<e>,asetpts=PTS-STARTPTS[a1];
[a0][a1]concat=n=2:v=0:a=1,alimiter=limit=0.98[outa]
```

## 7. 검증 체크리스트

완료 전 반드시 확인한다.

- 임계별 추가 삭제 구간의 30ms 음성대역 RMS 전수 측정, 숨소리 교집합·0.3초 이상 컷 재전사·모든 join 앞뒤 정독, 군말 오디오 삭제 확인
- 대상 파일 수와 파일명이 요청 범위와 일치
- 원본 파일 미수정
- 편집본 파일이 모두 존재하고 크기가 0보다 큼
- 편집본 전부 디코드 가능
- `-35dB / 0.12초` strict 잔존 무음 수를 보고한다. 오픈소스 엔진 + margin 방식에서는 발음 보존을 위해 짧은 무음이 남을 수 있으므로 0개를 강제하지 않는다.
- 발음 보존 spot check: 각 파일 앞/중간/뒤 3개 이상 컷 지점 전후를 들어서 자음/모음이 잘리지 않았는지 확인
- breath-aware 작업이면 `-28dB / 0.08초` 잔존 저음량을 참고 수치로 보고한다. 값이 많으면 표적 검토 후보로 삼되, 수치 자체를 낮추려고 전체 threshold를 올리지 않는다.
- 승인된 기준선 위 표적 재편집이면 최종 keep range가 `기준선 - 확정 컷`과 일치
- 표적 재편집이면 새 join의 양쪽 15ms가 동시에 `-18dB`를 넘는 경계 0
- 표적 재편집 확정 컷 중 구간 peak 가 `-18dB`를 넘는 것 0
- `report.json` 생성
- `summary.md` 생성

`summary.md`에는 최소한 다음 표를 넣는다.

```markdown
| 파일 | 엔진 | 원본 | 편집 후 | 삭제 | 컷 수 | 잔존 -28dB/80ms | 잔존 -35dB/120ms | 발음 spot check |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
```

표적 2차 패스를 수행했다면 `report.json`에 `baseline_duration`, `targeted_breath_gaps`, `retake_source_cuts`, `untranscribed_short_islands`, `excluded_boundary_risks`, `meaningful_deleted_words`도 남긴다.

## 8. 최종 보고

사용자에게는 짧게 보고한다.

- 대상 범위와 파일 수
- 출력 폴더
- `summary.md`, `report.json` 경로
- 사용한 오픈소스 엔진과 옵션
- 디코드 검증 PASS/FAIL
- 잔존 저음량/무음 수. 단, 저음량/strict 무음 0개는 강제하지 않았는지 명시
- 표적 2차 패스면 기준선 → 최종 길이, 후보 종류별 컷 수, 경계 위험 제외 수, 구간 peak `-18dB` 초과 컷 0 여부
- 발음 spot check 결과
- CapCut draft를 건드렸는지 여부

예:

```text
완료했습니다.
- 대상: 2026-06-24 16:00 KST 이후 9개
- 출력 폴더: ...
- 엔진: auto-editor 29.3.1, --margin 0.06s,0.08s --edit audio:-28dB
- 검증: 디코드 PASS, 저음량/strict 무음 잔존 수는 참고 지표로 보고, 0개 강제 안 함
- 원본은 덮어쓰지 않았고 CapCut draft는 건드리지 않았습니다.
```
