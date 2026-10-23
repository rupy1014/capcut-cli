# CapCut Draft Editing Workflow

이 문서는 이 repo에서 CapCut draft를 만들거나 편집할 때 반드시 읽는 실행 워크플로다. AGENTS.md에는 상세 규칙을 두지 않고 이 파일을 단일 작업 지침으로 사용한다.

쇼츠 추출 작업은 추가로 `docs/agent-rules/capcut-shorts-workflow.md`를 읽고 따른다.

## 0. 필수 원칙

- 사용자는 적극적인 편집을 선호하되 요청 범위와 발화 의미를 보존한다. 즉흥 강의의 대본은 용어·표기 근거로만 쓰고 대본 구조대로 내용을 잘라내지 않는다(사용자 수용: "내용은 전체적으로 괜찮은데").
- “무음편집”은 무음 구간 압축이 아니다. **음성 없는 구간은 timeline에서 실제로 삭제한다.**
- 사용자가 “숨소리/호흡도 없애줘”라고 하면 말 사이의 흡기음·숨 고르는 소리·룸톤성 저음량 구간도 삭제 대상이다. 단, 말과 겹친 호흡은 컷으로 분리할 수 없으므로 발음 경계를 해치지 않는 범위에서만 삭제한다.
- 같은 의미를 더듬거나 다시 말하면 **앞 실패 발화는 삭제하고 뒤 성공 발화만 보존한다.**
- 사용자가 CapCut에서 가편집·재녹음 선택·캡션 재생성을 한 뒤 재작업을 요청하면 **현재 draft가 최신 기준선**이다. 과거 자동편집본이나 사전편집 백업으로 전체를 되돌리지 말고, 현재 audio source range에서 새로 확정한 컷만 빼는 방식으로 작업한다.
- 완료 주장은 `capcut lint`만으로 하지 않는다. 무음 잔존, video gap/overlap, 자막 품질을 확인하고, CapCut 앱 표시/열림 조건은 메타데이터 정합성으로 검사한다. 실제 앱 실행 확인은 사용자 요청 시에만 한다.
- CapCut draft 작업 전후에는 이 문서 마지막의 **작업 후 퇴고 패스**를 수행한다.

## 1. 작업 전 게이트

1. **CapCut 앱 종료 확인**
   ```bash
   pgrep -x CapCut || true
   ```
   - 실행 중이면 draft 파일을 쓰지 않는다.
   - 강제 종료하지 않는다. 사용자가 닫을 때까지 기다리거나, 안전하게 중단한다.
   - 실행 중 저장하면 CapCut이 메모리의 이전 상태로 파일을 덮어써 변경이 유실될 수 있다.

2. **대상 프로젝트/생성 방식 확정**
   - 기존 프로젝트 편집: `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<프로젝트명>` 안의 `draft_info.json`을 기준으로 작업한다.
   - 새 프로젝트 생성: 최종 결과물은 반드시 CapCut 기본 draft 폴더 아래에 둔다.
     - 최종 위치: `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<표시 프로젝트명>`
     - repo 내부 `outputs/`는 분석/중간 산출물 용도로만 사용한다. **최종 CapCut 앱 확인 대상이 아니다.**

3. **백업**
   - 존재하는 모든 핵심 파일을 작업마다 백업한다.
   ```bash
   cp draft_info.json draft_info.json.bak_codex_<task>_<timestamp>
   [ -f draft_content.json ] && cp draft_content.json draft_content.json.bak_codex_<task>_<timestamp>
   [ -f draft_meta_info.json ] && cp draft_meta_info.json draft_meta_info.json.bak_codex_<task>_<timestamp>
   [ -f root_meta_info.json ] && cp root_meta_info.json root_meta_info.json.bak_codex_<task>_<timestamp>
   ```

4. **CapCut round-trip은 선택사항이며 기본 미실행**
   - draft 저장 후 CapCut을 자동으로 열었다 닫는 검증은 기본 워크플로에 포함하지 않는다.
   - 사용자가 명시적으로 요청했거나, CapCut의 자동 스냅·재작성 문제를 진단해야 할 때만 수행한다.
   - 실행한 경우에만 저장 직후와 open → close 후의 segment 수·caption 수·duration을 비교한다. 앱은 열기만 해도 md5 변경·video material의 세그먼트별 복제·자막 시각 ±1프레임 스냅을 할 수 있다. md5/mtime만으로 사용자 편집·롤백으로 단정하거나 재적용하지 말고 구조·텍스트 diff로 판정해 닫힌 뒤 현재 draft를 기준선으로 삼는다.

## 2. 새 CapCut 프로젝트 생성/등록 규칙

CapCut 앱 목록에 보이고 실제로 열리는 프로젝트를 만들려면 폴더와 JSON만 만들면 부족하다. 다음을 모두 만족해야 한다.

### 2.1 최종 폴더는 CapCut 기본 draft root 아래

```text
~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<표시 프로젝트명>/
```

필수 파일:

- `draft_info.json`
- `draft_content.json`
- `draft_meta_info.json`
- `draft_virtual_store.json`
- `draft_agency_config.json`
- `draft_biz_config.json`
- `performance_opt_info.json`

가능하면 기존 정상 CapCut 프로젝트 하나를 skeleton으로 사용하고, `tracks`, `materials`, `duration`, `canvas_config`, `id`, 메타 정보만 교체한다. CLI의 최소 `_init` 템플릿만으로 만든 draft는 앱 목록/열기 단계에서 실패할 수 있다.

### 2.2 root index 등록 필수

CapCut 목록은 폴더만 스캔하지 않는다. 다음 파일에 entry가 있어야 한다.

```text
~/Movies/CapCut/User Data/Projects/com.lveditor.draft/root_meta_info.json
```

`root_meta_info.json`의 `all_draft_store[]`에 `draft_meta_info.json`과 같은 entry를 넣는다.

필수 필드:

- `draft_id`
- `draft_name`
- `draft_fold_path`
- `draft_root_path`
- `tm_duration`
- `tm_draft_create`
- `tm_draft_modified`
- `draft_is_invisible: false`
- `draft_materials`

### 2.3 미디어 파일은 프로젝트 내부 assets로 복사하고 내부 경로만 참조

사용자 확인에서 실패한 실제 원인: draft/meta가 repo 내부 원본 MP4나 CapCut placeholder 경로를 참조해서 CapCut이 “미디어 파일을 찾을 수 없음”을 띄웠다.

새 프로젝트는 반드시 미디어를 프로젝트 내부로 복사한다.

```text
<project>/assets/video/<원본파일명>.mp4
```

그리고 다음 모든 위치를 **프로젝트 내부 asset 절대경로**로 통일한다.

- `draft_info.json`의 모든 `materials.videos[].path`
- `draft_info.json`의 모든 `materials.videos[].media_path`
- `draft_content.json`의 모든 `materials.videos[].path`
- `draft_content.json`의 모든 `materials.videos[].media_path`
- `draft_meta_info.json`의 `draft_materials[].value[].file_Path`
- `root_meta_info.json`의 해당 entry 안 `draft_materials[].value[].file_Path`

금지:

- 최종 draft에서 repo 내부 `media/...` 경로를 참조하지 않는다.
- 최종 draft에서 `##_draftpath_placeholder_..._##/assets/...`를 직접 남기지 않는다. CapCut이 나중에 다시 쓸 수는 있지만, 작업 완료 시점에는 내부 asset 절대경로로 검증한다.
- `outputs/<project>`만 만들고 완료라고 말하지 않는다.

### 2.4 draft_info와 draft_content 동기화

CapCut 프로젝트에 둘 다 있으면 둘 다 맞춘다.

```bash
cmp -s draft_content.json draft_info.json
```

둘이 구조적으로 달라야 하는 특수 케이스가 확인되지 않은 한, 작업 완료 시점에는 동일하게 둔다.

## 2.5 미디어 경로가 깨질 때 (한글 파일명 NFC/NFD)

CapCut에서 클립이 죽어 보이거나 "미디어 파일을 찾을 수 없음"이 뜨면, 파일 유실보다 **한글 파일명 유니코드 정규화 불일치**를 먼저 의심한다.

- macOS 파일시스템은 정규화를 무시하므로 `os.path.exists()`, `ls`, `ffprobe`는 전부 성공한다. 하지만 **CapCut은 경로를 바이트 그대로 매칭**한다.
- draft는 보통 **NFC**로 저장하고, 화면기록·스크린샷 파일명은 **NFD**인 경우가 많다 → 그 클립만 죽는다.
- 진단은 `exists()`가 아니라 아래로 한다.

```python
import os
def byte_ok(path):                 # False 면 CapCut 이 못 찾는다
    return os.path.basename(path) in os.listdir(os.path.dirname(path))
```

해결은 **NFC/NFC로 통일**한다.

1. 디스크 파일명을 NFC로 리네임한다. 정규화 무시 FS라 단순 `mv`는 no-op이므로 **temp 경유**가 필수다.
   ```python
   os.rename(p, p + ".__tmp__"); os.rename(p + ".__tmp__", nfc_path)
   ```
