---
name: capcut-hyperframes-recut
description: CapCut 자동자막이 붙은 draft 를 받아 유튜브용 MP4 로 굽는다. 사용자와 4단계로 주고받는다 — ① 사용자가 CapCut 에서 자막 생성 ② 에이전트가 촬영본·화면녹화 싱크 + 무음/버벅임 컷 + 자막 얹은 검토본 ③ 사용자가 CapCut 에서 후편집(자막 뺀 레이어별 플랫 프로젝트를 받아서) ④ 에이전트가 자막을 다시 입혀 고품질 최종본. 드래프트에서 컷 리스트와 자막을 읽어 토킹헤드를 평탄화하고, 모션그래픽 카드를 HyperFrames 로 렌더하고, 얼굴 PiP·b-roll·오디오 마스터링을 ffmpeg 이 합성한다. 촬영본(캠)과 화면녹화를 따로 돌린 스크린캐스트를 오디오 상호상관으로 싱크 맞춰 한 편으로 묶고 무음·버벅임을 잘라내는 것도 포함한다. 사용자가 빈 화면을 채워달라, 모션그래픽 얹어달라, 카드/자막 얹은 유튜브용 완성본, hyperframes 로 영상 만들어달라, b-roll 넣어달라, 촬영본과 화면녹화 싱크 맞춰달라, 두 영상 합쳐서 가편집 해달라고 하거나, draft 는 있는데 CapCut 을 안 열고 렌더하고 싶다고 할 때 사용한다.
---

# capcut-hyperframes-recut

CapCut 앱은 **렌더에 쓰지 않는다.** 드래프트에서 컷 리스트와 자막을 읽고, 그래픽은
HyperFrames 로, 합성은 ffmpeg 이 한다. 결과물을 슬래시페이지에 올리는 건
`clauders-video-publish`.

작업 전 `docs/agent-rules/capcut-draft-editing-workflow.md` 를 끝까지 읽는다. 무음·호흡 컷이면
`docs/agent-rules/audio-breath-aware-silence-editing.md` 도 끝까지 읽고 더 보수적인 규칙을 적용한다.

## 사용자와 4단계로 주고받는다

이 스킬은 한 번에 끝나지 않는다. **누가 무엇을 넘겨받는지**가 전부다.

| | 누가 | 하는 일 | 넘기는 것 |
| --- | --- | --- | --- |
| **1** | 사용자 | CapCut 에서 소재 임포트 + **자동자막 생성** | 자막 붙은 draft |
| **2** | 에이전트 | 촬영본↔화면녹화 싱크 · 무음/버벅임 컷 · 자막 퇴고 → **검토본** | `output.mp4` (자막 포함) + 갱신된 draft |
| **3** | 사용자 | CapCut 에서 **후편집** (자막 없는 레이어별 플랫 프로젝트로) | 손으로 자른 draft |
| **4** | 에이전트 | 자막 다시 입히고 **고품질 최종본** | `final.mp4` |

각 단계에서 지킬 것:

**1 → 2 로 받을 때.** 자막 원문은 사용자가 CapCut 에서 만든 것을 쓴다. STT 로 자막을 새로
만들거나 원문을 덮어쓰지 않는다. **컷 거부권·재발화 경계 실측·join 검증·싱크 확인용 재전사는 한다.**
`capcut texts` 로 뽑아 **id 기준**으로 작업한다(사용자가 그새 손댔을 수 있다).

**2 를 넘길 때.** 검토본에는 자막을 **얹는다** — 컷이 말을 끊었는지 사용자가 봐야 한다.
동시에 후편집용 프로젝트도 같이 만들어 둔다. **레이어별 플랫 클립을 트랙당 1세그먼트로**
올린다. 단 장면별 배치가 달라지는 곳은 3트랙을 같은 프레임에서 분할한다(`references/two-source-recut.md` §8-1).
싱크는 오디오 상호상관에 컨테이너 audio start_time 차이를 반영하고, 앱의 1프레임 미만
스냅은 정상으로 본다(`references/two-source-recut.md` §1). 새 프로젝트는 기본 draft root 에
만들고 `root_meta_info.json` 에 등록한다. draft·content·meta·root 의 미디어 경로는 모두
프로젝트 내부 `assets/` 절대경로로 맞춘다. **쓰는 동안 CapCut 은 종료 상태**여야 한다.

```bash
python3 build.py editlayers gain=<N>       # edit-base / edit-screen / edit-face .mp4
# ⚠ `--no-copy-assets` 를 붙이지 마라. 소재를 프로젝트 `assets/` 로 복사하는 게 기본이고,
#   소재 허브(~/Desktop/capcut-resources)는 TCC 로 막혀 있어 CapCut 이 못 연다.
python3 scripts/make-edit-project.py --src <자막draft> --name <새이름> \
  --clip   <소재허브>/edit-base.mp4 \
  --overlay <소재허브>/edit-screen.mp4:1.0:0.0:0.0 \
  --overlay <소재허브>/edit-face.mp4:0.231481:0.833333:-0.703704 --apply
```

