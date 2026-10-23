---
name: clauders-lecture-pipeline
description: 클로더즈 기수제 라이브 강의 녹화본을 Google Drive에서 받아 라우드니스 정규화 → CapCut draft 생성 → (사용자가 CapCut 앱에서 자동 자막 생성) → 무음/재발화 편집 → 클로더즈 용어사전 기반 자막 퇴고까지 처리한다. 사용자가 클로더즈 강의, 줌/Meet 녹화본, 라이브 강의 편집, drive 녹화본 다운로드, 강의 자막 퇴고를 말하면 사용한다.
---

# clauders-lecture-pipeline

클로더즈(clauders.ai) 기수제 라이브 강의 녹화본 → 편집 완료된 CapCut 프로젝트.

**자막 생성은 사용자가 CapCut 앱에서 직접 한다.** 파이프라인은 그 앞뒤로 갈라진다.

```text
A단계 (자동)                    사용자                     B단계 (자동)
1 Drive 다운로드                                          5 무음/재발화 편집
2 라우드니스 정규화     →   CapCut 앱에서 자동 자막   →   6 자막 퇴고·의미단위 재분할
3 draft 생성                    생성 후 앱 종료            7 스타일 통일 + 검증
                                     ↑
                              4 check-captions.py 로 인수인계 검증
```

**각 단계의 스크립트는 실행 도구**다. 문서의 사전 레벨 측정·재전사·DP 재분할·전량 정독 게이트까지 자동으로 처리한다고 가정하지 않는다. 미구현 게이트는 별도 분석·미리보기로 검증하며 스크립트 PASS만으로 완료하지 않는다.

시작 전에 `docs/agent-rules/capcut-draft-editing-workflow.md`와 `docs/agent-rules/audio-breath-aware-silence-editing.md`를 끝까지 읽는다. 무음·재발화 판단은 `.claude/skills/capcut-silence-editing/SKILL.md`를 따른다.

## 사전 확인 (매번)

```bash
scripts/check-deps.sh
```

rclone / auto-editor / ffmpeg / capcut 존재와 **CapCut 앱 종료 여부**를 한 번에 검사한다.
- 미설치 항목이 나오면 `references/setup.md`의 1회 설치 절차를 따른다. 사용자 승인 없이 brew/pip 설치를 하지 않는다.
- CapCut이 실행 중이면 3단계 이후를 진행하지 않는다. **강제 종료하지 말고** 사용자에게 닫아달라고 요청한다.

## 작업 폴더

한 강의 = 한 작업 폴더. repo 안에 만든다.

```text
outputs/clauders-<강의슬러그>-<YYYYMMDD>/
```

중간 산출물(plan.json, XML, 프리뷰, 로그, 백업)은 전부 여기. **최종 결과물은 항상 CapCut draft root 아래**이며 `outputs/`만 만들고 완료라고 하지 않는다.

## 6단계

| 단계 | 스크립트 | 산출물 |
| --- | --- | --- |
| 1. Drive 수집 | `scripts/drive-pull.sh` | `media/<원본>.mp4` (확장자 보정 + NFC) |
| 2. 라우드니스 정규화 | `scripts/normalize.sh` | `<원본>_norm.mp4` + `loudnorm.json` |
| 3. draft 생성 | `scripts/draft-init.py` | CapCut 프로젝트 (donor 클론 + assets 내부화) |
| — | **사용자: CapCut 앱에서 자동 자막 생성** | subtitle 트랙 |
| 4. 인수인계 검증 | `scripts/check-captions.py` | `check-captions.json` / `texts-raw.json` |
| 5. 무음/재발화 편집 | `scripts/silence-edit.py` | 재패킹된 미디어 트랙 + 리타이밍된 자막 |
| 6. 자막 퇴고·재분할 | `scripts/proofmerge.py` + 어절 시각 기반 재분할·정독 | 용어 교정 초안 + DP 경계·수동 확정본 |
| 7. 스타일 통일 | `scripts/apply-caption-style.py` | 직전 프로젝트 자막 스타일 적용 |
| 검증 | `scripts/verify.py` | `report.json` / `summary.md` |

회귀 확인: `scripts/_test.sh` — 미디어 없이 도는 부분(사전 로드·치환·줄바꿈·셸 문법)만 검사한다. 스크립트를 고친 뒤 돌린다.