2. draft 경로를 새 경로로 치환한다. CapCut은 경로를 이스케이프 없이 쓰므로 **파일 텍스트 전체 치환**이 가장 안전하다. 아래를 **전부** 고쳐야 한다 — 하나라도 빠지면 앱에서 계속 깨져 보인다.
   - `draft_info.json`, `draft_content.json`(있으면), `template-2.tmp`
   - `Timelines/<id>/draft_info.json`, `Timelines/<id>/template-2.tmp`
   - `draft_meta_info.json`의 `draft_materials[].value[].file_Path` — **타임라인에 없는 소재도 여기 남아 있다**
   - `root_meta_info.json`
3. 검증: 모든 `materials.videos/audios/images[].path`가 `byte_ok()`를 통과하는지. 개수가 아니라 0건이어야 한다.

작업 스크립트 예시: `outputs/media-remap-20260709/{remap.py,step4_repath.py,step5_meta_media.py}`
(dry-run → `--apply`, 백업은 draft root 밖에 남긴다.)

### 소재 위치 규칙

- 소재 허브는 `~/Desktop/capcut-resources/`. 바탕화면 루트·`~/Downloads`에 흩어진 참조는 여기로 모으고 재매핑한다.
- `/var/folders/.../TemporaryItems/NSIRD_screencaptureui_*/`(스크린샷 임시본)는 재부팅 시 사라지고 macOS 권한 때문에 **에이전트가 복사할 수 없다**. 발견하면 사용자에게 직접 옮기라고 보고한다.
- `~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/`는 `listdir`이 차단된다. 파일명이 ASCII면 문제없으니 그대로 둔다.
- 미디어를 프로젝트 내부 `assets/`로 복사하는 건 **새 프로젝트 생성 시**의 규칙(2.3)이다. 기존 프로젝트 편집에는 적용하지 않는다.

### `capcut lint` 의 missing-file 오탐

`##_draftpath_placeholder_<uuid>_##/assets/...`는 CapCut이 프로젝트 내부 파일을 가리키는 정상 표기인데, `capcut lint`가 이 placeholder를 펼치지 못해 **`missing-file` 에러로 오탐**한다. placeholder 접두사를 프로젝트 폴더 경로로 치환해 실재를 직접 확인하라. lint의 missing-file 개수만 보고 "깨졌다"고 결론내지 않는다.

## 2.6 영상 세그먼트를 직접 넣을 때 (CapCut이 열자마자 망가지는 3가지)

`draft_info.json`에 video 세그먼트를 손으로 써 넣고 CapCut에서 열면, 앱이 조용히 구조를 고쳐서 작업이 무너질 수 있다. 2026-07-09 0709에서 셋 다 겪었다.

1. **메인 영상 트랙(`flag: 0`)은 gap을 허용하지 않는다.** 세그먼트를 71.9s·127.0s… 처럼 띄엄띄엄 배치해도, 앱이 열면서 전부 **왼쪽으로 당겨 붙여** 0s부터 연속으로 만든다(0709: 14개가 0~578초로 몰림).
   → b-roll처럼 **띄엄띄엄 얹는 클립은 오버레이 트랙**에 둔다. `{"type":"video", "flag": 2, "attribute": 0}` 트랙을 새로 만들고 세그먼트는 `track_render_index: 1`. 메인 트랙은 비워 둔다.
   0708도 메인 트랙의 gap 구간을 오버레이 트랙으로 덮는 구조다. 오버레이는 선행 gap(첫 세그먼트가 484초에서 시작)도 정상 유지된다.
   video 오버레이 세그먼트의 `extra_material_refs`는 **6종**(`canvases, placeholder_infos, speeds, sound_channel_mappings, material_colors, vocal_separations`).

2. **`local_material_id`를 비우면 미디어 연결이 끊긴다.** donor material을 복제하면서 `local_material_id`/`media_path`를 `""`로 지우면, 앱이 파일을 미디어 라이브러리에 연결하지 못해 **`duration`을 0으로 만들고** 클립이 "미디어 연결 끊김"이 된다(경로가 바이트까지 정확해도 그렇다).
   → donor material 객체를 **그대로 복제**하고 `id`와 `path`만 교체한다. 그리고 같은 `local_material_id`를 `draft_meta_info.json`의 `draft_materials[type=0].value[]`에 **등록**한다(`id` = `local_material_id`, `file_Path`, `metetype`(`video`/`photo`/`music`), `width`/`height`/`duration`/`roughcut_time_range`). 같은 파일을 쓰는 다른 프로젝트의 meta 엔트리를 복사하면 안전하다.

3. **`source_timerange`를 소스 끝에 딱 붙이지 마라.** 앱이 target을 프레임(30fps)에 스냅하면서 `speed`를 재계산하는데, 그때 `source.start + source.duration`이 material `duration`을 넘어간다. → 소스 뒤로 **0.1초 여유**를 두고, `source.duration == target.duration × speed`를 유지한다.

검증: `capcut lint`만으로는 이 셋을 못 잡는다. 파이썬으로 트랙 flag·gap, `local_material_id` ↔ meta `id` 정합, `source.start + source.duration ≤ material.duration`을 직접 확인한다.

### 2.7 캠 + 화면녹화 2소스 (2026-10-22, 1021)

- 오프셋은 두 오디오의 상호상관으로 실측하고 컨테이너 audio `start_time` 차이를 더한다. CapCut 프레임 스냅 `1.809 → 1.833s`처럼 1프레임 미만 변화는 정상이며 재측정 오류로 보지 않는다.
- 소재는 TCC 접근 문제를 피하도록 프로젝트 `assets/`로 복사한다(§2.3). 얼굴 PiP는 캠에서 별도 크롭한 클립 + CapCut 원형 마스크로 만든다. 마스크는 레포에서 빌드한 `dist/index.js`로 적용한다. 전역 `capcut` 옛 설치본은 정사각 소재에 타원을 만들므로 쓰지 않는다.
- 슬라이드는 폭 채움 + 상단 크롭. 코딩·데스크톱·브라우저 조작은 전체 화면(contain, 가로 정중앙, 메인 캠 alpha 0, **Dock 이 보이는 구간만** Dock 높이만큼 아래로 밀어내 확대 — 메뉴바는 유지), 얼굴 원은 우하단을 유지한다. 사용자: "윈도우는 정 중앙에 위치하자". 사용자: "10분부터는 진짜 코딩을 하기 때문에 화면 전체가 나와줘야 메뉴 이런 것도 볼 수가 있어". 10분을 상수로 쓰지 말고 화면 장면 전환 프레임에서 캠·화면·얼굴 3트랙을 같은 프레임으로 분할(lockstep)한다.
- 레이아웃 변경은 전/후 합성 프레임으로 먼저 확인한다. 상세: [two-source-recut.md](../../.claude/skills/capcut-hyperframes-recut/references/two-source-recut.md) §8-1.

### 2.8 CapCut export 본 라우드니스 게이트 (2026-10-23, 1021)

CapCut 에서 바로 export 한 MP4 는 **업로드 전에 반드시 라우드니스를 잰다.** draft 에는 게인이 없어서 직녹음 레벨이
그대로 나온다. 1021 은 **-34.8 LUFS** 로 그대로 업로드됐다(사용자: "업로드된 영상의 소리가 작은데 일부러 줄인거야?").
`build.py final` 경로는 게인이 들어가지만 CapCut export 경로에는 게인 단계가 없다.

```bash
ffmpeg -nostats -i <export>.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:"
# 롱폼 목표 -14 ±0.5 LUFS / TP ≤ -1.0 dBFS. 벗어나면 오디오만 다시 만들어 remux 한다 (영상 재인코딩 없음).
ffmpeg -i <export>.mp4 -vn -af "highpass=f=75,volume=<+N>dB,alimiter=limit=0.75:level=disabled" \
       -ar 48000 -c:a aac -b:a 256k audio.m4a        # N 은 오디오만 렌더해 2~3번 재서 맞춘다
ffmpeg -i <export>.mp4 -i audio.m4a -map 0:v -map 1:a -c copy -movflags +faststart <export>-loud14.mp4
```

- 1021 실측: 게인 +21.6dB, `limit=0.75` → **-14.4 LUFS · -1.4 dBTP · LRA 4.9** (원본 LRA 6.0). `limit=0.841` 은 TP -0.4 로 넘었다.
- **중간 WAV 를 쓰지 말고 바로 AAC 로 뽑는다.** 32분 PCM 은 ~370MB 이고, 디스크가 차면 조용히 잘린 WAV 가 남는다
  (1021: 1332s/1940s 에서 잘렸는데 ffmpeg 은 경고만 냈다). 결과물의 **duration 을 원본과 대조**한다.
- 쇼츠는 -11 LUFS (`capcut-shorts-workflow.md` §5b).
- 유튜브는 업로드 후 파일 교체가 안 된다 — 측정은 **업로드 전에** 한다. 늦게 발견하면 재업로드 + 기존 예약 취소/삭제가 필요하다.

## 3. 무음편집 워크플로