- 메인 트랙은 **배경색 + 오디오**다. **캠 영상을 올리지 마라** — OBS 씬이면 사각 웹캠 타일이
  같이 올라가 마스킹 안 된 얼굴이 배경에 한 번 더 깔리고 자료화면 좌우 띠로 샌다.
  얼굴은 오버레이 한 장(`edit-face` + 원형 마스크)이 전담한다. 거기서 자르면 오디오가 따라간다.
- 오버레이 배율은 **contain 기준**이다. 250×250 정사각을 ⌀250 으로 보이게 하려면
  `250/1080 = 0.2315`. 정규화 좌표는 `tx=(cx-960)/960`, `ty=(540-cy)/540` (**+y 가 위**).
- 얼굴은 CapCut 에도 **원형 마스크**를 건다 — `node dist/index.js mask <프로젝트> <세그id> circle --size 1.0`
  (레포 루트에서 빌드한 CLI 로 프로젝트 생성 **뒤에** 건다. 전역 `capcut` 은 구버전이라 정사각 소재를
  타원으로 만든다. `--size` 는 **소재 자신의 크기 기준**이라 1.0 이 클립 전체다.)
- 위 화면 오버레이의 중앙 배치는 단일 배치 예시다. 슬라이드/코딩 혼합이면 `references/two-source-recut.md` §8-1대로 구간을 나눈다.
- 자막 없는 단일 플랫 클립(`build.py editsrc`)도 필요하면 만든다 — 트림만 할 때 쓴다.
- 검토본·draft 의 수치 검증과 별개로 청감은 **사용자 확인 필요**다. 레이아웃은 전/후 합성 프레임으로
  먼저 확인하고, 불확실한 표기·청감 등 사용자 판단 항목은 모아서 한 번에 보고한다.

**자막을 넘기기 전에 싱크를 실측으로 확인한다.** CapCut 자동자막은 **구간별로** 밀린다 —
0905 실측: 250초는 멀쩡한데 144~162초만 앞쪽 +5.6초 / 뒤쪽 -3.7초로 어긋나 있었다.
징후는 **읽기 속도**다: cue 별 `글자수/지속시간` 이 **13자/초**를 넘으면 의심한다(한국어 발화는 5~7자/초).

```bash
# 타임라인 오디오 복원 → 재전사 → difflib 정렬 → 어긋난 cue만 이동
python3 resync_captions.py --to <draft> --thr 0.5          # 미리보기
```

- 기준은 **사용자가 편집한 타임라인**이다. 메인 트랙의 `source↔target` 을 그대로 이어 붙여 만든다.
- `whisper-cli` + `ggml-large-v3-turbo-q5_0.bin` 에 `--output-json-full` (275초 → 10초).
  ⚠ `-ml 1` 은 UTF-8 을 바이트로 쪼개 **JSON 이 깨진다.**
- **전사 텍스트를 자막에 덮어쓰지 않는다.** 전사는 시각을 재는 자일 뿐이다.
- 판정축은 **시작 시각**과 **"말이 끝나기 전에 자막이 사라지는가"** 둘뿐. 자막 끝이 마지막 어절보다
  늦는 건 정상이니 당기지 마라 (넣었더니 멀쩡한 cue 29개가 끌려 들어왔다).
- **whisper 는 첫 세그먼트를 0초에 붙인다.** 제안 시각에 실제로 소리가 나는지 RMS 로 확인한다.
- 눌린 cue 의 재발화 경계는 문자 비례로 확정하지 않는다. 에너지 골짜기 후보마다 그 지점부터
  잘라 재전사하고, 적용 전 미리보기의 모든 join 앞뒤 문장을 읽는다(상세 `references/two-source-recut.md` §5).

**자막 퇴고는 의미를 보존한다.** 즉흥 강의의 대본은 용어·표기 근거로만 쓰고 구조 컷에 쓰지 않는다.
고유명사·파일명은 화면녹화 프레임으로 확인하며, 확신 없으면 원문 유지 + 목록 보고한다.
`지향하지 않는 → 지양하지 않는`처럼 뜻이 반대가 되는 교정은 금지한다.
흰 슬라이드가 있으면 검은 반투명 자막 박스(alpha 0.6, `check_flag |= 16`)를 쓴다.
의미단위 재분할은 cue 병합으로 끝내지 않고 어절 시각 → DP → 전량 정독으로 확정한다.
15자는 공백 포함(영문·숫자만 0.55)이며 어절 흐름 보존·onset 보정까지 확인한다.
상세는 `docs/agent-rules/capcut-draft-editing-workflow.md` §4.

**사용자에게는 "메인 트랙에서만 자르라"고 말한다.** 나머지 트랙은 우리가 맞춘다.

**3 을 받을 때.** 사용자가 자른 **메인 트랙**의 `source_timerange ↔ target_timerange` 가
진실이다. 오버레이 트랙과 자막을 다시 놓는 근거는 그것뿐이다.

```bash
# 장면별 배치(슬라이드 폭 채움 ↔ 코딩 전체 화면)도 조각마다 유지된다 (2026-10-22 수정)
python3 scripts/reapply-captions.py --from <자막draft> --to <가편집draft> --mirror-tracks --apply
```