### 1. Drive 수집

```bash
scripts/drive-pull.sh recent 15                     # 전 폴더 최신 녹화본
scripts/drive-pull.sh list "Meet Recordings/07기 영상"
scripts/drive-pull.sh pull "<원격 파일경로>" <대상폴더>   # 다운로드 + 확장자 보정 + NFC
```

remote 이름은 `clauders`(= clauders2025@gmail.com, `drive.readonly`).

녹화본은 Zoom이 아니라 **Google Meet 자동 저장분**이고 `Meet Recordings/` 아래에 있다.

```text
Meet Recordings/<NN기 영상>/     기수별 강의·오피스아워·데모나잇
Meet Recordings/99 특강 모음/    특강
Meet Recordings/                 정리 전 최신본이 루트에 남아 있기도 하다
```

**파일명에 확장자가 없다.** Drive는 MimeType(`video/mp4`)만 들고 있어서 `*.mp4`로 필터하면 하나도 안 잡힌다 — 기본 필터는 `*Recording*`이고, 다운로드 후 `ffprobe`로 확인해 `.mp4`를 붙인다. 이름에 전각 슬래시 `／`(U+FF0F)와 콜론이 들어 있지만 rclone이 NFC로 그대로 쓰므로 문제없다. 그래도 NFC 강제와 `basename in listdir` 바이트 검증은 돌린다 — 실패하면 CapCut이 "미디어 못 찾음"을 띄운다(`docs/agent-rules/capcut-draft-editing-workflow.md` §2.5).

### 2. 라우드니스 정규화

```bash
scripts/normalize.sh <입력.mp4> [--target -16] [--out <경로>]
```

ffmpeg `loudnorm` **2-pass linear** 모드. 비디오는 `-c:v copy`(재인코딩 없음), 오디오만 AAC 재인코딩.

**linear 모드가 핵심이다.** 전체에 상수 게인을 적용해 상대 다이내믹을 보존한다. auto-editor `-28dB`는 절대 dBFS가 아니라 **파일 피크 기준**이다. 같은 LUFS로 맞춰도 피크/발화 비가 달라 회차 간 컷 강도는 보장되지 않는다. ffmpeg가 클리핑 때문에 dynamic으로 폴백하면 경고를 확인하고 target을 낮춰 재시도한다.

정규화는 무음편집 전에 하고, **실제로 편집할 정규화본**에서 임계별 추가 삭제 구간의 30ms 음성대역 RMS 최대값을 전수 측정한다. `-28dB` 자동 적용은 금지한다(5단계).

### 3. draft 생성

```bash
scripts/draft-init.py --media <정규화본.mp4> --name <프로젝트명> --donor <기존프로젝트명> [--apply]
```

**빈 템플릿으로 만들지 않는다.** `capcut init`의 최소 `_init` 템플릿으로 만든 draft는 앱 목록/열기 단계에서 실패한다(워크플로 §2.1). 정상 동작하는 기존 프로젝트를 donor로 클론하고 미디어·트랙·메타만 교체한다.

donor가 함께 넘겨주는 것: 스키마 버전, `extra_material_refs` 구성, 그리고 **자막 스타일 reference**(워크플로 §5 — 기본 스타일 그대로 완료 보고 금지). donor 미지정 시 `root_meta_info.json`의 `all_draft_store[]`에서 현재 프로젝트 직전 정상 프로젝트를 고른다.

스크립트가 처리하는 것: `assets/video/` 내부화(TCC), 6개 경로 위치 전부 절대경로 통일, `local_material_id` ↔ `draft_meta_info` 등록, `root_meta_info.json` 등록, NFC 바이트 검증(`basename in listdir`).

이 스크립트는 단일 미디어 경로다. 캠+화면녹화는 `.claude/skills/capcut-hyperframes-recut/references/two-source-recut.md`로 분기한다. 오디오 상호상관 오프셋에 컨테이너 audio `start_time` 차이를 더하고, 앱의 1프레임 미만 스냅은 정상으로 본다. 얼굴 PiP는 캠 별도 크롭 클립 + CapCut 원형 마스크이며 마스크는 레포 빌드 `node dist/index.js`로 건다(전역 `capcut` 옛 버전은 정사각 소재에 타원을 만든다). 슬라이드는 폭 채움+상단 크롭, 코딩·데스크톱·브라우저 조작은 contain·가로 정중앙·메인 캠 alpha 0(Dock 보이면 Dock 높이만큼 밀어내 확대)·얼굴 원 우하단 유지다. 전환 프레임은 장면으로 확인해 3트랙 lockstep 분할하고 전/후 합성 프레임을 먼저 확인한다.