**현재 적용 순서(2026-10-22)**: §3.3 사전 레벨 측정 → 임계 선택 → 숨소리·공백은 교집합 컷·재전사 거부권 → 확정 컷 반영. 아래 `-28dB`는 비교 시작값이며 바로 적용하는 전역 기본값이 아니다. §3.1의 0803 수치·clip 내부 후보·2프레임 쉼은 과거 사례로 보존하되, 현재 판정은 §3.3(쉼 ≥0.2초 포함)이 우선한다. 단일 auto-editor 컷은 XML/preview와 1프레임 이내 일치, 교집합 컷은 최종 계획에서 재구성한 preview·확정 컷 합계와 draft를 대조한다.

1. 원본 미디어 무음 분석은 실제 원본 오디오/영상에 수행한다. 이미 가편집된 draft를 재작업할 때는 현재 audio segment의 source range를 이어 붙인 **현재 타임라인 재구성 오디오**도 함께 분석한다. CapCut 자동자막 타임라인은 무음 분석 근거로 쓰지 않는다.

2. §3.3 사전 측정 후 선택한 프로파일로 preview를 확인한다. 아래는 `-28dB` 후보 예시다(선택한 임계로 바꾼다).
   ```bash
   auto-editor "$media" --margin 0.06s,0.08s --edit audio:-28dB --preview
   ```
   - `-28dB`, 앞 `60ms`·뒤 `80ms`는 2026-06-24 확인 프로파일이다. 파일 피크가 발화 대표값인지 먼저 검사한다.
   - preview의 입력/출력 길이와 clip/cut 수를 로그에 남긴다.
   - draft에 실제 반영할 때는 아래처럼 Premiere XML을 내보내 첫 audio track의 `clipitem in/out`을 keep range로 사용한다.
   ```bash
   auto-editor "$media" \
     --margin 0.06s,0.08s \
     --edit audio:-28dB \
     --export premiere \
     --no-open \
     -o auto-editor-timeline.xml
   ```
   - XML의 `rate/timebase`로 `in/out/start/end` frame을 초로 환산한다.
   - **단일 auto-editor 컷은 silence-only draft와 preview/export가 1프레임 이내로 같아야 한다.** §3.3 교집합 컷은 최종 계획의 PCM preview와 draft를 대조한다.

3. 사용자가 “숨소리/호흡도 없애줘”, “중간중간 숨쉬는 것도 없애줘”, “더 강하게”라고 요청하면 §3.3 교집합 절차를 적용한다. 기본 임계를 먼저 적용하거나 강화하지 않는다.
   - 말 사이 흡기음·숨 고르는 소리·룸톤성 저음량 구간을 삭제 대상으로 본다.
   - 2026-07-27 실패로 **`-24dB/25ms` 자동 승격은 폐기**한다. 이 설정은 약한 끝음절과 비음을 잘라 코맹맹이처럼 들리게 만들었다.
   - 특정 호흡이 남으면 source waveform과 주변 발화를 확인하고 §3.3 교집합·재전사 게이트를 통과한 구간만 표적 컷한다. 전체 프로젝트 threshold를 올리지 않는다.
   - 기본 프로파일 자체에서도 발음 손상이 확인되면 `--margin 0.06s,0.10s --edit audio:-35dB` 또는 Silero VAD 비교본을 만든다. **비교본 채택 시에도 기존 재녹음/수동 source cut을 다시 합성한다.**

4. 현재 source range에서 삭제 interval을 제외한 keep range를 만든다. 사용자가 가편집한 draft라면 최종 source range가 `현재 기준선 source range - 이번에 확정한 삭제 interval`과 정확히 같아야 한다. 이번 작업에서 선택하지 않은 source interval을 되살리거나 없애지 않는다.

5. 반복·실패 발화는 자막이 아니라 오디오 source interval로 삭제한다.
   - 자막 전체를 처음부터 끝까지 읽고 앞 실패/뒤 성공 발화를 어절 인덱스로 표시한다. CapCut 어절 시각이 눌린 cue(읽기속도 >13자/초)는 에너지 골짜기 후보마다 그 지점부터 자른 스니펫을 whisper로 전사해 경계를 실측한다.
   - 앞 실패 발화의 target time을 현재 audio segment의 source time으로 역매핑한다.
   - 컷 경계는 auto-editor clip 경계 또는 실제 저음량 경계로 스냅하고 뒤 성공 발화를 남긴다. 적용 전 PCM 미리보기를 재전사해 모든 join 앞뒤 문장을 전량 읽는다.
   - **자막 material만 삭제하고 해당 음성이 오디오에 남아 있으면 FAIL이다.**
   - 단순 cue 병합용 `EMPTY`와 실제 오디오 삭제용 `RETAKE_CUT`을 구분한다. 병합에 흡수된 짧은 cue를 오디오에서 잘라서는 안 된다.
   - `RETAKE_CUT` 경계는 실제 저음량/auto-editor 경계로 옮긴 뒤 프로젝트 timebase(예: 30fps)에 정렬한다. 비정렬 source/target 경계는 CapCut이 앱에서 다시 스냅하면서 세그먼트·발화를 추가 삭제할 수 있다.
   - 보고서에 `reviewed_retakes`, `retake_source_cuts`, `silence_only_duration`, `final_duration`을 남긴다.

6. video/audio track을 keep range segment들로 재패킹한다.
   - `target_timerange.start`는 0부터 gap 없이 누적한다.
   - `source_timerange.start/duration`은 원본 source 구간을 유지한다.
   - video target gap/overlap은 0이어야 한다.
   - project duration은 마지막 video target end와 같아야 한다.

7. 1프레임 미만 non-silent island도 길이만으로 삭제하지 않는다. 실제 발화가 아님을 §3.3으로 확인한 경우에만 삭제한다. 이 경우 보고서에 `discarded_tiny_non_silent_count`와 총 시간을 남긴다.

### 3.1 2026-08-04 승인된 최신 가편집 위 표적 재편집

적용 조건:

- 사용자가 자동편집 뒤 CapCut에서 직접 가편집했다.
- 전체 threshold 결과의 발음은 괜찮지만 숨소리·호흡·짧은 실패 발화가 일부 남았다.
- 사용자가 캡션을 다시 생성했지만 자막 싱크가 실제 발화와 맞지 않는다.

이 경우 전체 프로젝트를 다른 threshold로 다시 만들지 않는다. **현재 가편집을 고정한 뒤 표적 2차 컷만 추가**한다.

0803 화자/녹음의 비교 이력은 `-28dB/60ms,80ms` 전체 컷에서 코맹맹이 체감이 있었고, `-35dB/60ms,100ms` 전체 컷은 호흡·편집량이 너무 많이 남았다. 그 사이인 `-30dB/60ms,100ms`가 넓은 1차 무음컷 기준선으로 승인된 뒤 사용자 가편집과 아래 표적 패스를 더했다. **`-30dB`는 이 화자/시리즈의 승인 보정값이지 전역 기본값이 아니다.** 다른 녹음에는 §3.3 사전 측정부터 수행한다.

1. **최신 기준선 고정**
   - 4개 timeline mirror 해시, duration, audio/caption segment 수를 기록한다.
   - 현재 audio segment마다 source frame ↔ target frame map을 만든다.
   - 사용자 가편집 이후의 최신 draft를 draft root 밖에 백업한다.
   - 과거 `-28dB`·`-30dB`·`-35dB` 전체 타임라인으로 교체하지 않는다.

2. **현재 오디오를 실제로 재구성**
   - 원본을 mono s16 WAV로 한 번 디코드하고 현재 source range를 프레임 단위로 이어 붙인다.
   - **auto-editor clip 경계는 발화 후보일 뿐이다.** 재구성본에서 XML clip/gap을 구하고 §3.3의 VAD·남길 어절·실제 소리와 교차 확인한다. 자막 생성은 앱에 맡기되 경계 실측·컷 검증 재전사는 §3.3에 따라 수행한다.
   - CapCut 캡션은 문맥·표기 후보로 볼 수 있지만 silence/breath 경계로 사용하지 않는다.