`--mirror-tracks` 가 오버레이 비디오 트랙을 메인과 **완전히 같은 조각**으로 다시 만든다.
(CapCut 이 세 트랙을 lockstep 으로 잘라줬으면 필요 없다 — 먼저 세 트랙의 source/target 이
같은지 본다.)
**장면별 배치도 유지된다.** 조각마다 같은 source 시각을 덮던 원래 오버레이 세그먼트를 틀로 써서
scale·transform·alpha 와 마스크를 물려받고, 마스크 등 추가 재료는 조각마다 새 id 로 복제한다
(2026-10-22 이전 버전은 첫 세그먼트만 복제해 뒤 구간의 전체 화면 배치를 잃었다). 실행 출력의
`배치 N종 유지` 가 원래 트랙의 배치 종류 수와 같은지 본다.

**3단계에서 다시 생성한 자막은 퇴고·리세그본을 매핑해 교체한다.** 사용자가 직접 고친 문구는
먼저 diff 로 확인해 보존한다. 앱 재저장만으로 사용자 교정이 생겼다고 단정하지 않는다.

**컷 경계에 걸린 cue 를 반드시 손본다.** 말은 반만 남았는데 자막은 전문이 뜬다.
`reapply-captions.py` 가 그런 cue 를 목록으로 뽑아준다. 어느 어절이 살아남았는지는
**원본 draft 백업의 `words`(어구 타임코드)를 역추적**한다. 눌린 시각은 `references/two-source-recut.md` §5의
경계 실측으로 확정하며 퍼센트로 추측하지 않는다.
0827 실측: 201개 중 24개가 경계에 걸렸고 그중 9개는 텍스트를 고쳐야 했다(1개는 삭제).

```
#63  살아남음: 실제로 구매하는 과정   잘림: 오늘 영상에서는 게임 쓰고
     → "오늘 영상에서는 겜스고에서 / 실제로 구매하는 과정"  →  "실제로 구매하는 과정"
```

컷에 통째로 들어간 cue 는 버리고, 걸친 cue 는 남은 길이로 줄인다(0.25초 미만이면 버린다).
**재실행 가능하다** — 기존 자막 트랙을 걷어내고 다시 넣으므로 여러 번 잘라도 그때마다 돌린다.

**4 로 낼 때.** 사용자 피드백(2026-08-28)으로 **다음 영상부터** 둘이 바뀐다.
`build.py` 기본값에 이미 들어가 있다. 0827 은 둘 다 적용 전(52px · 등속)으로 나갔다.

| | 값 | 구현 |
| --- | --- | --- |
| 자막 크기 | 기준 **1.5배** (52 → **78px**) | `CAP_SCALE=1.5` · 여백 `CAP_MARGIN=260` |
| 재생속도 | **1.1배** | `SPEED=1.1` |

- 78px 은 좌우 여백을 **300 → 260** 으로 줄여야 들어간다(실측 최장 줄 1361px / 박스 1400px).
  **여기서 더 키우려면 줄당 글자수(15자)를 먼저 줄인다** — 여백을 더 줄이면 우하단 얼굴 PiP 와 겹친다.
- 배속은 세 곳을 **같이** 건드려야 한다. 하나만 빠지면 자막이 밀린다:
  영상 `setpts=PTS/1.1` · 오디오 `atempo=1.1` · **자막 시각 ÷ 1.1** · `-frames:v` 도 나눈다.
  (`atempo` 는 0.5~2.0 만 받는다. 그 밖은 체인으로 건다.)

**원본 소재에서 한 번에 굽는다.** 후편집 결과를 `edit-*.mp4` 에서 다시
자르면 2세대 열화가 난다. 두 컷을 합성해 원본 시각의 keep 목록을 만든다.

```bash
python3 scripts/compose-keeps.py --rough <가편집draft> --final <후편집draft> \
        --out work/final-keeps.json          # build.py 가 이 파일이 있으면 이걸 쓴다
CAP_DRAFT=<후편집draft> python3 build.py ass mask scrim
python3 build.py head screen
python3 build.py final gain=<N>              # crf 15 / preset slow / aq-mode 3 / aac 256k
```

검토본(`crf 18 / medium`)과 구분한다 — 화면 속 작은 글자가 살아야 한다.

**자막이 맞는지 수치로 증명한다.**

```bash
python3 scripts/verify-caption-sync.py --orig <원본draft백업> \
        --keeps work/final-keeps.json --final <후편집draft>
```

원본 어절을 최종 타임라인에 투영해 그 시각 자막에 그 말이 있는지 센다. 오프셋을 흔들어
**0에서 최대**면 정렬된 것이다 (0827 실측: 0s 87.0% / ±0.2s 78% / ±1.5s 31%).
자막 점유율이 높으면(무음편집 뒤 90%+) 점유신호 상호상관은 무의미하니 이 방법을 쓴다.

**⚠ 렌더 직전에 draft 를 다시 읽어 확인한다.** 앱은 열기만 해도 md5·재료 개수·자막 시각을
다시 쓴다. md5 변경만으로 사용자 편집이라 단정하지 말고 저장 전/후 구조·텍스트 diff 를
확인해 현재 draft 를 새 기준선으로 삼는다. 앱이 열려 있으면 절대 쓰지 않는다. 과거에는
**앱이 옛 메모리 상태로 덮어써 우리 편집을 롤백**시켰다. 0827 에서 숫자 표기 수정 10건이
그렇게 사라졌다(STT 교정은 살아남았다 — 부분 롤백이라 더 눈치채기 어렵다).
잔존 패턴을 grep 해서 0인지 보고, 사용자 수정과 구분한 롤백만 **앱 종료 후 텍스트 매칭으로 재적용**한다(인덱스는 이미 어긋나 있다).