### 사용자 작업 — CapCut 앱에서 자동 자막

3단계가 끝나면 **여기서 멈추고** 사용자에게 넘긴다.

1. CapCut을 열고 3단계에서 만든 프로젝트를 연다
2. 자동 자막(음성 인식, 한국어)을 생성한다
3. **앱을 완전히 종료한다** — 열려 있으면 이후 편집이 앱의 메모리 상태로 덮어써져 유실된다

> **순서를 지킨다: draft 생성 → 그다음 앱 실행.** CapCut은 프로젝트 목록(`root_meta_info.json`)을 **실행 시점에 한 번만** 읽는다. 앱이 이미 떠 있는 상태에서 `draft-init.py`를 돌리면 새 프로젝트가 목록에 안 보이고, 더 나쁘게는 **앱이 종료하면서 메모리에 들고 있던 옛 목록으로 `root_meta_info.json`을 덮어써 등록이 지워진다.**
>
> 과거 앱 실행 중 생성된 draft를 복구하는 경우에만 종료 후 등록이 살아 있는지 확인하고 필요하면 복구한다. 이 기록을 실행 중 쓰기 허용으로 해석하지 않는다. 그래서 `draft-init.py`는 `root_meta_info.json`을 고치기 전에 `root_meta_info.json.bak_clauders_<타임스탬프>`를 남긴다.
>
> ```bash
> jq -r '[.all_draft_store[]|select(.draft_name=="<프로젝트명>")]|length' \
>   ~/Movies/CapCut/User\ Data/Projects/com.lveditor.draft/root_meta_info.json   # 1 이어야 한다
> ```

**초기 자막은 CapCut 앱 자동 자막으로 만든다.** 컷 거부권·재발화 경계 실측·미리보기 join 검증에는 whisper 재전사를 사용한다. 초기 자막 생성과 편집 검증을 혼동해 음성 인식을 전면 금지하지 않는다.

원본 MP4에 자막 스트림이 있어도(Google Meet은 `mov_text`를 넣는다) 대개 못 쓴다 — Meet 자동자막은 **4초 고정 격자 타이밍**이라 실제 발화 경계가 아니고, 5단계 리타이밍과 6단계 gap 병합이 전부 무의미해진다. 화자 라벨이 있어 재발화 판정의 문맥 자료로는 쓸모가 있으므로 참고용으로만 뽑는다.

```bash
ffmpeg -hide_banner -y -i <원본.mp4> -map 0:s:0 <작업폴더>/source-captions.srt
```

### 4. 인수인계 검증

```bash
scripts/check-captions.py <프로젝트> --work <작업폴더>     # exit 0 = READY
```

**이걸 건너뛰지 않는다.** 자막 생성은 앱이 하고, 앱은 프로젝트를 열고 저장할 때 draft를 통째로 다시 쓴다. 그때 조용히 바뀌는 것들이 있다.

- 메인 미디어 트랙을 자기 프레임 그리드로 재스냅하거나 분할한다 → 5단계의 "미편집 단일 세그먼트" 전제가 깨진다
- 겹치는 자막을 두 번째 텍스트 트랙으로 옮긴다 → 인덱스 기반 재적용이 어긋난다
- media path를 `##_draftpath_placeholder_<uuid>_##`로 되돌린다
- duration·fps를 미세하게 바꾼다

`BLOCKED`가 나오면 원인을 해결하기 전에 5단계로 넘어가지 않는다. md5 변경만으로 사용자 편집이라 단정하지 않는다. 앱의 자동 저장은 video 소재를 세그먼트 수만큼 복제하고 자막 시각을 ±1프레임 스냅할 수 있다. 구조·텍스트 diff로 자동 재작성과 실제 편집을 구분해 새 기준선을 잡고, 앱이 열려 있으면 쓰지 않는다.

### 5. 무음/재발화 편집

```bash
# 아래 사전 측정·프로파일 선택 후에만 실행
scripts/silence-edit.py <프로젝트> --work <작업폴더> --profile <검증한프로파일>  # dry-run
scripts/silence-edit.py <프로젝트> --work <작업폴더> --profile <검증한프로파일> --apply
```