3. **표적 컷 후보 생성**
   - **말 사이 호흡 후보**: auto-editor clip 사이 gap 에서 앞 clip 뒤 `80ms`, 다음 clip 앞 `60ms`를 남기고 가운데만 후보로 잡는다. 0803에서 사용한 시작 조건은 clip gap `0.24초 이상`이다.
   - **실패 발화 후보**: 현재 캡션과 원본 대본의 문맥을 함께 보고 앞 실패 발화의 source interval만 선택한다. 대본은 그대로 읽었다고 가정하지 않고 의미/도메인 참고로만 사용한다. 이 판정은 자동화하지 않고 사용자가 들어서 확정한다.
   - **짧은 고립음 후보**: 기본적으로 `0.5초 이하` keep island 중 auto-editor 가 speech clip 으로 잡지 않은 구간을 후보로 잡는다. 사용자 timecode가 없을 때는 파형상 발화 주기성이 없고 구간 peak 가 `-18dB` 미만이라는 두 근거를 함께 요구한다.
   - CapCut cue는 문맥 보조 자료일 뿐 고립음 제외 근거가 아니다. 한 cue가 앞 문장부터 다음 문장까지 길게 덮으면 cue 내부 호흡도 있으므로 **caption overlap만으로 후보를 탈락시키지 않는다.**
   - **clip 안에 흡수된 선행 호흡 후보**: 큰 흡기음은 RMS 가 낮은데 peak 만 커서 dB 무음 탐지와 auto-editor 가 동시에 놓친다. clip gap 이 0이어도 구간 RMS `-30dB` 이하 + peak `-25dB` 이상이면서 저주기성/광대역 파형이면 clip 내부라도 후보로 잡는다.
   - **호흡이 여러 곳에 남았다는 피드백을 받으면 신고 지점만 고치지 말고 전수 스캔한다.** 0803의 짧은 독립 audio segment 시작값은 길이 `4–15프레임`, RMS `-32dB` 이하, peak `-18dB` 이하, spectral centroid `2500Hz` 이상, flatness `0.065` 이상이다. 바로 이웃한 `2프레임 이하`·RMS `-40dB` 이하 조각은 같은 후보로 합친다. 이는 같은 화자/녹음의 회귀 프로파일이며 다른 프로젝트에는 그대로 승격하지 않는다.
   - 사용자가 `0.03초`급 근접무음도 줄이라고 명시하면 micro cleanup을 별도로 실행한다. 0803 시작값은 독립 segment `1–3프레임`, RMS `-45dB` 이하, peak `-35dB` 이하이고 인접 seed를 합쳐도 `3프레임`을 넘기지 않는다. 제거 뒤 두 speech 사이에 최소 `2프레임` quiet가 남고 경계 위험 게이트를 통과해야 한다. 이 모드는 기본 호흡 패스에 자동 합치지 않는다.
   - 모든 후보를 프로젝트 timebase frame에 맞춘다.
   - 위 수치는 0803 승인 사례의 **시작값**이다. 다른 화자·마이크에 검증 없이 고정 상수처럼 적용하지 않는다.

   사용자가 `03:20:15`처럼 CapCut timecode를 주면 마지막 필드는 소수점이 아니라 frame으로 먼저 해석한다. 30fps에서 `03:20:15`는 `3분 20초 15프레임 = 200.5초`다. 해당 target frame을 현재 source↔target map으로 source에 역매핑한 뒤, 앞뒤 최소 1초 파형과 인접 audio segment를 함께 확인한다.

4. **경계 위험 게이트**
   - 이번 표적 컷으로 새로 생기는 join마다 양쪽 바깥 `15ms` RMS를 측정한다.
   - 양쪽이 **동시에** `-18dB`를 넘으면 발화 중간 절단 위험으로 보고 그 후보를 제외한다.
   - 한쪽만 큰 경우는 padding 뒤의 정상 speech onset일 수 있으므로 자동 FAIL로 세지 않는다. 대신 word boundary/padding 근거가 있어야 한다.
   - 제외한 후보 수도 보고서에 남긴다.

5. **미리보기와 의미 보존 검증**
   - 확정 후보를 현재 기준선 source range에서 뺀 PCM 미리보기를 만든다.
   - 미리보기 전체 디코드를 확인하고 §3.3 컷 재전사·모든 join 앞뒤 문장 대조를 수행한다. 파형과 청취도 함께 확인한다.
   - 확정 컷 구간의 **peak 가 `-18dB`를 넘는 것은 0개**여야 한다. RMS 만 보면 흡기음과 약한 발화를 구분하지 못한다. 넘는 후보는 뺀다.
   - 수치 검증 PASS와 청감을 구분한다. 청감은 **사용자 확인 필요**로 보고하고 확인할 지점은 한 번에 모은다.
   - 사용자 가편집 보존 검사는 최종 source range가 `기준선 - 확정 컷`과 정확히 같은지로 증명한다.

6. **자막 싱크 재구성**
   - 새 CapCut 캡션의 timing이 실제 오디오와 맞으면 source→target으로 리타이밍한다.
   - 캡션 timing이 실제 발화와 어긋나면 **CapCut 앱에서 자막을 다시 생성하게 한다.** 검증용 재전사로 자막을 새로 생성하지 않는다. 앱 자막의 과분할·긴 cue는 §4 어절 시각 기반 재분할·전량 정독으로 정리한다.
   - 숫자 소수점 토큰(`0` + `.8`)과 `%` 토큰은 cue 병합 전에 앞 숫자와 합친다. 전역 중복-token 제거는 `다 다르다`, `2.2% 2.2%` 같은 실제 발화를 훼손하므로 금지한다.
   - 자막 overlap 0, `0.5초 미만` 0, `7초 초과` 0, 3줄 이상 0, 한 줄 15자 초과 0(긴 단일 어절 제외)을 확인한다.

0803 승인 회귀 사례:

| 기준선 | 표적 제거 | 최종 | 호흡 gap | 실패 발화 그룹 | 무전사 고립음 | 경계 위험 제외 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 752.467초 | 13.267초 | 739.2초 | 44 | 24 | 14 | 5 |

이 수치는 다른 프로젝트의 목표 컷 수가 아니라, 위 절차가 사용자 청취 승인을 받은 회귀 사례다.

2026-08-04 `0803` 추가 회귀 사례: 사용자 신고 `03:20:15` 주변의 target `200.600–201.033초`/source `361.500–361.933초` 13프레임 조각은 RMS `-39.06dB`, peak `-19.45dB`의 큰 흡기음이었다. peak 가 커서 dB 무음 탐지가 놓쳤고 auto-editor clip 안에도 흡수됐다. 새 join 좌우 15ms 가 `-50.72/-47.02dB`(=양쪽 다 무음)였으므로 전체 조각만 삭제했다. 이 사례 이후 **clip gap·caption cue만으로 호흡 후보를 닫지 않고, peak/RMS 괴리·짧은 audio segment·사용자 timecode를 함께 검사**한다.

2026-08-04 `0803` 전수 스캔 회귀 사례: 기준선 target `243.167–243.367초`(사용자 신고 약 `04:03`)의 6프레임 호흡은 RMS `-45.3dB`, peak `-23.0dB`의 짧은 독립 조각이었다. 위 독립-segment 프로파일로 전체 타임라인을 다시 검사해 11개/94프레임(`3.133초`)을 제거했고, peak `-17.12dB`인 `288.300–288.533초` 후보 1개는 `-18dB` 의미 보존 게이트를 넘으므로 제외했다. 최종 strict residual은 0개였다. **여러 호흡이 남았다는 피드백은 단일 timecode 패치가 아니라 동일 특성 전수 스캔으로 처리하되, peak 게이트를 낮춰 발음까지 지우지 않는다.**

2026-08-04 `0803` 근접무음 회귀 사례: 사용자 신고 `05:41:16`의 target `341.500–341.533초` 1프레임 segment는 RMS `-49.07dB`, peak `-37.15dB`였다. 위 micro cleanup을 전수 적용해 31그룹/48프레임(`1.6초`)을 제거했고 각 join에 최소 2프레임 quiet를 남겼다. 최종 길이는 `722.2초 → 720.6초`, 동일 strict seed 잔존은 0개였다.

### 3.2 2026-07-27 실패 방지 게이트

다음은 자동 FAIL이다.

- 채택한 단일 auto-editor 컷의 preview와 draft가 명시적 컷 차이 없이 불일치한다. 삭제량이 크다는 이유로 임계를 채택하지 않는다(§3.3).
- silence-only 길이가 preview/export 길이와 1프레임 넘게 다르며 차이를 설명하는 명시적 source cut 목록이 없다.
- threshold를 바꿔 재작업하면서 이전에 제거한 재녹음 오디오가 되살아났다.
- 반복 자막은 없어졌지만 같은 반복 발화가 오디오에 남아 있다.
- `-28dB/80ms` 또는 `-35dB/120ms` 잔존 수를 0으로 만들기 위해 실제 발음 경계를 잘랐다.
- `speech_clip_boundary_hits == 0`만으로 청감 품질까지 통과했다고 주장한다. 이 검사는 큰 절단 후보만 찾으며 약한 종성·비음 손상을 보장하지 않는다.
- 사용자가 round-trip을 요청했거나 자동 재작성 진단 모드인데 저장 직후 수치만 보고 끝냈다.

재작업 순서:

1. 사용자가 마지막 자동편집 뒤 CapCut에서 직접 수정했는지 확인한다. 수정했다면 **현재 draft를 새 기준선으로 백업**하고 §3.1 표적 재편집을 적용한다.
2. 사용자의 후속 편집이 없고 threshold 전체 재생성이 목적일 때만 사전편집 백업에서 원본 audio/caption source 관계를 복원한다.
3. 전체 재생성 경로에서는 auto-editor preview와 Premiere XML을 새로 만든다.
4. silence-only keep range를 XML에서 만들고 이전에 확정한 `RETAKE_CUT` source interval을 다시 합성한다.
5. 현재 퇴고된 자막은 source time을 기준으로 새 target에 리타이밍한다. timing이 이미 틀렸다면 CapCut 앱에서 자막을 다시 생성하게 한다.
6. preview 길이, retake 제거량, 최종 길이를 각각 검증한다.
7. 선택 옵션으로 round-trip을 수행한 경우에만 CapCut 앱에서 한 번 연 뒤 닫고 동일 검증을 반복한다. 실제 keep range·텍스트·duration 손실은 FAIL이다. material 복제나 ±1프레임 스냅은 §1의 구조 diff로 정상 재저장인지 판정한다. 기본값은 이 단계를 건너뛴다.