### 왜 3단계에 별도 프로젝트가 필요한가

2단계 산출 draft 는 **비디오 3트랙 × 수백 세그먼트**(캠·화면녹화·얼굴)다.
CapCut 에서 한 트랙을 트림하면 나머지 둘이 어긋난다 — 손편집이 사실상 불가능하다.

그렇다고 전부 한 클립으로 구워버리면 **자료화면을 손볼 수 없다**(0827 에서 실제로
사용자가 "자료화면 클립이 없는데 이게 맞냐"고 물었다). 그래서 **레이어는 나누되
세그먼트는 합친다** — 트랙 3개, 트랙당 1세그먼트가 기본이며 장면 배치 전환은 lockstep 분할한다.

## 핵심 결정 — 비디오를 컴포지션에 넣지 마라

HyperFrames `talking-head-recut` 스킬의 정석은 소스 영상을 `<video>` 로 마운트하는
것이다. **긴 영상에는 쓰지 않는다.** 헤드리스 크롬이 프레임마다 seek 하며 디코딩한다.

역할을 가른다:

| | 담당 | 이유 |
| --- | --- | --- |
| 카드 · 자막 | HyperFrames | 레이아웃·모션이 여기 있다 |
| 얼굴 PiP · 오디오 | ffmpeg | 정적 도형 합성은 ffmpeg 이 압도적으로 싸다 |
| b-roll | HyperFrames | 카드와 같은 좌표계라야 맞물린다 |

그래픽 레이어는 **불투명**하게 깐다(카드가 곧 배경). 알파가 필요 없으므로
`docs/hyperframes-motion-graphics.md` 가 미검증으로 남긴 "CapCut macOS 가 ProRes 4444
알파를 살리는가" 질문을 아예 우회한다.

실측(1920×1080 / 10,941 프레임 / 카드 33 + 자막 148): **렌더 112초.**
b-roll 클립 5개를 넣으면 146초.

## 파이프라인 A — 토킹헤드 + 모션그래픽 카드 (0819형)

소스가 하나(토킹헤드)고 빈 화면을 카드로 채울 때.

```
draft_info.json ──┬─ 컷 리스트 ──▶ cut_head.py ──▶ work/head.mkv
                  └─ 자막 ──────▶ captions.json ─┐        │
                                                  ▼        │
                            content.py + storyboard.json   │
                                        │                  │
                                     build.py              │
                                        ▼                  │
                               public/index.html           │
                                        │                  │
                          hyperframes render ──▶ graphics.mp4
                                                  │        │
                                           compose.sh ◀────┘
                                                  ▼
                                             output.mp4
```

```bash
python3 scripts/detect-face.py <소스> --tile --json work/face.json  # 얼굴 PiP 크롭 자동
python3 cut_head.py work            # 드래프트 컷 → work/head.mkv (~6분)
python3 prep_media.py               # (b-roll 쓸 때만) 소재 스테이징
python3 build.py                    # → public/index.html
cd public && npx hyperframes@0.8.14 check .          # ⚠ 반드시. 아래 함정들을 여기서 잡는다
PRODUCER_BROWSER_GPU_MODE=hardware npx hyperframes@0.8.14 render . \
  --skill=talking-head-recut -o ../graphics.mp4 --fps 30 --crf 16
cd .. && GFX=graphics.mp4 ./compose.sh work output.mp4
```

## 파이프라인 B — 캠 + 화면녹화 (0827형)

소스가 둘이고 자료화면이 주인공일 때. 카드·HyperFrames 없이 ffmpeg 만으로 끝난다
(자막은 libass). 상세는 `references/two-source-recut.md`. 요약만:

```bash
python3 scripts/sync-offset.py <캠> <화면녹화>          # 오디오 상호상관으로 오프셋
python3 scripts/detect-face.py <캠> --tile --json work/face.json   # 얼굴 PiP 크롭 자동
python3 scripts/scan-credentials.py <화면녹화> --pattern '<정규식>'  # 노출 목록(가리진 않는다)
```

- **싱크는 오디오로 잰다.** 파일명·`creation_time` 은 초 단위라 못 쓴다. 같은 오디오
  클럭이면 900초 드리프트가 0ms 다(0827 실측). 컨테이너 audio start_time 차이도 더한다(`references/two-source-recut.md` §1).
- **컷은 캠 프레임 인덱스로 잡고** 화면녹화는 `-itsoffset` 으로 얹은 뒤 같은 select 식을
  먹인다. `-ss` 를 `-i` 앞에 두면 반대로 당겨진다.
- **무음편집 threshold 는 먼저 고른다.** auto-editor 의 dB 는 파일 피크 상대값이라
  저레벨 녹음에 `-28dB` 를 쓰면 삭제 구간의 절반에 발화가 들어간다(0827 실측 49%).
  기본값 적용 전 임계별 **추가 삭제 구간의 30ms 음성대역 RMS 최대값을 전수 측정**한다.
  "더 강하게"도 임계 강화가 아니다. auto-editor 공백 ∩ Silero 비발화 ∩ 남길 어절∩소리 밖만 자르고
  0.3s+ 컷 재전사 거부권·쉼 ≥0.2s 를 지킨다(상세 `references/two-source-recut.md` §3).