auto-editor `--export premiere` XML의 `clipitem in/out`을 silence-only keep range로 쓴다. 코드 기본값 `balanced28`(`-28dB`, margin 0.06/0.08)은 **무조건 적용할 편집 기준이 아니다**. 적용 전에 임계별 추가 삭제 구간의 30ms 음성대역 RMS 최대값을 전수 측정하고 `--profile`을 고른다. 파일 피크가 고립 트랜지언트인 1021에서는 `-28dB`가 발화를 대량 삭제했다(34:36→9:25).

“숨소리·답답함 제거 / 더 강하게”는 임계 강화가 아니다. 공백·숨소리 컷은 auto-editor 공백 ∩ Silero VAD 비발화 ∩ 남길 어절∩실제 소리 밖만 허용한다. 0.3초 이상은 하나씩 재전사해 실제 단어가 있으면 거부하고, 무음 환각은 레벨·VAD로 확인한다. 쉼 ≥0.20초와 화면 조작 모션 가드를 지킨다. 주기성·centroid만으로 클립 내부를 자르지 않는다. 상세는 draft 워크플로 §3.3과 **`.claude/skills/capcut-silence-editing`**. 스크립트가 이 교집합을 구현하지 않은 경로에서는 XML 전체를 그대로 최종 적용하지 않는다.

> **이 스크립트는 무음편집의 한 경로일 뿐이다.** `capcut-silence-editing` 스킬이 상위다. 그 스킬의 "경로 선택"이 **미편집 단일 미디어 트랙 draft**로 판정했을 때만 이걸 쓴다(그 스킬 SKILL.md가 이 스크립트를 그 경로의 구현으로 지목한다).

### 5-redo. 재작업은 "최신 가편집 보존"이 우선이다

**이 스크립트는 미편집 단일 세그먼트를 전체 재생성하는 경로다.** 이미 편집된 draft에 돌리면 거부한다.

| 상황 | 해야 할 것 |
| --- | --- |
| 사용자가 CapCut에서 가편집했다 | **`capcut-silence-editing`의 표적 2차 패스로 간다.** 현재 draft를 기준선으로 고정하고 확정 컷만 뺀다. 전체 재생성 금지 — 사용자 손편집이 통째로 날아간다 |
| 남은 호흡·근접무음 신고 | 같은 스킬의 `scripts/analyze-breath.py` / `scripts/scan-near-silence.py`로 해당 지점을 분석한다. 프로파일을 통째로 바꾸지 않는다 |
| 후속 편집이 전혀 없고 threshold를 바꾸려는 것뿐 | 사전편집 백업에서 복원 후 이 스크립트를 재실행. 확정된 `RETAKE_CUT`을 반드시 다시 합성한다 |

재발화/실패 발화 제거는 별도 입력 파일로 준다.

```bash
scripts/silence-edit.py <프로젝트> --work <작업폴더> --removals removals.json
```

`removals.json`은 `{"<auto-editor clip index>": "제거 이유"}`. 자막만 지우고 오디오를 남기면 FAIL이다 — 이 파일은 **오디오 source interval을 실제로 삭제**한다. 6단계의 `EMPTY`(cue 병합용)와 혼동하지 말 것.

`retake-candidates.txt`는 보조 목록이다. 자막 전체를 읽고 재발화를 어절 인덱스로 표시한다. 읽기속도 >13자/초인 눌린 cue는 에너지 골짜기 후보마다 그 지점부터 잘라 whisper로 전사해 경계를 실측한다. `--removals`는 auto-editor clip 전체 삭제만 표현하므로 어절 일부 컷에는 그대로 쓰지 않고 표적 source trim/split 경로를 쓴다. 군말(어/음/아/응)도 오디오에서 지운다. 적용 전 미리보기를 재전사해 **모든 join 앞뒤 문장**을 읽는다. 즉흥 강의 대본은 용어·표기 근거로만 쓰고 대본 구조대로 자르지 않는다.

### 6. 자막 퇴고·의미단위 재분할

```bash
scripts/proofmerge.py --work <작업폴더>            # 프리뷰만
scripts/proofmerge.py --work <작업폴더> --apply
```