### 3.3 "숨소리·버벅임 때문에 답답하다" = 임계 강화가 아니다 (2026-10-22, 1021에서 확립)

사용자가 "숨소리도 제거하고 조금 더 강하게"라고 해도 **임계를 통째로 올리지 않는다.** 의도는 분량을 줄이는 게 아니라 말 사이 숨소리·끊긴 공백·버벅임을 걷어내는 것이다(사용자 확정: "너무 강하게 라고 해버리면 분량이 다 날아가잖아").

1. **기본값 적용 전에 레벨부터 잰다.** auto-editor의 dB는 파일 피크 기준이다. 피크가 고립 트랜지언트면 기본 `-28dB`가 발화 한복판에 떨어진다. 1021 실측(피크 −4.5dBFS, 발화 음성대역 RMS −45~−32): 이미 무음편집된 34:36에 `-28dB`를 걸면 **9:25**(추가 삭제 구간의 65%가 발화급), `-35dB` 단독도 9분 34초를 더 잘랐다. 임계 후보마다 "추가 삭제 구간의 30ms 음성대역 RMS 최대값"을 전수 측정해 표로 보고 고른다.
2. **숨소리·공백 컷은 세 근거의 교집합만** — ① auto-editor 공백(위에서 고른 임계) ② Silero VAD 발화확률 < 0.5 (앞 80ms/뒤 60ms 팽창한 발화 밖) ③ 남길 자막 어절 ∩ 실제 소리(음성대역 > −55dBFS) 밖. 하나라도 '말'이면 남긴다.
   - **숨소리 특성(주기성·centroid·flatness)만으로 클립 안을 자르지 않는다.** 1021에서 그렇게 뽑은 후보 71개 중 절반이 실제 단어였다(CapCut 어절 시각의 빈틈).
3. **0.3초 이상 컷은 하나씩 재전사해 거부권을 준다.** 무음이면 whisper가 `감사합니다`·`시청해주셔서…`·`한글자막 by…` 같은 환각을 낸다 — 그건 통과. 실제 단어가 나오면 그 구간의 음성대역 레벨·VAD를 보고 발성이면 뺀다(`veto.json`).
4. **자연스러운 쉼은 남긴다** — 컷 뒤 남는 비발화가 0.20초보다 짧아지지 않게. 화면 조작 중 공백은 모션 가드로 최대 0.8초 유지.
5. **군말(어/음/아/응)은 오디오에서도 지운다.** 자막에서만 지우면 §3 5항 실패 조건과 같다. 경계는 앞뒤 어절 사이 빈틈 안의 음성대역 최소점, 적용 전 편집본을 재전사해 앞뒤 문장을 전부 읽는다.

1021 결과: 34:36 → 32:20 (−2분 16초) — 공백·숨소리 125곳, 군말 32곳. 말 손실 0(재전사 대조). 구현: `outputs/1021-breath-pass-20261022/plan2.py`·`apply2.py`.

### 3.5 오디오 전용 draft 무음편집 (음성메모 강의 — 0715/0715 (1)에서 확립)

video 트랙이 비고 **audio 세그먼트 1개 + STT 자막**만 있는 강의 draft(부트페이 인프런 나레이션 등)는 video 재패킹이 아니라 **오디오 세그먼트를 keep-range로 분할**한다. 검증된 파이프라인(참고 구현: `outputs/0715-silence-edit-20260715/{build_keep,apply_silence,proofmerge}.py`, `outputs/0715-1-silence-edit-20260715/`):

1. **소스에서 사전 레벨 측정 → auto-editor 분석** (§3.3, CapCut 자막 타임라인 아님). 0715 당시 `silencedetect noise=-<TH>dB:d=0.08` 경로는 현재 fallback 전용이다.
2. **keep-range 산출** (`build_keep.py`): `PAD`(경계 보존)/`GAP`(인접 컷 병합)/`MIN_CUT`으로 컷 union → complement. 파라미터 기준:
   - §3.3에서 선택한 임계와 margin 사용(`-28dB/0.06초·0.08초`는 비교 시작값). 가능하면 Premiere XML `clipitem in/out`을 그대로 쓴다.
   - `silencedetect` 재현은 auto-editor export를 쓸 수 없을 때만 허용한다. 결과 길이가 preview와 1프레임 넘게 다르면 채택하지 않는다.
   - **`-24dB:d=0.08 + PAD 0.025` 자동 승격은 폐기됐다.** 0727에서 무음 수치는 좋아도 약한 발음·비음이 손상됐다.
3. **오디오 세그먼트 분할** (`apply_silence.py`): 원본 1세그를 keep-range N개로 deepcopy 분할. 각 세그의 `extra_material_refs`를 **전부 deepcopy + 새 UUID**(원본 material·세그 제거). **ref 종류 수는 프로젝트마다 다르다** — 하드코딩 말고 세그의 실제 refs를 읽는다(0702/0709는 5종, 0715는 6종 = +`loudnesses`, 프로젝트에 `loudness/` 폴더).
4. **자막 리타이밍**: 각 cue의 source 시각을 keep-range 매핑으로 새 타임라인에 옮긴다. 삭제구간에 완전히 든 cue만 제거(발화 cue라 보통 0개).
5. **미러 동기화**: 작업 시작 때 실제 존재하는 4개 timeline mirror를 먼저 열거하고 같은 blob으로 갱신한다. 일반적으로 `draft_info.json` + `template-2.tmp` + `Timelines/<id>/{draft_info.json,template-2.tmp}`지만, CapCut 9.1이 저장한 프로젝트는 `template-2.tmp` 대신 root/timeline의 `draft_info.json.bak`가 미러일 수 있다. 없는 파일명을 새로 만들지 말고 현재 4개를 동기화하며, `draft_meta_info.json`·`root_meta_info.json`의 `tm_duration`도 갱신한다.

**검증** (`ffmpeg atrim+concat` 금지 — 1000+ 세그면 30분+):
- 소스를 mono s16 WAV로 1회 디코드 → python `wave`+`numpy`로 keep-range 슬라이스·concat → 재구성본에 `silencedetect`.
- strict `-35dB/120ms`와 quiet `-28dB/80ms`는 **참고 지표**다. 발음 보존을 해치면서 0으로 강제하지 않는다.
- **발화 클리핑 검사**: 이번 작업이 새로 만든 join의 양쪽 바깥 15ms가 동시에 `-18dB`를 넘는 후보는 0이어야 한다. 한쪽만 큰 speech onset은 word boundary와 padding으로 정당화한다.
- audio gap/overlap 0, `audio end == duration`, `source.start+source.duration ≤ material.duration`, `capcut lint` 0/0.
- 단일 auto-editor 컷은 silence-only 길이 차이 1프레임 이하, §3.3 교집합 컷은 최종 확정 계획·PCM preview·draft 일치.
- `final_duration == silence_only_duration - additional_cut_union_duration`이 rounding 범위에서 성립. 추가 컷은 재발화·군말·표적 공백의 합집합으로 계산해 중복 차감하지 않는다(옛 retakes만 차감식 대체).
- source/target start·duration이 프로젝트 timebase에 정렬됨.
- 선택 round-trip에서는 §1의 구조·텍스트 diff로 실제 keep range·발화 손실이 없음을 확인한다. material 복제·±1프레임 스냅은 구분해 기록한다.

**퇴고+병합** (`proofmerge.py` — 0715 당시 절차, 현재는 끝에 §4 어절 재분할·전량 정독 필수): 프래그먼트별 `SUBS`(도메인 용어 정규식) + `EMPTY`(false-start 제거) + `OVERRIDE`(문맥 재구성) → 인접 cue 의미 단위 병합 → **병합된 joined 텍스트에 SUBS 재적용**(cue 경계로 쪼개진 용어 `빌린|키`→`빌링키`) + 군말/이음새 정리 → 15자·2줄 줄바꿈. 미리보기(before→orig 동반) 정독 후 `--apply`. **SUBS 도메인 용어사전은 같은 시리즈에서 재사용**(부트페이 빌링: 부트페이/빌링키/PG사/카유생비/receipt_id/여전법/ai·api·mcp·ux/웹훅/크론/reserve_id 등). false-start `EMPTY`/`OVERRIDE`는 전사마다 새로 만든다.

**redo 안전절차**: 사용자가 후속 가편집을 하지 않은 threshold 전체 재생성만 **사전편집 백업(`draft_info.pre_silence`) 복원 → auto-editor XML keep 생성 → 확정된 RETAKE_CUT source interval 재적용 → audio/caption 리타이밍 → proofmerge --apply** 순서로 처리한다. 사용자가 후속 가편집·캡션 재생성을 했다면 사전 백업을 복원하지 않고 최신 draft를 기준선으로 §3.1 표적 재편집을 수행한다. 어느 경로든 `EMPTY` 자막만 적용하고 오디오 RETAKE_CUT을 빠뜨리면 실패다.