- **스크린캐스트에는 화면 모션 가드**를 얹는다. 안 그러면 조작 장면이 통째로 날아간다.
- **버벅임·군말(어/음/아/응)은 자막만 고치면 안 된다.** 오디오도 잘라야 한다(지침의 실패 조건).

```bash
# two-source-recut.md §5·§5b의 전량 정독·경계 실측·미리보기 join 검증 뒤 적용
python3 retake_pass.py --apply                # 실패 발화 제거 (자막 없어도 한다)
python3 build.py head screen ass mask scrim   # 컷본 + 자막 + 마스크
python3 build.py compose gain=<N>             # 검토본 (2단계)
python3 build.py editsrc gain=<N>             # 자막 없는 편집용 클립 (3단계로 넘길 것)
python3 build.py final   gain=<N>             # 고품질 최종본 (4단계)
```

## 파이프라인 A+B — 화면녹화의 **정지 구간만** 카드로 덮는다 (0905형)

B 로 묶었는데 자료화면이 대부분 정지해 있을 때. 0905 실측: 화면이 안 움직이는 시간이
361.7s / 394.5s(92%)였다. 그렇다고 전부 덮으면 안 된다.

**정지 ≠ 덮어도 되는 구간이다.** 판정 기준은 움직임이 아니라 **그 화면이 증거인가**다.
0905 에서 정지 구간 중 카드로 덮은 건 72% 뿐이고, 봇이 실제로 답하는 데모(0:49 이전)와
지식DB JSON 실물을 띄운 구간(3:30–4:30)은 정지해 있어도 남겼다. 그게 "직접 해봤다" 의 증명이다.

```bash
cd gfx && python3 build_gfx.py && npx hyperframes@0.8.14 check .
PRODUCER_BROWSER_GPU_MODE=hardware npx hyperframes@0.8.14 render . \
  --skill=talking-head-recut -o ../graphics.mp4 --fps 30 --crf 16
cd .. && python3 build.py compose gain=<N>      # card-windows.json 이 있으면 자동으로 얹는다
```

**합성 순서가 전부다.** 카드는 불투명이라 알파가 필요 없지만, 순서를 틀리면 조용히 망가진다:

```
screen ─▶ bg ─▶ [배속] ─▶ + graphics(enable='between(t,…)') ─▶ + 얼굴PiP ─▶ out
                                                                ↑ 얼굴은 따로 배속을 먹인다
```

- 그래픽은 **출력 타임라인**(배속 후) 기준으로 만든다 → 배속을 **먼저** 먹인 뒤 얹는다.
- **얼굴을 카드보다 먼저 얹으면 카드가 얼굴을 덮는다.** 얼굴만 배속을 따로 먹여 마지막에 얹는다.
- 카드가 없는 구간은 `enable` 로 overlay 자체를 안 건다 → 밑의 화면녹화가 그대로 보인다.

**카피의 근거는 STT 로 만든다.** 자막 트랙이 없으면 화자가 뭘 말했는지 알 수 없고, 대본을
근거로 카드를 쓰면 안 된다(그대로 읽지 않는다). 자막을 만들려는 게 아니라 **카피를 검증**하려는
것이므로 자막 원문을 STT 로 대체하지 않는 규칙과 충돌하지 않는다 — 자막은 여전히 사용자가 만든다.

> ⚠ **whisper large-v3 는 긴 파일에서 같은 문장을 무한 반복하는 구간이 생긴다.** 0905 실측:
> 4:05 부터 끝까지 한 문장이 40번 반복됐다. **80초 청크 + 10초 오버랩**으로 다시 돌리면 깨진다.
> 청크 쪽도 다른 자리에서 루프가 날 수 있으니 **정상인 구간끼리 이어 붙인다.**
> 말은 하는데 단어가 안 잡히면 루프가 아니라 조용한 발화다 — 0.5초 RMS 를 먼저 본다.

**CapCut 에서 카드는 다중 세그먼트로 올린다.** `make-edit-project.py --overlay-seq <manifest>` —
`{path, scale, tx, ty, z, segments:[[start,dur],…]}` (초, source==target). 카드 한 장 = 세그먼트
한 개라 잘못 물린 카드만 밀 수 있다. **화면녹화·얼굴은 기본 1세그먼트**지만 장면별 배치
전환은 메인과 같은 프레임에서 lockstep 분할한다(`references/two-source-recut.md` §8-1). 트랙 상하는 선언 순서가 아니라 `z` 가 정한다 — 얼굴 z 를 카드보다 크게 준다.

## 레이아웃 A (1920×1080 3구역 — 카드형)

| 구역 | 영역 | 그리는 주체 |
| --- | --- | --- |
| 콘텐츠 | `96,80 → 1824,676` | HyperFrames (카드) |
| 자막 | `96,~870 → 1456,1024` | HyperFrames |
| 얼굴 | `1504,664 → 1864,1024` ⌀360 원형 | ffmpeg |

그래픽 레이어에는 얼굴 자리에 `.pipwell`(원 + 링 + 그림자)만 그려두고 ffmpeg 이
원형 alpha 마스크로 오려 얹는다. 마스크는 **4배로 그린 뒤 축소**해야 가장자리가
계단으로 남지 않는다.