3층 구조:
1. **`assets/clauders-terms.json`** — 클로더즈 도메인 용어사전. 회차가 바뀌어도 재사용한다. 새로 확정한 교정은 여기 추가.
2. **`<작업폴더>/overrides.json`** — 이번 전사에만 있는 `OVERRIDE`(뜻을 보존한 교정)와 `EMPTY`(텍스트만 비우는 도구). 매번 새로 만든다. 실패 발화·군말 오디오 삭제를 `EMPTY`로 대체하지 않는다.
3. 군말 오디오 컷 대조 → 용어 교정 → 어절 시각 기반 DP 재분할 → 전량 정독·수동 경계 확정. `proofmerge.py`의 병합·줄바꿈은 초안이다.

이건 `capcut-silence-editing/references/manual-semantic-caption-reflow.md`의 **"일반 CapCut 자막 퇴고" 모드**다. 스크립트는 미리보기를 만들 뿐이고 **최종 의미 경계는 사람이 읽어 승인**한다. 사용자가 직접 고친 SRT를 재배치하는 건 그 문서의 다른 모드이므로 이 스크립트를 쓰지 않는다 — 두 모드를 섞지 않는다.

cue 병합만으로는 CapCut 조각 경계가 남는다. 위 참조의 어절 시각 기반 DP 재분할 후 전체 cue를 읽고 끊기/붙이기·줄 위치를 지정한다. 한 줄 15자는 **공백 포함, 영문·숫자만 0.55**다. 0803 사용자 수정 SRT의 20자 이상 허용은 그 보존 모드의 과거 사례이며 일반 CapCut 기준으로 쓰지 않는다. 긴 단일 어절은 예외로 두되 어절을 쪼개지 않는다.

고유명사·파일명은 화면녹화 프레임으로 확인한다(`goal.md`·`getdesign.md`·`Mobbin` 등). 뜻을 바꾸는 교정은 금지한다(`지향하지 않는`→`지양하지 않는`). 확신 없으면 원문을 유지하고 확인 목록을 보고한다.

**`--apply` 전에 `proofread-preview.txt`를 before→after 전체 정독**한다. 이 초안 적용 뒤 어절 시각 기반 재분할·수동 확정본을 반영하고 검증한다. 이후 `proofmerge.py --apply`를 다시 돌려 최종 경계를 덮어쓰지 않는다. 규칙과 근거는 `references/glossary.md`.

### 7. 스타일 통일

```bash
scripts/apply-caption-style.py <프로젝트> --work <작업폴더>            # dry-run
scripts/apply-caption-style.py <프로젝트> --work <작업폴더> --apply
```

앱의 자동 자막은 그 회차에 앱이 고른 기본 스타일로 들어온다. 회차마다 자막 모양이 달라지지 않게 **직전 프로젝트의 스타일을 기준으로 적용한다**(§5 "자동 생성 기본값 그대로 완료 보고 금지"). reference는 `draft-init.py`가 `draft-init.json`에 기록해 둔 donor 프로젝트다.

옮기는 것: material의 `type`(subtitle)·`font_*`·`background_*`·`border_*`·`shadow_*`·`caption_template_info`, `content.styles[0]`, 세그먼트 `clip`(특히 `transform.y` = 자막 세로 위치)과 `render_index`. **텍스트와 타이밍은 건드리지 않고** style `range`만 각 자막의 UTF-16 길이로 다시 계산한다.

흰 슬라이드가 있으면 검은 반투명 자막 박스(`background_alpha = 0.6`, `check_flag |= 16`)를 적용·확인한다. donor 복사만으로 이 값을 충족한다고 가정하지 않는다. 레이아웃·스타일 변경은 전/후 합성 프레임으로 먼저 확인한다.

## 완료 게이트

```bash
scripts/verify.py <프로젝트> --work <작업폴더>     # exit 0 = PASS
scripts/verify.py <프로젝트> --work <작업폴더> --skip-audio   # 구조 검사만
```

아래를 전부 통과해야 완료다. 하나라도 걸리면 완료 보고를 하지 않는다.