## 4. 자막 워크플로

**자막 생성은 CapCut 앱 자동 자막으로만 한다.** whisper 재전사는 §3·§3.3의 경계 실측·컷 거부권·모든 join 검증용으로 사용한다. 우선순위:

1. **CapCut 앱의 자동 자막(음성 인식)을 사용자가 직접 생성한다.** 검증용 재전사로 앱 자막 생성 경로를 대체하지 않는다.
2. 원본 MP4에 subtitle stream(`mov_text`)이 있으면 참고 자료로만 추출한다. Google Meet 자동자막은 4초 고정 격자 타이밍이라 실제 발화 경계가 아니므로 리타이밍·병합의 근거로 쓸 수 없다. 화자 라벨은 재발화 판정의 문맥 자료로 쓸모가 있다.
3. 앱 자막을 만들 수 없으면 사용자에게 보고하고 멈춘다.

원본 MP4 내장 자막 추출 예:

```bash
ffmpeg -hide_banner -y -i "$media" -map 0:s:0 source-captions.srt
```

무음 컷 이후 자막은 원본 시간을 그대로 쓰지 않는다. timing이 신뢰 가능하면 source time → edited target time으로 리타이밍한다. 싱크가 계속 틀리면 CapCut 앱에서 자막을 다시 생성하게 한다.

자막 정리(현재 순서: 뜻·표기 퇴고 → 어절 시각 정합 → DP 재분할 → 전량 정독·수동 끊기/붙이기 → onset 보정):

- speaker label 제거: `(이름)` 형태, 회의 구분자 `-` 제거
- 독립 추임새/응답어 제거: `어`, `음`, `네`, `그`, `뭐`, `자`, `아`, `예`, `응`. 군말은 §3.3대로 오디오에서도 삭제한다. 병합으로 흡수된 cue는 오디오 컷 대상이 아니다.
  - 단어 일부는 제거하지 않는다. 예: `어떤`, `없어`, `그다음에`, `예를 들면`
  - `예`처럼 없어도 의미가 유지되는 한 글자 응답어는 문장 중간/끝에 있어도 독립 토큰이면 제거한다.
- **접속사·지시부사 군말도 제거(확정)**: `그리고`, `그래서`, `그런데`, `근데`, `그러면`, `그러니까`, `그리고는` + 지시부사 `이렇게`가 독립 토큰이면 위치(줄머리·중간·끝) 무관하게 제거한다. STT 재녹취 나레이션은 문장을 이 말들로 시작·채우는 말버릇이 과다하다(사용자 확정 규칙 — 과거 "그리고 보존"은 폐기).
  - **`이`·`이런`은 보존**: `이 회차`·`이 고객`(지시관형사)과 `이런 것/이런 경우`(지시어 '이러한')는 "바로 이것/이러한"을 가리켜 뜻이 있으니 유지한다. 제거 대상은 `이렇게`뿐(`이런`은 삭제 목록에서 뺌 — 지우면 어색함).
  - 단어 일부(`그리고요`·`그래서인지`·`이렇게요`)는 토큰이 달라 건드리지 않는다. 병합 후 joined 텍스트에 토큰 정확 일치로 제거한다.
- 명백한 STT 오류 교정
- **의미 이상/문맥 오류 교정 패스**를 별도로 수행한다.
  - 한 자막만 보지 말고 앞뒤 2~3개 자막을 이어 읽어, 문법상 가능해도 강의/창업/개발 문맥에서 의미가 어색한 단어를 찾는다.
  - 문맥 추측만으로 뜻을 바꾸는 교정은 금지한다(`지향하지 않는 → 지양하지 않는` 실패). 실제 발화·화면 근거가 있는 명백한 오인식만 교정한다. 예: `파업화 → 사업화`, `뉴스 → usecase`.
  - 사용자가 확정한 도메인 용어는 사전에 추가하고 이후 작업에서 우선 적용한다.
  - 고유명사·파일명은 화면녹화 프레임으로 확인한다(`goal.md`, `getdesign.md`, `Mobbin` 등). 확신이 낮으면 원문을 유지하고 사용자 확인 목록으로 한 번에 보고한다.
- 불확실한 고유명사/서비스명은 추정 교정하지 말고 후보로 보고
- **의미 단위 재분할이 기본이다.** 아래 병합은 전처리일 뿐이며, 최종 cue 경계는 이 절 끝의 어절 시각 기반 DP + 전량 정독으로 다시 잡는다. 옛 조각 경계를 완료 기준으로 삼지 않는다.
  - **한 줄 15자, 최대 2줄** (= cue 당 30자). 3줄 금지.
  - 병합 경계: 문장 종결(`다/요/죠`로 끝, 다음 cue가 `라고/든지/니까`로 이어지면 종결 아님) · cue 간 gap 0.7초 초과 · 30자 초과 · 7초 초과 · **합친 뒤 금지 지점을 피해 2×15자로 못 쪼개면 병합 안 함**
  - 결과 cue가 0.5초 미만이면 이웃에 흡수
  - 병합 전처리 타이밍은 그룹 첫 start ~ 마지막 end. 최종 시각은 아래 어절 정합·onset 보정을 따른다.
- **줄바꿈은 의미 단위.** 아래 둘은 점수가 아니라 **하드 필터**로 배제한다(점수로 두면 길이 균형에 밀린다).
  1. 의존명사를 줄머리로 보내지 않는다 — `작동시킬 / 수 있거든요` ✗
  2. 의존명사 뒤 보조용언을 떼지 않는다 — `할 수 / 있습니다` ✗
  의존명사는 조사까지 포함해 정확히 매칭(`수·것·거·때·데·줄·뿐·등·중·후·전·점·텐데·테니·터`). `startswith`로 하면 `중간에`를 `중`, `데모`를 `데`로 오인한다.
  남은 후보 중 점수 최대: 접속사 앞 `+4`, 연결/종결어미 뒤 `+3`, 조사 뒤 `-4`, 한쪽 줄 4자 미만 `-8`, 길이 균형 `-|Δ|×0.5`.
- 어절 하나가 15자를 넘으면(`application/json으로`) 쪼갤 수 없으므로 예외로 둔다.
- 7초 초과 cue는 의미 단위로 분할
- text overlap 0
- **cue 병합만으로는 "말하다가 줄바꿈"이 남는다 (2026-10-22, 1021).** 병합은 CapCut 자동자막 조각을 붙이기만 해서, 조각 경계가 말 중간이면(`…그런 / 것들을`, `이런 / 식으로`, `만들어야 / 된다라고`) 그대로 남는다. 1021 실측: 732 cue 중 365개가 어미가 아닌 곳에서 끝났다. 사용자 피드백: "말을 하다가 줄바꿔서 말하는 경향".
  - **어절 단위로 cue 경계를 다시 잡는다.** 원본 자막 `words`(source 시각)를 컷에 투영해 퇴고본 어절마다 시각을 붙이고(글자 정합, 못 맞으면 cue 안 보간), DP로 경계를 고른다. 비용: 문장 끝 0 < 연결어미 1 < 조사 2.5 < 명사 연쇄 7 < 관형형 12 < 지시어 14, 다음 어절이 의존명사·보조용언인 경계는 금지(옛 +10~12 감점만으로 허용하지 않음), 쉼 0.35s+면 감액. cue 경계 비용은 줄바꿈 비용보다 무겁게(3:2).
  - **연결어미 판정에 단독 `지`·`게`를 넣지 마라** — `이미지`·`쉽게`까지 연결어미로 잡혀 고아 cue가 생긴다. `하지/있지/않지`처럼 동사형만.
  - **15자는 공백 포함이다.** 공백을 덜 세면 16~18자 줄이 섞인다. 영문·숫자만 0.55자로 센다.
  - **자동 결과를 처음부터 끝까지 읽고 확정한다**(사례: [1021 재분할 summary](../../outputs/1021-caption-reflow-20261022/summary.md)). 1021에서 끊기/붙이기 273곳과 줄 위치 20곳을 직접 지정했다. 지정은 어구 텍스트로 찾아 넣고(`edit_ov.py`), 적용 전 어절 흐름이 원본과 같은지(의도한 교정 외 차이 0) 검증한다.
  - 재분할 뒤 시작 0.3초 안에 소리가 없는 cue는 1.2초 안의 첫 발화로 물린다(끝은 유지). onset이 불명확하면 원 시각을 유지하고 확인 목록에 보고한다.
  - 구현: `outputs/1021-caption-reflow-20261022/` (`tokens.py` → `reflow.py` → `--apply` → `snap.py`).
- 참고 구현: `outputs/0709-silence-edit-20260709/merge_captions.py` (미리보기 → `--apply`)

사용자 표기 선호:

- `ai`, `api`, `llm`, `seo`, `css`, `html`, `mvp` 등 약어는 소문자 우선
- `Claude`, `Claude Code`, `VS Code`
- 개발/제품 용어: `mvp`, `DevOps`, `DB`, `JavaScript`, `UX`
- `도매인 → 도메인`, `구연 → 구현`, `피디백 → 피드백`, `베포 → 배포`, `디버킹 → 디버깅`
- `파업화 → 사업화`, 문맥상 `뉴스 → usecase`
- `린스타터업/린스타첩/린스타터 → 린 스타트업`