## 반드시 지킬 것

**카드는 타임라인을 빈틈없이 덮는다.** 카드가 곧 배경이라 틈이 나면 검정이 보인다.
`build.py` 가 커버리지 갭을 출력하니 `none` 인지 본다.

**사용자 자막의 문구는 보존하되 시각은 실측한다.** cue 끝 보호는 보수적 가드이며,
무음 판정은 실제 오디오의 세 근거 교집합으로 한다(`references/two-source-recut.md` §3).
카드 앵커를 자막 **문구**로 고정하고(카드가 빠른 느낌), 컷에 걸린 cue 는 `words` 로 텍스트까지
고친다. 절차·실측은 `references/two-source-recut.md` §5c.

**실패 발화(버벅임·재발화)를 남기지 마라.** 앞의 끊긴 테이크를 **오디오에서 지우고** 뒤의
성공 테이크를 살린다(`capcut-silence-editing` 의 명시 요구). **자막이 없어도 건너뛰지 않는다** —
카드 카피용 STT 의 단어 타임코드는 후보 근거다. 경계 실측·join 검증 절차는 `references/two-source-recut.md` §5b.
0905 실측: 10건 제거로 394.5s → 359.6s.

**사용자가 CapCut 에서 편집을 시작했으면 프로젝트를 재생성하지 마라.** 앱이 세그먼트를 쪼개
놓았다는 이유만으로 판별하지 않는다. 앱 재저장도 재료 복제·시각 스냅을 일으키므로
구조·텍스트·source/target diff 로 확인하고 현재 draft 를 기준선으로 **제자리 수정**한다 —
자막 크기는 `content.styles[*].size` 와 `font_size` 를 둘 다, 소재는 **같은 길이·해상도**로
다시 구워 `assets/` 를 덮어쓴다. 상세는 `references/two-source-recut.md` §8b.

**얼굴 배치는 채널 공통 약속이다 — 편마다 바꾸지 않는다.** 얼굴은 **우하단 원형**(CapCut 쪽도 마스크를 건다)
(⌀250 중심 (1760,920) / 카드형은 ⌀360). 자료화면은 **장면별 배치**다. 코딩·데스크톱·브라우저 조작 구간은 화면 전체(contain, **가로 정중앙**, 메인 캠 alpha 0, Dock 이 보이면 Dock 높이만큼 밀어내 확대)로 낸다 —
폭 채움 + 상단 크롭은 슬라이드 구간에서만. 메뉴바·앱 메뉴가 잘리면 조작을 따라갈 수 없다(1021, `references/two-source-recut.md` §8-1). 이 소재에서 얼굴이 뭘 가린다는 이유로 옮기지 마라 — 겹침은 자료화면 쪽을
조정해서 푼다. 0905 에서 좌하단으로 냈다가 되돌렸다(`references/two-source-recut.md` §8).

**카드 글자에 바닥값을 둔다 — 1080p 에서 46px 미만을 만들지 마라.** 상단 헤더(kicker·섹션 라벨)를
"라벨이니까 작게" 로 잡으면 모바일에서 안 읽힌다. 0905 에서 24px 로 냈다가 사용자가 **두 번**
지적했고(34px 로 올린 뒤에도), 결국 **46px 바닥 + 전체 스케일업**으로 끝났다.

작은 글자를 가장 많이 올리는 비율로 잡는다 — `<60px ×1.35(바닥 46)` · `60~110px ×1.18` ·
`>110px ×1.10`. 균일 배율은 큰 글자만 커지고 정작 문제인 작은 글자는 덜 커진다.

**카피는 자막 트랙에 실제로 있는 말만.** 화자가 하지 않은 주장을 카드에 쓰지 않는다.
b-roll 도 같다 — 어느 프로젝트가 누구 것인지 모르면 아무 썸네일이나 얹지 않는다.
영상이 거짓말을 한다.

**드리프트는 누적 위치로 막는다.** 세그먼트 프레임 수 =
`round(t_end×30) − round(t_start×30)`, 샘플 수도 같은 방식. 세그먼트별로 반올림하면
186컷 누적으로 A/V 가 수백 ms 어긋난다.

**폰트는 Pretendard 를 직접 박는다.** HyperFrames 번들 폰트는 latin 전용이다.
시스템 한글 폰트를 `local()` 로 선언하면 lint 는 통과해도 헤드리스에서 로드가 실패한다.
`cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/`.

**한글은 `word-break: keep-all`.** 기본값은 아무 데서나 끊어서 좁은 칼럼에서
`설계했습니 / 다` 가 나온다.

**`npx hyperframes check` 를 건너뛰지 않는다.** 아래 함정 중 셋(`media_missing_id`,
`content_overlap`, `gsap_exit_missing_hard_kill`)은 눈으로 안 보이거나 렌더를 다
돌린 뒤에야 드러난다. check 가 공짜로 잡아준다.

## 함정

전부 실측이다. 상세는 `references/pitfalls.md`.