- XML 전체 keep range를 적용한 silence-only 경로는 auto-editor export와 길이 차이 ≤ 1프레임
- 교집합 표적 패스는 `기준선 keep range - 확정 컷` 및 최종 PCM == 사전 미리보기 PCM
- `final_duration == silence_only_duration - 확정 추가 컷의 합집합 길이` (재발화·군말·표적 컷 중복 제외, rounding 범위)
- video/audio target gap 0, overlap 0, `duration == 마지막 target end`
- `source.start + source.duration ≤ material.duration`
- 모든 미디어 경로 NFC 바이트 일치 (개수가 아니라 **0건**)
- `capcut lint` errors 0 (placeholder `missing-file` 오탐은 제외 — §2.5)
- **timeline mirror 전부 같은 blob** (하나만 빠져도 앱이 이전 상태로 되돌린다)
- **draft / `draft_meta_info` / `root_meta_info` duration 일치**
- 자막 **구조**: overlap 0, 3줄 0
- 자막 **타이밍**: 재분할본 cue 0.5–7초, 시작 0.3초 안 소리 없는 cue는 1.2초 안 첫 발화 onset으로 보정(끝 유지, onset 불명확은 유지·보고)
- 임계별 레벨 전수 측정·세 근거 교집합·0.3초 이상 컷 재전사·모든 join 문맥 확인 완료
- 자막 전량 정독·의도한 교정 외 어절 흐름 차이 0·군말 오디오 삭제 확인
- 경계 발화 위험 0 — join **양쪽 바깥** 15ms RMS가 **동시에** -18dB를 넘는 경우. 한쪽만 큰 건 padding 뒤 정상 speech onset일 수 있어 자동 FAIL이 아니다(참고 지표로 따로 센다)

`cut-review.json`은 peak와 RMS가 동시에 높은 구간만 보여주는 보조 목록이다. peak만 높다고 삭제 가능하다고 단정하지 않는다. 이 목록이 비어 있어도 임계별 추가 삭제 구간 전수 측정과 세 근거·재전사 게이트를 통과해야 한다. 표적 2차 패스의 peak·join 보호 게이트도 유지한다.

**0을 강제하는 것과 참고 지표를 구분한다.**

구조 오류(overlap·3줄)는 0이어야 한다. 과거 7기 강의2 자동 자막에는 0.5초 미만 98건·7초 초과 7건이 있었고 병합으로 6건·1건까지 줄였다. 당시 “원본보다 늘지 않으면 통과” 기준은 **2026-10-22 재분할 기준으로 대체됐다**. 앱 타이밍을 상한으로 삼지 않고 어절 시각·실제 발화로 재구성한다. `verify.py`의 원본 대비 PASS만으로 현재 게이트 통과를 주장하지 않는다.

`speech_clip_boundary_hits == 0`만으로 청감 품질을 주장하지 않는다. 이 검사는 큰 절단 후보만 찾고 약한 종성·비음 손상은 못 잡는다.

한 줄 15자 검사는 공백 포함·영문/숫자 0.55의 표시폭으로 한다. 단순 `len()` 초과는 별도 참고값이며 표시폭 초과를 면제하지 않는다. 길이를 맞추려고 발화 의미를 짧게 다시 쓰지 않는다.

**잔존 무음 수도 참고 지표다.** `-28dB/80ms`, `-35dB/120ms` 값을 0으로 만들려고 threshold를 올리지 않는다. 청감을 실제로 확인하지 못했으면 "청감 PASS"라고 쓰지 말고 `사용자 청감 확인 필요`로 보고한다.

작업 후 퇴고 패스 PASS/FAIL을 기록하고, 사용자 판단이 필요한 표기·경계·청감 항목은 모아서 한 번에 보고한다.

**타이밍 비교는 정수 마이크로초로 한다.** 초 단위 float로 하면 정확히 맞닿은 cue(`a_end == b_start`)가 부동소수점 오차로 겹침 오탐이 된다(1443개 중 30건 오탐 확인).

## 참조

- `references/setup.md` — rclone OAuth 1회 설치
- `references/glossary.md` — 클로더즈 용어·표기 컨벤션·퇴고 규칙
- `docs/agent-rules/capcut-draft-editing-workflow.md` — draft 편집 원본 규칙 (§2.5 NFC, §2.6 세그먼트 삽입 함정, §3 무음편집, §5 자막 스타일)
- `docs/agent-rules/audio-breath-aware-silence-editing.md` — 프로파일 선택과 실패 게이트
- `outputs/0803-silence-edit-20260803/` — 5·6단계 스크립트의 원본 구현 (오디오 전용 케이스)