## 5. 자막 스타일 참조 워크플로

새 프로젝트나 자동캡션을 만든 뒤에는 기본 자막 스타일로 완료하지 않는다. **흰 슬라이드가 있으면 검은 반투명 박스(`background_alpha: 0.6`, `check_flag |= 16`)를 적용한다.** 이전 reference가 배경 없음이어도 이 규칙을 우선하고 흰 슬라이드 합성 프레임으로 확인한다. 사용자가 별도로 지정하지 않으면 CapCut root index에서 현재 프로젝트 바로 이전에 있는 정상 프로젝트를 기준 스타일로 삼는다.

절차:

1. `root_meta_info.json`의 `all_draft_store[]` 순서를 확인한다. 현재 프로젝트 다음 entry를 “이전 프로젝트” 후보로 잡는다.
2. 후보 프로젝트의 text track 중 segment 수가 가장 많고 `materials.texts[].type == "subtitle"`인 track을 자막 스타일 reference로 선택한다.
3. reference의 첫 subtitle material/segment에서 아래를 추출한다.
   - `font_size`, `font_path`, `text_color`, `alignment`
   - `background_color`, `background_alpha`, `background_style`, `background_round_radius`
   - `border_color`, `border_width`, `border_alpha`
   - `caption_template_info`, `sub_type`, `type`
   - content/base_content 안 `styles[]` 구조
   - segment `clip.transform.y`, scale, alpha
4. 현재 프로젝트의 모든 caption material에 reference 스타일을 적용하되, 각 material의 `id`, 실제 `text`, cue timing은 보존한다.
5. content/base_content의 style `range`는 각 자막 text의 UTF-16 code unit 길이에 맞춰 다시 계산한다.
6. 현재 프로젝트의 text segment `clip` 위치도 reference와 맞춘다.
7. 스타일 적용 스크립트가 `draft_info.json`을 다시 쓰면 media path가 CapCut placeholder로 되돌아갈 수 있다. 스타일 적용 직후 2.3의 “프로젝트 내부 asset 절대경로” 검증과 재고정을 다시 수행한다.
8. 적용 후 `capcut texts`, `capcut lint`, JSON 검증을 다시 실행한다.

이번 기준 예시:

- `0608` 프로젝트 subtitle 스타일: font size `7`, 흰 글자, 검은 배경, border width `0.08`, subtitle y 위치 `-0.73`.

금지:

- 자동 생성 기본값(font size 15, 배경 없음 등) 그대로 완료 보고하지 않는다.
- reference 스타일을 복사하면서 자막 text나 timing을 바꾸지 않는다.
- style `range`를 이전 자막 길이 그대로 두지 않는다.

## 6. TTS-first 영상 생성 워크플로

웹툰 소개/쇼츠처럼 새 영상을 생성할 때는 다음 순서를 지킨다.

1. `narration-segments.json` 작성
   - 각 segment: `id`, `tts`, `caption`, `panel/shot`, `crop_start`, `crop_end`
   - 이미지 안에는 말풍선/읽을 수 있는 텍스트를 넣지 않는다.
2. TTS 생성
   - Supertone 직접 API가 기본
   - `.env`의 `SUPERTONE_VOICE_ID` 우선
   - ElevenLabs는 `--provider elevenlabs` 명시 때만 사용
3. `ffprobe`로 실제 음성 길이 측정
4. `audio-timing.json` 생성
5. shot/caption/timeline을 `audio-timing.json`에 맞춤
6. burned-in 자막 최종 MP4에는 별도 subtitle stream을 기본 mux하지 않는다.

검증:

- `narration-segments.json`, `audio-timing.json`, `storyboard.json` JSON 검증
- 최종 mp4 `ffprobe` duration/stream 확인
- preview strip/checkframe sheet로 육안 확인
- 최종 보고에 voice id, 총 길이, segment 수, timing source 포함

## 7. 필수 검증 체크리스트

작업 완료 전 아래를 모두 실행/확인한다.

```bash
python3 -m json.tool draft_info.json >/dev/null
[ -f draft_content.json ] && python3 -m json.tool draft_content.json >/dev/null
[ -f draft_content.json ] && cmp -s draft_content.json draft_info.json
capcut lint <project>
capcut info <project> -H
capcut texts <project> > texts-after.json
capcut segments <project> --track video > video-after.json
```

새 프로젝트 등록 검증:

```bash
python3 -m json.tool ~/Movies/CapCut/User\ Data/Projects/com.lveditor.draft/root_meta_info.json >/dev/null
```

그리고 스크립트나 Python으로 다음을 확인한다.

- `root_meta_info.json`의 첫 항목 또는 해당 항목이 `draft_name`/`draft_fold_path`를 올바르게 가리킴
- `draft_meta_info.json.draft_fold_path`가 실제 프로젝트 폴더
- `draft_meta_info.json.draft_root_path`가 CapCut draft root
- `draft_info.json materials.videos[].path`가 모두 존재하는 프로젝트 내부 asset 절대경로
- `draft_info.json materials.videos[].media_path`가 모두 존재하는 프로젝트 내부 asset 절대경로
- `draft_meta_info.json draft_materials[].value[].file_Path`가 존재하는 프로젝트 내부 asset 절대경로
- `root_meta_info.json` entry의 `file_Path`도 같은 프로젝트 내부 asset 절대경로

미디어/영상 세그먼트 검증 (`capcut lint`로는 하나도 못 잡는다 — 반드시 Python으로 직접 확인):

- 모든 미디어 경로가 **바이트 일치**: `os.path.basename(p) in os.listdir(os.path.dirname(p))` (§2.5)
- 모든 `materials.videos[].duration != 0` — 0이면 CapCut이 열면서 미디어 연결을 끊은 것 (§2.6)
- 모든 `materials.*[].local_material_id`가 `draft_meta_info.draft_materials[type=0].value[].id`에 존재 (§2.6)
- 모든 video 세그먼트: `source_timerange.start + source_timerange.duration <= material.duration` (여유 0.1초) (§2.6)
- `source_timerange.duration == target_timerange.duration × speed`
- 띄엄띄엄 배치한 b-roll은 메인 트랙(`flag: 0`)이 아니라 오버레이 트랙(`flag: 2`)에 있는지 (§2.6)

성공 기준:

- CapCut 앱이 닫힌 상태에서 저장 완료
- JSON 정상
- `draft_content.json` / `draft_info.json` 동기화
- `capcut lint` errors 0, warnings 0
- 편집 대상 메인 media track의 gap/overlap 0
- 편집 대상 메인 media track end == project duration
- 단일 auto-editor 컷은 silence-only preview/export와 XML keep 합계 차이 1프레임 이하. §3.3 교집합 컷은 최종 확정 컷 계획·PCM preview·draft 일치. 재발화·군말 등 추가 컷은 겹침을 제거한 합집합으로 계산해 `final_duration == silence_only_duration - additional_cut_union_duration`이 rounding 범위에서 성립
- source/target 경계가 프로젝트 timebase에 정렬됨
- 최신 가편집 위 표적 재편집이면 최종 source range가 `작업 직전 기준선 source range - 확정 컷`과 정확히 일치
- 표적 재편집 확정 컷 중 구간 peak 가 `-18dB`를 넘는 것 0
- 새 표적 join의 양쪽 15ms RMS가 동시에 `-18dB`를 넘는 경계 0
- CapCut open → close round-trip은 기본 미실행. 선택 수행 시 §1 구조·텍스트 diff로 정상 스냅/복제와 실제 손실을 구분해 검증
- `remaining_strict_silence_ge_120ms_count`와 `remaining_quiet_or_breath_ge_80ms_count`를 참고 지표로 보고한다. 발음 보존을 해치면서까지 0을 강제하지 않는다.
- 같은 내용을 다시 말한 구간은 앞 실패 발화의 오디오 source interval이 삭제되고 뒤 성공 발화가 남아 있음
- 재작업이면 이전에 확정한 `RETAKE_CUT` source interval이 유지됨
- 독립 추임새/한 글자 응답어 0
- 0.5초 미만 자막 0
- 7초 초과 자막 0
- **공백 포함 한 줄 표시폭 15자 초과 0** (영문·숫자만 0.55, 긴 단일 어절 예외)
- 3줄 이상 자막 0
- 어절 시각 기반 의미 단위 재분할·전량 정독·원본 어절 흐름 검증 수행(§4)
- 주요 오탈자/의미 오류 패턴 잔존 0
- 새 프로젝트면 CapCut 목록 등록 메타가 있음
- 새 프로젝트면 모든 미디어 path가 프로젝트 내부 asset을 가리킴

## 8. 작업 후 퇴고 패스

최종 보고 전에 반드시 별도 “퇴고 패스”를 수행한다. 이 패스는 작업자가 스스로 방금 작업이 이 문서를 지켰는지 감사하는 단계다.