| 증상 | 원인 | 처방 |
| --- | --- | --- |
| ffmpeg 인코드가 안 끝난다 | 마스크를 `-loop 1 -i` 로 넣음 | `-loop 1` 제거 |
| 마지막 프레임 1개가 없다 | `overlay=...:shortest=1` | 빼고 `-frames:v N` 으로 길이 보증 |
| b-roll 이 정지 화면 | `<video>` 에 `id` 없음 | `id` 부여 (check 가 에러로 잡음) |
| 제목이 헤더와 겹침 | 미디어 카드 텍스트 폭 절반 | `.card.has-media` 타입 스케일 별도 |
| seek 하면 텍스트가 사라진 채 | 페이드 뒤 하드킬 없음 | `tl.set` 을 페이드 끝에 |
| 강조색이 전부 죽음 | 토큰 rename 후 `var(--a)` 가 옛 이름 | 매핑 테이블 한 곳으로 |
| CapCut 이 편집을 롤백 | draft 미러 6개 중 일부만 씀 / 앱이 열려 있었다 | 전부 쓴다 · 렌더 직전 재확인 |
| **모든 클립이 "리소스를 찾을 수 없음"** | 소재가 `~/Desktop`·`~/Documents`·`~/Downloads` — macOS TCC 가 샌드박스 CapCut 을 막는다 | `--no-copy-assets` 를 **빼서** 프로젝트 `assets/` 로 복사한다 (기본값). 스크립트가 이제 거부한다 |
| 열어보니 materials 가 세그먼트 수만큼 불어 있다 | **CapCut 의 정상 재저장**으로도 생긴다 | md5·재료 수만으로 사용자 편집 판정/재생성 금지. 구조·텍스트 diff 후 현재 draft 를 기준선으로 |
| lint 가 missing-file 수십 개 | 소재가 프로젝트 내부라 `##_draftpath_placeholder_` 표기 | 오탐이다. placeholder 를 펼쳐 실재를 직접 본다 |
| 오디오만 안 잘린다 | `aselect` 가 프레임을 안 버림 | `atrim`+`concat` 으로 |
| **무음편집이 거의 안 먹거나 발화가 날아간다** | 고립 트랜지언트·파일 피크 상대 임계 오해 | 임계별 추가 삭제 구간 **30ms 음성대역 RMS 최대값 전수 측정** + `references/two-source-recut.md` §3 교집합. -35dB 수렴은 과거 사례 |
| 정사각 얼굴이 타원이다 | 전역 `capcut` 구버전의 캔버스 기준 마스크 | 레포에서 빌드한 `node dist/index.js mask` 사용(`references/two-source-recut.md` §9) |
| 오디오 길이가 정확히 1/6 | `atrim` 은 네이티브 샘플레이트 기준 | 48k 인덱스로 준다 |
| 리미터를 걸어도 TP 가 0dB | `alimiter` 의 `level` 이 기본 켜짐 | `level=disabled` |
| 화면녹화가 2×오프셋 어긋남 | `-ss` 를 `-i` 앞에 둠 | 오프셋 **부호**를 본다 — 보조가 먼저 시작했으면 `-ss`, 늦게면 `-itsoffset` |
| 화면이 77ms 늦다 (lag 이 구간마다 **일정**) | 컨테이너 `audio start_time` ≠ `video start_time`. sync-offset 은 오디오 배열 기준 | `-ss` 값에 그 차이를 더한다 |
| 보조 소스만 프레임이 몇 개 모자람 | `select='between(t,…)'` 경계 반올림 | `fps=30` 뒤 `between(n,…)` 정수 비교 |
| 인코더가 안 열린다 | 스케일 결과가 홀수 높이 | 짝수로 맞춘다 |
| 오버레이가 통째로 안 보임 | 보조 입력 첫 PTS > 메인 | `setpts=PTS-STARTPTS` |
| 세그먼트 사이 µs 틈 | target start 를 프레임마다 반올림 | duration 누적으로 |
| 배속에 영상만 안 빨라짐 | `setpts` 만 걸고 `fps` 를 안 붙임 | `setpts=PTS/N,fps=30` · `-frames:v` 도 나눈다 |
| 자막 인덱스가 통째로 밀림 | CapCut 이 재실행하며 **겹치는 cue 를 두 번째 텍스트 트랙**으로 옮김 (33ms 만 겹쳐도) | 세그먼트를 **모든 텍스트 트랙**에서 걷어 시간순으로 세운다. 겹침이 사라지면 트랙 하나로 되돌린다 |
| 자막 몇 개가 0.2초만 번쩍임 | 자동자막 타임코드가 **구간별로** 밀렸다 (0905: 앞 +5.6s / 뒤 -3.7s) | 읽기속도(자/초)로 잡고 재전사로 다시 맞춘다 — 아래 §자막 싱크 |
| "자막이 11초 비었다"고 오진 | 밀린 것과 없는 것을 안 가름 | 그 구간 음성대역 RMS 를 본다. 발화 레벨이면 밀린 것이다 |

## 마스킹은 하지 않는다

계정 ID·주문번호·로고 모자이크는 **사람이 한다.** 파이프라인이 자동으로 가리지 않는다.
대신 `scripts/scan-credentials.py` 로 **어디에 무엇이 언제 보이는지 목록만** 내서 보고한다.
사람이 그 목록을 보고 가릴 곳을 정한다.

노출 자체는 반드시 알린다 — 0827 화면녹화에는 결제 카드 전체 정보와 공유계정
credential 이 그대로 찍혀 있었고, 대본에는 "블러 처리하겠습니다" 라고만 적혀 있었다.
**대본을 근거로 안심하지 않는다.**

## b-roll

`prep_media.py` 로 스테이징한다. 자세한 건 `references/broll.md`.

- **얼굴을 뺀다.** 줌/밋 녹화본은 화면공유 + 오른쪽 웹캠 타일 레이아웃이다.
  공개 영상에 멤버 얼굴이 나가면 안 되므로 `crop=960:540:0:80` 으로 타일 열을 자른다.
  녹화본마다 레이아웃이 다를 수 있으니 **쓰기 전에 프레임을 떠서 확인한다.**
- **무음은 구조로 보장한다.** `-an` 으로 추출해 오디오 스트림 자체를 없앤다.
  볼륨 0 이 아니다. 검증은 b-roll 유무 두 컷의 **디코딩 오디오 해시 비교** —
  같으면 유입 0 이 확정된다.
- **풀프레임으로 쓸 클립은 1920×1080 으로 굽는다.** 크롭 결과가 960×540 이면
  브라우저 2배 업스케일로 화면 속 글자가 뭉갠다. lanczos 로 한 번 굽는다.
- 단일 클립 카드는 `"full": [오프셋, 지속]` 로 3~5초씩 풀프레임 전환. 포맷이
  단조로워지는 걸 막는다. 전환 중에는 `.root` 를 페이드아웃해야 컷으로 읽힌다.

## 오디오

저레벨 직녹음이 흔하다(실측 -31.94 LUFS). **컴프레서부터 물리지 마라.**
`astats` 로 크레스트와 `Peak count` 를 먼저 본다 — 피크 샘플이 몇 개뿐이면 고립된
트랜지언트 하나가 TP 를 만든 것이고, 발화 피크는 훨씬 아래다. 그때는 선형 게인 +
피크 리미터가 다이내믹을 가장 덜 깎는다.

```
highpass=f=75, volume=<+NdB>, alimiter=limit=0.841   →  -14 LUFS / -1.5 dBTP
```

`loudnorm` dynamic 은 LRA 를 눈에 띄게 깎고(5.2 → 3.5), 컴프레서를 앞에 두면 더 나빠진다.
게인 값은 `loudnorm ... print_format=json` 로 몇 번 재서 맞춘다.

**-14 LUFS 는 롱폼 기준이다. 쇼츠는 -11 LUFS** (2026-10-21, "다른 채널에 비해 너무 작다").
YouTube 는 -14 보다 큰 것만 줄이고 작은 것은 안 올린다 — 쇼츠 피드의 다른 영상은 -9~-11 이다.
쇼츠에서는 위 "컴프레서부터 물리지 마라" 가 뒤집힌다: 선형 게인으로 -14 까지 올린 **뒤에** 2단 컴프 +
리미터로 크레스트를 줄인다(리미터만으로는 -12~-13 에서 막힌다). 체인·makeup 탐색은
`docs/agent-rules/capcut-shorts-workflow.md` §5b.

**CapCut 에서 바로 export 한 파일도 같은 기준이다.** draft 에는 게인이 없어 직녹음 레벨이 그대로 나온다 —
1021 은 -34.8 LUFS 로 업로드됐다(사용자: "소리 줄이거나 그러지 말라고"). 어떤 경로로 만든 MP4 든 **업로드 전에
`ebur128` 로 재고**, 롱폼 -14 ±0.5 / 쇼츠 -11 ±0.3 에서 벗어나면 보정한 뒤 올린다. 절차:
`docs/agent-rules/capcut-draft-editing-workflow.md` §2.8. 보고에 LUFS·TP 를 숫자로 적는다.

## 디자인 시스템

openhow.io 를 쓸 때 값 출처는 `~/sideProjects/openhow/core` —
`packages/viewer/src/styles/main.css`(팔레트·타이포·`.dark`),
`packages/styles/src/foundation.css`(ink·그림자·surface). Toss 계열이고 추측한 값이 없다.

색은 돌려쓰지 않고 **의미로** 배정한다. 파랑이 대부분을 끌고 가고 초록=성과,
빨강=문제, 주황=강조. 화면의 변주는 색이 아니라 템플릿이 만든다 — 그게 이 시스템의 방식이다.

## 드래프트에 자막을 되넣을 때

`capcut add-text` 를 쓰지 않는다. CapCut 자동자막은 `type: "subtitle"` 재료라
`recognize_task_id` · `group_id` · `language` · `add_type` · `font_path` 등 90여 개
필드를 달고 있고, `add-text` 는 평범한 `type: "text"` 를 만들어 앱에서 다르게 렌더되고
자동자막 그룹에도 안 묶인다. **기존 자막 하나를 통째로 복제**하고 id · 타임레인지 ·
텍스트만 갈아끼운다 (`overlays/0819-ai-study/add_gap_captions.py`).

작업 전 `pgrep -x CapCut` 으로 앱이 꺼졌는지 확인하고(강제 종료 금지), 타임스탬프
백업을 뜨고, 기존 큐와 겹치는지 가드한다. 나머지 규칙은
`docs/agent-rules/capcut-draft-editing-workflow.md` 를 따른다.