퇴고 패스 절차:

1. 이 문서를 다시 읽는다.
2. 가능하면 별도 검증자 패스를 실행한다. Codex native subagent를 쓸 수 있으면 `verifier` 역할로 “산출물이 이 문서의 완료 기준을 만족하는지”만 감사시킨다. subagent가 없으면 같은 체크리스트로 자체 퇴고한다.
3. 작업 로그/산출물을 기준으로 아래 표를 채운다.
4. 하나라도 `FAIL`이면 완료 보고 금지. 수정 후 퇴고 패스를 다시 실행한다.

| 항목 | PASS 기준 |
| --- | --- |
| CapCut 종료 | 저장 시점에 `pgrep -x CapCut` 결과가 비어 있음 |
| 최종 위치 | 새 프로젝트는 CapCut 기본 draft root 아래에 있음 |
| 목록 등록 | `root_meta_info.json`에 해당 entry가 있음 |
| 미디어 내부화 | MP4가 `<project>/assets/video/`에 있고 모든 path가 그 내부 파일을 가리킴 |
| draft 동기화 | `draft_content.json`과 `draft_info.json`이 동일 또는 차이가 정당화됨 |
| 무음 검증 | 임계별 30ms 음성대역 RMS 전수 측정·§3.3 교집합/재전사 게이트 통과. 단일 auto-editor 전체 재생성은 auto-editor preview/export와 XML keep range 합계 차이 1프레임 이하. 최신 가편집 위 표적 재편집은 최종 source range=`기준선-확정 컷`, 확정 컷 구간 peak -18dB 초과 0, 양쪽 15ms가 동시에 -18dB 초과인 새 join 0. -35dB/120ms와 -28dB/80ms 잔존 수는 참고값으로 보고 |
| 재촬영 검증 | 앞 실패 발화의 오디오 source interval 삭제, 뒤 성공 발화 보존, redo 후 `RETAKE_CUT` 유지 |
| 앱 round-trip (선택) | 기본값은 `SKIP`. 선택 수행 시 §1 구조·텍스트 diff로 실제 keep range·발화 손실 없음, 정상 복제·±1프레임 스냅은 별도 기록 |
| timeline 검증 | video gap/overlap 0, project duration 일치 |
| 자막 검증 | 짧은/긴/3줄/공백 포함 15자·overlap 기준 통과 + 뜻 보존·화면 표기 확인·어절 재분할·전량 정독·어절 흐름 동일·군말 오디오 삭제 |
| lint | `capcut lint` errors 0, warnings 0 |
| 사용자 확인 위험 | 수치 PASS여도 청감은 “사용자 확인 필요”. 앱 열림/미디어 연결 미검증도 명시. 확인 목록은 한 번에 보고 |

레이아웃 변경은 전/후 합성 프레임을 먼저 제시한다(§2.7). 수치 PASS와 청감은 구분하고 사용자 판단이 필요한 항목은 모아서 한 번에 보고한다. 최종 보고에는 퇴고 패스 결과를 요약한다. 특히 새 프로젝트 작업이면 다음 값을 반드시 보고한다.

- 최종 프로젝트 경로
- 내부 MP4 경로
- root index 등록 여부
- 원본 길이 → 편집 후 길이
- 삭제된 총 시간
- auto-editor silence-only preview/export 길이와 draft 반영 길이 차이
- 삭제한 재촬영 source interval 수와 총 시간
- 앱 round-trip을 선택 수행한 경우에만 저장 직후와 open → close 후의 segment/caption/duration 비교
- 영상 컷 수
- 자막 수
- lint errors/warnings
- video gap/overlap
- 무음 잔존 수
- 자막 품질 수치

## 9. 이번 실패에서 얻은 교훈

- `outputs/`에 만든 프로젝트는 CapCut 앱 목록에 뜨지 않는다. 최종본은 반드시 CapCut 기본 draft root 아래에 둔다.
- 폴더만 복사해도 목록에 안 뜬다. `root_meta_info.json` 등록이 필요하다.
- `draft_meta_info.json` 없이 앱 목록/열기 동작을 기대하면 안 된다.
- repo 원본 MP4 경로를 참조하면 앱에서 “미디어 파일을 찾을 수 없음”이 뜰 수 있다. 새 프로젝트는 MP4를 프로젝트 내부 `assets/video/`로 복사하고 모든 경로를 그 내부 파일로 통일한다.
- `##_draftpath_placeholder_..._##` 경로는 CapCut이 내부적으로 쓸 수 있으나, 작업 완료 시점 검증 기준으로 쓰지 않는다.
- CLI 템플릿의 최소 스키마는 CapCut 앱의 최신 draft 스키마와 다를 수 있다. 앱에서 열릴 새 프로젝트는 기존 정상 draft skeleton을 참고한다.
- 2026-06-23 추가: `capcut init` 기반 최소 draft를 root 아래에 등록하고 내부 MP4 경로까지 맞춰도 CapCut 앱에서 “비정상적인 경로” 오류로 열리지 않을 수 있다. 이 경우 원인은 실제 파일 위치가 아니라 최신 CapCut이 기대하는 draft skeleton/config/crypto/support 파일과 full schema가 부족한 것이다. 새 프로젝트는 `0623` 같은 앱에서 생성된 정상 9:16 프로젝트 폴더를 skeleton으로 복사한 뒤 `draft_info.json`의 `tracks`, `materials`, `duration`, `canvas_config`, `id`, `draft_meta_info.json`, `root_meta_info.json`만 교체한다. root index entry도 최근 정상 entry shape을 따르고, 최근 root entry에 없는 `draft_materials` 같은 임의 필드는 추가하지 않는다.
- 2026-07-09 추가: 경로가 바이트까지 정확한데도 CapCut이 "미디어 연결 끊김"을 띄우면 원인은 경로가 아니다. ① `local_material_id`를 비운 채 material을 복제했거나(→ 앱이 `duration`을 0으로 만듦), ② 띄엄띄엄 배치한 video 세그먼트를 메인 트랙(`flag: 0`)에 둬서 앱이 gap을 다 당겨 붙였거나, ③ `source_timerange`가 소스 끝에 딱 붙어 프레임 스냅 후 넘쳤거나다. 상세와 해법은 §2.6. 또한 draft가 NFC로 저장한 한글 경로와 디스크의 NFD가 어긋나면 `exists()`는 True인데 CapCut만 못 찾는다 — §2.5.
- 2026-06-24 추가: skeleton을 복사할 때 `template-2.tmp`와 `Timelines/<timeline_id>/template-2.tmp`를 원본 그대로 두면 CapCut 앱이 stale timeline/cache를 먼저 읽어 원본 프로젝트의 duration/track/media를 보게 된다. 새 프로젝트에서는 `draft_meta_info/root_meta_info`의 `draft_id`와 `draft_info/template-2.tmp/Timelines/project.json`의 `timeline_id`를 분리하고, root `template-2.tmp`, timeline `draft_info.json`, timeline `template-2.tmp`를 모두 새 timeline JSON으로 동기화한다. 또한 draft root 안에 `.bak` 백업 폴더를 남기면 CapCut이 별도 프로젝트로 자동 등록할 수 있으므로 백업은 repo `outputs/.../capcut-draft-backups/`처럼 draft root 밖으로 이동한다.
- 2026-07-27 추가: `-24dB/25ms` 자체 dB 컷은 잔존 수를 줄였지만 약한 종성·비음을 잘라 코맹맹이처럼 들리게 했다. 반대로 `-35dB`로 전체 재생성한 비교본은 무음과 이전 재촬영 컷을 되살려 사실상 무편집 상태에 가까워졌다. 당시 기본은 정확한 auto-editor `-28dB/60ms,80ms` Premiere XML 타임라인이었다(2026-10-22부터는 §3.3 사전 측정·교집합 판정 우선). 반복/실패 발화는 별도의 `RETAKE_CUT` source interval로 합성한다. 자동 수치는 구조 검증일 뿐 청감 PASS의 대체물이 아니다.
- 2026-07-27 추가: 저장 직후 `450.728초/224 audio/305 captions`였던 `0727 (1)`이 CapCut에서 열린 뒤 `444.700초/220 audio/303 captions`로 재작성됐다. `capcut lint 0/0`이어도 이 손실을 잡지 못했다. 비정렬 수동 source cut을 그대로 쓰지 말고 timebase에 정렬한다. 이 사례를 재현·진단할 때는 선택 round-trip을 켜서 수치를 비교한다.
- 2026-08-04 추가: `0803`은 사용자가 가편집하고 캡션을 다시 만든 최신 draft를 기준선으로 고정한 뒤, 전체 threshold를 다시 돌리지 않고 재구성 오디오의 clip gap·앞 실패 발화·발화 근거 없는 짧은 고립음만 표적 제거했다. `기준선 source range - 확정 컷` 일치·확정 컷 peak -18dB 초과 0·위험 join 0을 검증한 739.2초 결과를 사용자가 승인했다. 이후 redo는 과거 자동편집본 복원이 아니라 최신 사용자 가편집 보존이 우선이다. 자막은 CapCut 앱 자동 자막만 쓴다.
